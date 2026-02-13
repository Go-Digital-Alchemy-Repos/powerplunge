import { Router } from "express";
import { storage } from "../../../storage";
import { customerIdentityService, normalizeEmail } from "../../services/customer-identity.service";

function generateAffiliateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getDefaultAffiliateAgreement(): string {
  return `AFFILIATE PROGRAM AGREEMENT

This Affiliate Agreement ("Agreement") is entered into between Power Plunge ("Company") and the undersigned affiliate ("Affiliate").

1. APPOINTMENT AND ACCEPTANCE
By signing this Agreement, Company appoints Affiliate as a non-exclusive affiliate to promote and market Company's products, and Affiliate accepts such appointment subject to the terms and conditions set forth herein.

2. AFFILIATE RESPONSIBILITIES
a) Affiliate agrees to actively promote Company's products through their unique referral link or code.
b) Affiliate will not engage in any deceptive, misleading, or unethical marketing practices.
c) Affiliate will not make false claims about the products or Company.
d) Affiliate will comply with all applicable laws, rules, and regulations, including FTC disclosure requirements.

3. COMMISSION STRUCTURE
a) Affiliate will earn a commission on qualifying sales made through their unique referral link.
b) Commission rates are set by Company and may be modified at any time with notice.
c) Commissions are calculated based on the net sale amount (excluding taxes and shipping).

4. PAYMENT TERMS
a) Commissions will be paid according to the payment schedule established by Company.
b) Affiliate must maintain a valid payment method (e.g., PayPal) to receive payments.
c) Minimum payout thresholds may apply as specified in the affiliate dashboard.
d) Company reserves the right to withhold or adjust commissions in cases of fraud, returns, or chargebacks.

5. PROHIBITED ACTIVITIES
Affiliate shall NOT:
a) Use spam, unsolicited emails, or deceptive advertising.
b) Bid on Company's trademarks or brand terms in paid advertising.
c) Create fake reviews or testimonials.
d) Make income claims or guarantees.
e) Misrepresent the relationship with Company.

6. INTELLECTUAL PROPERTY
a) Company grants Affiliate a limited, non-exclusive license to use Company's approved marketing materials.
b) Affiliate shall not modify Company trademarks or create derivative works without permission.

7. TERM AND TERMINATION
a) This Agreement is effective upon acceptance and continues until terminated.
b) Either party may terminate with 30 days written notice.
c) Company may terminate immediately for violation of this Agreement.
d) Upon termination, Affiliate must cease all promotional activities and remove Company materials.

8. CONFIDENTIALITY
Affiliate agrees to keep confidential all non-public information regarding Company's business, customers, and products.

9. DISCLAIMER AND LIMITATION OF LIABILITY
a) Products are provided "as is" and Company makes no warranties regarding sales performance.
b) Company's liability is limited to commissions actually earned by Affiliate.

10. INDEPENDENT CONTRACTOR
Affiliate is an independent contractor and not an employee, partner, or agent of Company.

11. MODIFICATION
Company reserves the right to modify this Agreement with notice. Continued participation constitutes acceptance of modifications.

12. GOVERNING LAW
This Agreement shall be governed by the laws of the state where Company is incorporated.

By signing below, Affiliate acknowledges having read, understood, and agreed to be bound by all terms of this Agreement.`;
}

const router = Router();

export const publicAffiliateRoutes = Router();

publicAffiliateRoutes.get("/agreement", async (req, res) => {
  try {
    let settings = await storage.getAffiliateSettings();
    if (!settings) {
      settings = await storage.updateAffiliateSettings({
        agreementText: getDefaultAffiliateAgreement(),
      });
    }
    res.json({ agreementText: settings.agreementText, programActive: settings.programActive });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch agreement" });
  }
});

