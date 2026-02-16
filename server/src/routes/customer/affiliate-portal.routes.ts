import { Router, Request, Response } from "express";
import { affiliatePayoutService } from "../../services/affiliate-payout.service";
import { db } from "../../../db";
import { storage } from "../../../storage";
import { affiliates, affiliatePayouts, affiliateReferrals, customers } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { 
  requireCustomerAuth,
  AuthenticatedRequest 
} from "../../middleware/customer-auth.middleware";
import { stripeService } from "../../integrations/stripe/StripeService";
import { customerIdentityService } from "../../services/customer-identity.service";

const router = Router();

const payoutRequestSchema = z.object({
  amount: z.number().int().positive("Amount must be a positive integer (cents)").optional(),
  notes: z.string().max(500).optional(),
});

function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: () => void) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: result.error.errors[0]?.message || "Invalid request body",
          details: result.error.errors,
        },
      });
    }
    req.body = result.data;
    next();
  };
}

async function createAuditLog(
  actor: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, any>
) {
  try {
    await storage.createAuditLog({
      actor,
      action,
      entityType,
      entityId,
      metadata,
    });
  } catch (error) {
    console.error("[AUDIT] Failed to create audit log:", error);
  }
}

router.get("/portal", async (req: any, res: Response) => {
  try {
    const identityResult = await customerIdentityService.resolve(req);
    if (!identityResult.ok) {
      return res.status(identityResult.error.httpStatus).json({ error: { code: identityResult.error.code, message: identityResult.error.message } });
    }
    const customer = identityResult.identity.customer;

    const affiliate = await storage.getAffiliateByCustomerId(customer.id);
    if (!affiliate) {
      return res.status(404).json({ error: { code: "NOT_AFFILIATE", message: "Not an affiliate" } });
    }

    const settings = await storage.getAffiliateSettings();
    const minimumPayout = settings?.minimumPayout ?? 5000;

    const approvedBalance = affiliate.totalEarnings - affiliate.pendingBalance - affiliate.paidBalance;
    const payoutAccount = await storage.getAffiliatePayoutAccountByAffiliateId(affiliate.id);

    res.json({
      affiliate: {
        id: affiliate.id,
        affiliateCode: affiliate.affiliateCode,
        status: affiliate.status,
        totalEarnings: affiliate.totalEarnings,
        pendingBalance: affiliate.pendingBalance,
        approvedBalance,
        paidBalance: affiliate.paidBalance,
        totalReferrals: affiliate.totalReferrals,
        totalSales: affiliate.totalSales,
      },
      payoutAccount: payoutAccount ? {
        connected: true,
        payoutsEnabled: payoutAccount.payoutsEnabled,
        detailsSubmitted: payoutAccount.detailsSubmitted,
      } : { connected: false },
      minimumPayout,
      canRequestPayout: approvedBalance >= minimumPayout && payoutAccount?.payoutsEnabled,
    });
  } catch (error: any) {
    console.error("Failed to get affiliate portal:", error);
    res.status(500).json({ error: { code: "PORTAL_ERROR", message: error.message } });
  }
});

// Customer payout request (only APPROVED commissions, enforce minimum)
router.post(
  "/payout-request",
  validateBody(payoutRequestSchema),
  async (req: any, res: Response) => {
    try {
      const identityResult = await customerIdentityService.resolve(req);
      if (!identityResult.ok) {
        return res.status(identityResult.error.httpStatus).json({ error: { code: identityResult.error.code, message: identityResult.error.message } });
      }
      const customer = identityResult.identity.customer;

      const { amount: requestedAmount, notes } = req.body;

      const affiliate = await storage.getAffiliateByCustomerId(customer.id);
      if (!affiliate) {
        return res.status(404).json({ error: { code: "NOT_AFFILIATE", message: "Not an affiliate" } });
      }

      if (affiliate.status !== "active") {
        return res.status(403).json({ error: { code: "INACTIVE", message: "Affiliate account is not active" } });
      }

      // Get settings for minimum payout
      const settings = await storage.getAffiliateSettings();
      const minimumPayout = settings?.minimumPayout ?? 5000;

      // Calculate approved balance (only APPROVED, not pending or paid)
      const approvedBalance = affiliate.totalEarnings - affiliate.pendingBalance - affiliate.paidBalance;

      if (approvedBalance <= 0) {
        return res.status(400).json({
          error: {
            code: "NO_APPROVED_BALANCE",
            message: "No approved commissions available for payout",
          },
        });
      }

      // Determine payout amount: use requested amount if provided, otherwise full approved balance
      const payoutAmount = requestedAmount ? Math.min(requestedAmount, approvedBalance) : approvedBalance;

      if (payoutAmount < minimumPayout) {
        return res.status(400).json({
          error: {
            code: "BELOW_MINIMUM",
            message: `Requested amount ($${(payoutAmount / 100).toFixed(2)}) is below minimum payout threshold ($${(minimumPayout / 100).toFixed(2)})`,
          },
        });
      }

      // Check for payout account
      const payoutAccount = await storage.getAffiliatePayoutAccountByAffiliateId(affiliate.id);
      if (!payoutAccount || !payoutAccount.payoutsEnabled) {
        return res.status(400).json({
          error: {
            code: "NO_PAYOUT_ACCOUNT",
            message: "Please connect your Stripe account before requesting a payout",
          },
        });
      }

      // Check for pending payout request
      const existingPayouts = await storage.getAffiliatePayouts(affiliate.id);
      const pendingPayout = existingPayouts.find((p) => p.status === "pending" || p.status === "approved");
      if (pendingPayout) {
        return res.status(400).json({
          error: {
            code: "PENDING_PAYOUT_EXISTS",
            message: "You already have a pending payout request",
          },
        });
      }

      // Get approved referral IDs for this payout
      const approvedReferrals = await affiliatePayoutService.getApprovedUnpaidReferrals(affiliate.id);
      
      // Select referrals up to the payout amount
      let remainingAmount = payoutAmount;
      const referralIds: string[] = [];
      for (const ref of approvedReferrals) {
        if (remainingAmount <= 0) break;
        referralIds.push(ref.id);
        remainingAmount -= ref.commissionAmount;
      }

      // Create payout request
      const payout = await storage.createAffiliatePayout({
        affiliateId: affiliate.id,
        amount: payoutAmount,
        paymentMethod: "stripe_connect",
        paymentDetails: payoutAccount.stripeAccountId,
        status: "pending",
        notes: JSON.stringify({
          customerNotes: notes,
          referralIds,
          requestedAmount: payoutAmount,
        }),
      });

      // Audit log
      await createAuditLog(
        affiliate.id,
        "payout.requested",
        "affiliate_payout",
        payout.id,
        { amount: payoutAmount, referralCount: referralIds.length, requestedBy: customer.id }
      );

      res.json({
        success: true,
        payoutId: payout.id,
        amount: payoutAmount,
        status: "pending",
      });
    } catch (error: any) {
      console.error("Failed to create payout request:", error);
      res.status(500).json({ error: { code: "PAYOUT_REQUEST_ERROR", message: error.message } });
    }
  }
);

router.get("/payouts", async (req: any, res: Response) => {
  try {
    const identityResult = await customerIdentityService.resolve(req);
    if (!identityResult.ok) {
      return res.status(identityResult.error.httpStatus).json({ error: { code: identityResult.error.code, message: identityResult.error.message } });
    }
    const customer = identityResult.identity.customer;

    const affiliate = await storage.getAffiliateByCustomerId(customer.id);
    if (!affiliate) {
      return res.status(404).json({ error: { code: "NOT_AFFILIATE", message: "Not an affiliate" } });
    }

    const payouts = await db
      .select()
      .from(affiliatePayouts)
      .where(eq(affiliatePayouts.affiliateId, affiliate.id))
      .orderBy(desc(affiliatePayouts.requestedAt));

    res.json(payouts.map(p => ({
      id: p.id,
      amount: p.amount,
      status: p.status,
      paymentMethod: p.paymentMethod,
      requestedAt: p.requestedAt,
      processedAt: p.processedAt,
    })));
  } catch (error: any) {
    console.error("Failed to get payouts:", error);
    res.status(500).json({ error: { code: "PAYOUTS_ERROR", message: error.message } });
  }
});