router.get("/affiliate", async (req: any, res) => {
  try {
    let settings = await storage.getAffiliateSettings();
    if (!settings) {
      settings = await storage.updateAffiliateSettings({
        agreementText: getDefaultAffiliateAgreement(),
      });
    }

    const identityResult = await customerIdentityService.resolve(req);
    if (!identityResult.ok) {
      return res.json({ 
        affiliate: null, 
        referrals: [],
        payouts: [],
        commissionRate: settings.commissionRate,
        minimumPayout: settings.minimumPayout,
        approvalDays: settings.approvalDays || 14,
        agreementText: settings.agreementText,
      });
    }
    const customer = identityResult.identity.customer;

    const affiliate = await storage.getAffiliateByCustomerId(customer.id);
    
    if (!affiliate) {
      return res.json({ 
        affiliate: null, 
        referrals: [],
        payouts: [],
        commissionRate: settings.commissionRate,
        minimumPayout: settings.minimumPayout,
        approvalDays: settings.approvalDays || 14,
        agreementText: settings.agreementText,
      });
    }

    const referrals = await storage.getAffiliateReferrals(affiliate.id);
    const payouts = await storage.getAffiliatePayouts(affiliate.id);
    
    const payoutAccount = await storage.getAffiliatePayoutAccountByAffiliateId(affiliate.id);
    const connectStatus = payoutAccount
      ? (payoutAccount.payoutsEnabled ? "active" : 
         payoutAccount.detailsSubmitted ? "pending" : "incomplete")
      : "not_connected";
    
    const pendingEarnings = referrals
      .filter(r => r.status === "pending")
      .reduce((sum, r) => sum + r.commissionAmount, 0);
    const approvedEarnings = referrals
      .filter(r => r.status === "approved")
      .reduce((sum, r) => sum + r.commissionAmount, 0);
    const paidEarnings = referrals
      .filter(r => r.status === "paid")
      .reduce((sum, r) => sum + r.commissionAmount, 0);
    const totalRevenue = referrals
      .filter(r => r.status !== "void")
      .reduce((sum, r) => sum + r.orderAmount, 0);
    const conversionCount = referrals.filter(r => r.status !== "void").length;

    res.json({
      affiliate: {
        id: affiliate.id,
        code: affiliate.affiliateCode,
        status: affiliate.status,
        totalEarnings: pendingEarnings + approvedEarnings + paidEarnings,
        pendingEarnings,
        approvedEarnings,
        paidEarnings,
        totalReferrals: affiliate.totalReferrals,
        totalConversions: conversionCount,
        totalRevenue,
        createdAt: affiliate.createdAt,
        connectStatus,
      },
      referrals: referrals.map(r => ({
        id: r.id,
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
        stripeTransferId: p.stripeTransferId || null,
        payoutBatchId: p.payoutBatchId || null,
      })),
      commissionRate: settings.commissionRate,
      minimumPayout: settings.minimumPayout,
      approvalDays: settings.approvalDays || 14,
      agreementText: settings.agreementText,
      payoutAccount: payoutAccount ? {
        payoutsEnabled: payoutAccount.payoutsEnabled,
        detailsSubmitted: payoutAccount.detailsSubmitted,
        country: payoutAccount.country,
        currency: payoutAccount.currency,
      } : null,
    });
  } catch (error) {
    console.error("Error fetching affiliate status:", error);
    res.status(500).json({ message: "Failed to fetch affiliate status" });
  }
});