router.get("/commissions", async (req: any, res: Response) => {
  try {
    const identityResult = await customerIdentityService.resolve(req);
    if (!identityResult.ok) {
      return res.status(identityResult.error.httpStatus).json({ error: { code: identityResult.error.code, message: identityResult.error.message } });
    }
    const customer = identityResult.identity.customer;

    const affiliate = await storage.getAffiliateByCustomerId(customer.id);
    if (!affiliate) {
      return res.status(404).json({ error: { code: "NOT_AFFILIATE", message: "Not an affiliate" } });
    }

    const referrals = await db
      .select()
      .from(affiliateReferrals)
      .where(eq(affiliateReferrals.affiliateId, affiliate.id))
      .orderBy(desc(affiliateReferrals.createdAt));

    res.json(referrals.map(r => ({
      id: r.id,
      orderAmount: r.orderAmount,
      commissionRate: r.commissionRate,
      commissionAmount: r.commissionAmount,
      status: r.status,
      createdAt: r.createdAt,
      approvedAt: r.approvedAt,
      paidAt: r.paidAt,
    })));
  } catch (error: any) {
    console.error("Failed to get commissions:", error);
    res.status(500).json({ error: { code: "COMMISSIONS_ERROR", message: error.message } });
  }
});

// Customer auth token-based routes for my-account page

router.get("/", requireCustomerAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customerId = req.customerSession!.customerId;
    
    // Always fetch settings for non-affiliates too (they need agreementText to join)
    const settings = await storage.getAffiliateSettings();
    const commissionRate = settings?.commissionRate ?? 10;
    const minimumPayout = settings?.minimumPayout ?? 5000;
    const approvalDays = settings?.approvalDays ?? 30;
    const agreementText = settings?.agreementText ?? "Affiliate Program Agreement - Terms and conditions for the affiliate program. By joining, you agree to promote our products ethically and in accordance with all applicable laws.";
    const globalFfEnabled = (settings as any)?.ffEnabled ?? false;
    
    const affiliate = await storage.getAffiliateByCustomerId(customerId);
    if (!affiliate) {
      return res.json({ 
        affiliate: null, 
        referrals: [], 
        payouts: [],
        commissionRate,
        minimumPayout,
        approvalDays,
        agreementText,
        ffEnabled: false,
      });
    }
    
    const affiliateFfEnabled = globalFfEnabled && (affiliate.ffEnabled !== false);
    
    const referrals = await storage.getAffiliateReferrals(affiliate.id);
    const payouts = await storage.getAffiliatePayouts(affiliate.id);
    
    const totalEarnings = affiliate.totalEarnings || 0;
    const paidOut = affiliate.paidBalance || 0;
    const pendingEarnings = affiliate.pendingBalance || 0;
    const approvedEarnings = totalEarnings - pendingEarnings - paidOut;
    
    res.json({
      affiliate: {
        id: affiliate.id,
        code: affiliate.affiliateCode,
        status: affiliate.status,
        totalEarnings: totalEarnings,
        pendingEarnings: pendingEarnings,
        approvedEarnings: approvedEarnings,
        paidEarnings: paidOut,
        totalReferrals: affiliate.totalReferrals || 0,
        totalConversions: affiliate.totalReferrals || 0,
        totalRevenue: affiliate.totalSales || 0,
        createdAt: affiliate.createdAt,
      },
      referrals: referrals.map(r => ({
        id: r.id,
        orderId: r.orderId,
        orderTotal: r.orderAmount,
        commission: r.commissionAmount,
        status: r.status,
        createdAt: r.createdAt,
        approvedAt: r.approvedAt,
        paidAt: r.paidAt,
      })),
      payouts: payouts.map(p => ({
        id: p.id,
        amount: p.amount,
        status: p.status,
        paymentMethod: p.paymentMethod,
        requestedAt: p.requestedAt,
        processedAt: p.processedAt,
        notes: p.notes,
      })),
      commissionRate,
      minimumPayout,
      approvalDays,
      agreementText,
      ffEnabled: affiliateFfEnabled,
    });
  } catch (error: any) {
    console.error("Fetch affiliate data error:", error);
    res.status(500).json({ message: "Failed to fetch affiliate data" });
  }
});

const joinAffiliateSchema = z.object({
  signatureName: z.string().min(1, "Signature is required"),
});

router.post("/join", requireCustomerAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customerId = req.customerSession!.customerId;
    const { signatureName } = joinAffiliateSchema.safeParse(req.body).data || { signatureName: "" };
    
    if (!signatureName) {
      return res.status(400).json({ message: "Signature is required" });
    }
    
    const existingAffiliate = await storage.getAffiliateByCustomerId(customerId);
    if (existingAffiliate) {
      return res.status(400).json({ message: "Already enrolled in affiliate program" });
    }
    
    const customer = await storage.getCustomer(customerId);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    
    const code = `${customer.name?.replace(/\s+/g, '').substring(0, 6).toUpperCase() || 'REF'}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    const affiliate = await storage.createAffiliate({
      customerId,
      affiliateCode: code,
      status: "active",
    });
    
    await storage.createAffiliateAgreement({
      affiliateId: affiliate.id,
      agreementText: `Affiliate Program Agreement v1.0 - Signed by ${signatureName}`,
      signatureName,
      signatureIp: req.ip || "unknown",
    });
    
    res.json({ 
      success: true, 
      affiliate: {
        id: affiliate.id,
        code: affiliate.affiliateCode,
      }
    });
  } catch (error: any) {
    console.error("Join affiliate error:", error);
    res.status(500).json({ message: "Failed to join affiliate program" });
  }
});

router.get("/connect/status", requireCustomerAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customerId = req.customerSession!.customerId;
    
    const affiliate = await storage.getAffiliateByCustomerId(customerId);
    if (!affiliate) {
      return res.status(404).json({ message: "Not an affiliate" });
    }
    
    const payoutAccount = await storage.getAffiliatePayoutAccountByAffiliateId(affiliate.id);
    
    if (!payoutAccount) {
      return res.json({
        stripeConnectId: null,
        stripeConnectStatus: null,
        isConnected: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        chargesEnabled: false,
      });
    }
    
    // Refresh status from Stripe if account exists
    try {
      const stripeAccount = await stripeService.retrieveAccount(payoutAccount.stripeAccountId);
      
      // Update local record if status changed
      if (
        payoutAccount.payoutsEnabled !== stripeAccount.payouts_enabled ||
        payoutAccount.chargesEnabled !== stripeAccount.charges_enabled ||
        payoutAccount.detailsSubmitted !== stripeAccount.details_submitted
      ) {
        await storage.updateAffiliatePayoutAccount(payoutAccount.id, {
          payoutsEnabled: stripeAccount.payouts_enabled ?? false,
          chargesEnabled: stripeAccount.charges_enabled ?? false,
          detailsSubmitted: stripeAccount.details_submitted ?? false,
          requirements: stripeAccount.requirements as any,
        });
      }
      
      res.json({
        stripeConnectId: payoutAccount.stripeAccountId,
        stripeConnectStatus: stripeAccount.payouts_enabled ? "active" : "pending",
        isConnected: !!payoutAccount.stripeAccountId,
        payoutsEnabled: stripeAccount.payouts_enabled ?? false,
        detailsSubmitted: stripeAccount.details_submitted ?? false,
        chargesEnabled: stripeAccount.charges_enabled ?? false,
        requirements: stripeAccount.requirements,
      });
    } catch (stripeError: any) {
      console.error("Failed to fetch Stripe account status:", stripeError);
      // Return cached status if Stripe call fails
      res.json({
        stripeConnectId: payoutAccount.stripeAccountId,
        stripeConnectStatus: payoutAccount.payoutsEnabled ? "active" : "pending",
        isConnected: !!payoutAccount.stripeAccountId,
        payoutsEnabled: payoutAccount.payoutsEnabled,
        detailsSubmitted: payoutAccount.detailsSubmitted,
        chargesEnabled: payoutAccount.chargesEnabled,
      });
    }
  } catch (error: any) {
    console.error("Fetch connect status error:", error);
    res.status(500).json({ message: "Failed to fetch connect status" });
  }
});

router.post("/connect/start", requireCustomerAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customerId = req.customerSession!.customerId;
    
    const affiliate = await storage.getAffiliateByCustomerId(customerId);
    if (!affiliate) {
      return res.status(404).json({ message: "Not an affiliate" });
    }
    
    const customer = await storage.getCustomer(customerId);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    
    // Check if Stripe is configured
    const isStripeConfigured = await stripeService.isConfigured();
    if (!isStripeConfigured) {
      return res.status(503).json({ message: "Stripe is not configured. Please contact support." });
    }
    
    // Check for existing payout account
    let payoutAccount = await storage.getAffiliatePayoutAccountByAffiliateId(affiliate.id);
    
    // Build return URLs
    const { getBaseUrl } = await import("../../utils/base-url");
    const baseUrl = getBaseUrl(req);
    
    const returnPath = req.body?.returnPath || "/affiliate-portal";
    const returnUrl = `${baseUrl}${returnPath}${returnPath.includes('?') ? '&' : '?'}connect=complete`;
    const refreshUrl = `${baseUrl}${returnPath}${returnPath.includes('?') ? '&' : '?'}connect=refresh`;
    
    if (!payoutAccount) {
      // Create new Stripe Express account
      const stripeAccount = await stripeService.createExpressAccount({
        email: customer.email,
        country: "US",
        metadata: {
          affiliateId: affiliate.id,
          customerId: customer.id,
          affiliateCode: affiliate.affiliateCode,
        },
      });
      
      // Save the account to our database
      payoutAccount = await storage.createAffiliatePayoutAccount({
        affiliateId: affiliate.id,
        stripeAccountId: stripeAccount.id,
        payoutsEnabled: false,
        chargesEnabled: false,
        detailsSubmitted: false,
        country: "US",
        currency: "usd",
      });
    } else {
      // Ensure existing account has both required capabilities
      try {
        const existingAccount = await stripeService.retrieveAccount(payoutAccount.stripeAccountId);
        const caps = existingAccount.capabilities || {};
        const needsTransfers = caps.transfers !== "active" && caps.transfers !== "pending";
        const needsCardPayments = caps.card_payments !== "active" && caps.card_payments !== "pending";
        
        if (needsTransfers || needsCardPayments) {
          await stripeService.updateAccountCapabilities(payoutAccount.stripeAccountId, {
            transfers: needsTransfers,
            card_payments: needsCardPayments,
          });
        }
      } catch (capError: any) {
        console.error("[CONNECT] Failed to update capabilities for existing account:", capError.message);
      }
    }
    
    // Create account link for onboarding
    const accountLink = await stripeService.createAccountLink({
      accountId: payoutAccount.stripeAccountId,
      refreshUrl,
      returnUrl,
    });
    
    res.json({ url: accountLink.url });
  } catch (error: any) {
    console.error("Start connect error:", error);
    res.status(500).json({ message: error.message || "Failed to start Stripe Connect" });
  }
});

// Handle refresh when user returns from incomplete onboarding
router.post("/connect/refresh", requireCustomerAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customerId = req.customerSession!.customerId;
    
    const affiliate = await storage.getAffiliateByCustomerId(customerId);
    if (!affiliate) {
      return res.status(404).json({ message: "Not an affiliate" });
    }
    
    const payoutAccount = await storage.getAffiliatePayoutAccountByAffiliateId(affiliate.id);
    if (!payoutAccount) {
      return res.status(404).json({ message: "No payout account found. Please start onboarding again." });
    }
    
    // Build return URLs
    const { getBaseUrl } = await import("../../utils/base-url");
    const baseUrl = getBaseUrl(req);
    
    const returnUrl = `${baseUrl}/affiliate-portal?connect=complete`;
    const refreshUrl = `${baseUrl}/affiliate-portal?connect=refresh`;
    
    // Create new account link
    const accountLink = await stripeService.createAccountLink({
      accountId: payoutAccount.stripeAccountId,
      refreshUrl,
      returnUrl,
    });
    
    res.json({ url: accountLink.url });
  } catch (error: any) {
    console.error("Refresh connect error:", error);
    res.status(500).json({ message: error.message || "Failed to refresh Stripe Connect" });
  }
});

// Update affiliate code (custom vanity code)
const updateCodeSchema = z.object({
  code: z.string()
    .min(3, "Code must be at least 3 characters")
    .max(20, "Code must be 20 characters or less")
    .regex(/^[A-Za-z0-9]+$/, "Code can only contain letters and numbers"),
});

router.put("/code", requireCustomerAuth, validateBody(updateCodeSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customerId = req.customerSession!.customerId;

    const affiliate = await storage.getAffiliateByCustomerId(customerId);
    if (!affiliate) {
      return res.status(404).json({ error: { code: "NOT_AFFILIATE", message: "Not an affiliate" } });
    }

    const newCode = req.body.code.toUpperCase();
    
    // Check if code is already taken by another affiliate
    const existingAffiliate = await db.select().from(affiliates).where(eq(affiliates.affiliateCode, newCode)).limit(1);
    if (existingAffiliate.length > 0 && existingAffiliate[0].id !== affiliate.id) {
      return res.status(400).json({ error: { code: "CODE_TAKEN", message: "This code is already in use by another affiliate" } });
    }

    // Update the affiliate code
    await db.update(affiliates)
      .set({ affiliateCode: newCode, updatedAt: new Date() })
      .where(eq(affiliates.id, affiliate.id));

    await createAuditLog(
      `customer:${customerId}`,
      "affiliate.code_updated",
      "affiliate",
      affiliate.id,
      { oldCode: affiliate.affiliateCode, newCode }
    );

    res.json({ success: true, code: newCode });
  } catch (error: any) {
    console.error("Update affiliate code error:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update affiliate code" } });
  }
});

export default router;