router.post("/affiliate", async (req: any, res) => {
  try {
    const userId = req.user?.claims?.sub;
    const { signatureName, paypalEmail } = req.body;

    if (!signatureName) {
      return res.status(400).json({ message: "Signature name required" });
    }

    const identityResult = await customerIdentityService.resolve(req);
    let customer;
    if (identityResult.ok) {
      customer = identityResult.identity.customer;
    } else if (userId) {
      const userEmail = normalizeEmail(req.user.claims.email || `user_${userId}@example.com`);
      const userName = req.user.claims.name || signatureName;
      customer = await storage.createCustomer({
        userId,
        email: userEmail,
        name: userName,
      });
    } else {
      return res.status(401).json({ message: "Authentication required" });
    }

    const existingAffiliate = await storage.getAffiliateByCustomerId(customer.id);
    if (existingAffiliate) {
      return res.status(400).json({ message: "Already registered as an affiliate" });
    }

    let settings = await storage.getAffiliateSettings();
    if (!settings) {
      settings = await storage.updateAffiliateSettings({
        agreementText: getDefaultAffiliateAgreement(),
      });
    }

    let affiliateCode = generateAffiliateCode();
    while (await storage.getAffiliateByCode(affiliateCode)) {
      affiliateCode = generateAffiliateCode();
    }

    const affiliate = await storage.createAffiliate({
      customerId: customer.id,
      affiliateCode,
      status: "active",
      totalEarnings: 0,
      pendingBalance: 0,
      paidBalance: 0,
      totalReferrals: 0,
      totalSales: 0,
      paypalEmail,
    });

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await storage.createAffiliateAgreement({
      affiliateId: affiliate.id,
      agreementText: settings.agreementText,
      signatureName,
      signatureIp: typeof clientIp === 'string' ? clientIp : clientIp?.[0],
    });

    res.json({ success: true, affiliate });
  } catch (error) {
    console.error("Error becoming affiliate:", error);
    res.status(500).json({ message: "Failed to register as affiliate" });
  }
});

router.post("/affiliate/payout", async (req: any, res) => {
  try {
    const identityResult = await customerIdentityService.resolve(req);
    if (!identityResult.ok) {
      return res.status(identityResult.error.httpStatus).json({ message: identityResult.error.message });
    }
    const customer = identityResult.identity.customer;

    const affiliate = await storage.getAffiliateByCustomerId(customer.id);
    if (!affiliate) {
      return res.status(404).json({ message: "Affiliate account not found" });
    }

    const settings = await storage.getAffiliateSettings();
    if (!settings) {
      return res.status(500).json({ message: "Affiliate settings not configured" });
    }

    if (affiliate.pendingBalance < settings.minimumPayout) {
      return res.status(400).json({ 
        message: `Minimum payout is $${(settings.minimumPayout / 100).toFixed(2)}. Your balance is $${(affiliate.pendingBalance / 100).toFixed(2)}.`
      });
    }

    const payout = await storage.createAffiliatePayout({
      affiliateId: affiliate.id,
      amount: affiliate.pendingBalance,
      paymentMethod: "paypal",
      paymentDetails: affiliate.paypalEmail,
      status: "pending",
    });

    res.json({ success: true, payout });
  } catch (error) {
    console.error("Error requesting payout:", error);
    res.status(500).json({ message: "Failed to request payout" });
  }
});

router.patch("/affiliate", async (req: any, res) => {
  try {
    const { paypalEmail } = req.body;

    const identityResult = await customerIdentityService.resolve(req);
    if (!identityResult.ok) {
      return res.status(identityResult.error.httpStatus).json({ message: identityResult.error.message });
    }
    const customer = identityResult.identity.customer;

    const affiliate = await storage.getAffiliateByCustomerId(customer.id);
    if (!affiliate) {
      return res.status(404).json({ message: "Affiliate account not found" });
    }

    const updated = await storage.updateAffiliate(affiliate.id, { paypalEmail });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Failed to update affiliate info" });
  }
});

router.post("/affiliate/connect/start", async (req: any, res) => {
  try {
    const identityResult = await customerIdentityService.resolve(req);
    if (!identityResult.ok) {
      return res.status(identityResult.error.httpStatus).json({ message: identityResult.error.message });
    }
    const customer = identityResult.identity.customer;

    const affiliate = await storage.getAffiliateByCustomerId(customer.id);
    if (!affiliate) {
      return res.status(404).json({ message: "Affiliate account not found" });
    }

    if (affiliate.status !== "active") {
      return res.status(400).json({ message: "Affiliate account must be active to connect Stripe" });
    }

    const { stripeService } = await import("../../integrations/stripe/StripeService");
    
    if (!(await stripeService.isConfigured())) {
      return res.status(503).json({ message: "Stripe is not configured" });
    }

    let payoutAccount = await storage.getAffiliatePayoutAccountByAffiliateId(affiliate.id);
    
    if (!payoutAccount) {
      const stripeAccount = await stripeService.createExpressAccount({
        email: customer.email,
        country: customer.country === "USA" ? "US" : customer.country || "US",
        metadata: {
          affiliateId: affiliate.id,
          customerId: customer.id,
        },
      });

      payoutAccount = await storage.createAffiliatePayoutAccount({
        affiliateId: affiliate.id,
        stripeAccountId: stripeAccount.id,
        payoutsEnabled: false,
        chargesEnabled: false,
        detailsSubmitted: false,
        country: stripeAccount.country || "US",
        currency: stripeAccount.default_currency || "usd",
      });
    } else {
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

    const { getBaseUrl } = await import("../../utils/base-url");
    const baseUrl = getBaseUrl(req);
    
    const accountLink = await stripeService.createAccountLink({
      accountId: payoutAccount.stripeAccountId,
      refreshUrl: `${baseUrl}/my-account?tab=affiliate&connect=refresh`,
      returnUrl: `${baseUrl}/my-account?tab=affiliate&connect=complete`,
    });

    res.json({ url: accountLink.url });
  } catch (error: any) {
    console.error("Connect start error:", error);
    res.status(500).json({ message: error.message || "Failed to start Stripe Connect onboarding" });
  }
});

router.get("/affiliate/connect/status", async (req: any, res) => {
  try {
    const identityResult = await customerIdentityService.resolve(req);
    if (!identityResult.ok) {
      return res.status(identityResult.error.httpStatus).json({ message: identityResult.error.message });
    }
    const customer = identityResult.identity.customer;

    const affiliate = await storage.getAffiliateByCustomerId(customer.id);
    if (!affiliate) {
      return res.status(404).json({ message: "Affiliate account not found" });
    }

    const payoutAccount = await storage.getAffiliatePayoutAccountByAffiliateId(affiliate.id);
    
    if (!payoutAccount) {
      return res.json({ 
        connected: false,
        payoutsEnabled: false,
        chargesEnabled: false,
        detailsSubmitted: false,
      });
    }

    const { stripeService } = await import("../../integrations/stripe/StripeService");
    if (await stripeService.isConfigured()) {
      try {
        const stripeAccount = await stripeService.retrieveAccount(payoutAccount.stripeAccountId);
        
        if (
          stripeAccount.payouts_enabled !== payoutAccount.payoutsEnabled ||
          stripeAccount.charges_enabled !== payoutAccount.chargesEnabled ||
          stripeAccount.details_submitted !== payoutAccount.detailsSubmitted
        ) {
          await storage.updateAffiliatePayoutAccount(payoutAccount.id, {
            payoutsEnabled: stripeAccount.payouts_enabled ?? false,
            chargesEnabled: stripeAccount.charges_enabled ?? false,
            detailsSubmitted: stripeAccount.details_submitted ?? false,
            requirements: stripeAccount.requirements as any,
          });
        }

        return res.json({
          connected: true,
          payoutsEnabled: stripeAccount.payouts_enabled ?? false,
          chargesEnabled: stripeAccount.charges_enabled ?? false,
          detailsSubmitted: stripeAccount.details_submitted ?? false,
          requirements: stripeAccount.requirements,
          country: stripeAccount.country || payoutAccount.country,
          currency: stripeAccount.default_currency || payoutAccount.currency,
        });
      } catch (error) {
        console.error("Error fetching Stripe account:", error);
      }
    }

    res.json({
      connected: true,
      payoutsEnabled: payoutAccount.payoutsEnabled,
      chargesEnabled: payoutAccount.chargesEnabled,
      detailsSubmitted: payoutAccount.detailsSubmitted,
      requirements: payoutAccount.requirements,
      country: payoutAccount.country,
      currency: payoutAccount.currency,
    });
  } catch (error: any) {
    console.error("Connect status error:", error);
    res.status(500).json({ message: error.message || "Failed to get Stripe Connect status" });
  }
});

export default router;
