import { Router, Request, Response } from "express";
import { storage } from "../../../storage";
import { z } from "zod";
import { emailService } from "../../integrations/mailgun/EmailService";
import { getBaseUrl } from "../../utils/base-url";

const router = Router();

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

router.get("/affiliate-settings", async (req, res) => {
  try {
    let settings = await storage.getAffiliateSettings();
    if (!settings) {
      settings = await storage.updateAffiliateSettings({
        commissionRate: 10,
        customerDiscountPercent: 0,
        minimumPayout: 5000,
        cookieDuration: 30,
        agreementText: getDefaultAffiliateAgreement(),
        programActive: true,
      });
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch affiliate settings" });
  }
});

const affiliateSettingsPatchSchema = z.object({
  commissionRate: z.number().int().min(0).max(100).optional(),
  customerDiscountPercent: z.number().int().min(0).max(100).optional(),
  defaultCommissionType: z.enum(["PERCENT", "FIXED"]).optional(),
  defaultCommissionValue: z.number().int().min(0).optional(),
  defaultDiscountType: z.enum(["PERCENT", "FIXED"]).optional(),
  defaultDiscountValue: z.number().int().min(0).optional(),
  minimumPayout: z.number().int().min(0).optional(),
  cookieDuration: z.number().int().min(1).max(365).optional(),
  agreementText: z.string().optional(),
  programActive: z.boolean().optional(),
  ffEnabled: z.boolean().optional(),
  ffDiscountType: z.enum(["PERCENT", "FIXED"]).optional(),
  ffDiscountValue: z.number().int().min(0).optional(),
  ffCommissionType: z.enum(["PERCENT", "FIXED"]).optional(),
  ffCommissionValue: z.number().int().min(0).optional(),
  ffMaxUses: z.number().int().min(0).optional(),
  inviteDefaultMaxUses: z.number().int().min(1).optional(),
  inviteDefaultExpirationDays: z.number().int().min(0).optional(),
}).refine((data) => {
  if (data.defaultCommissionType === "PERCENT" && data.defaultCommissionValue !== undefined && data.defaultCommissionValue > 100) {
    return false;
  }
  if (data.defaultDiscountType === "PERCENT" && data.defaultDiscountValue !== undefined && data.defaultDiscountValue > 100) {
    return false;
  }
  if (data.ffDiscountType === "PERCENT" && data.ffDiscountValue !== undefined && data.ffDiscountValue > 100) {
    return false;
  }
  if (data.ffCommissionType === "PERCENT" && data.ffCommissionValue !== undefined && data.ffCommissionValue > 100) {
    return false;
  }
  return true;
}, { message: "Percent values must be between 0 and 100" });

router.patch("/affiliate-settings", async (req, res) => {
  try {
    const parsed = affiliateSettingsPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid request body" });
    }
    const data: any = { ...parsed.data };
    if (data.defaultCommissionType !== undefined || data.defaultCommissionValue !== undefined) {
      const type = data.defaultCommissionType || "PERCENT";
      const value = data.defaultCommissionValue ?? 0;
      if (type === "PERCENT") {
        data.commissionRate = value;
      }
    }
    if (data.defaultDiscountType !== undefined || data.defaultDiscountValue !== undefined) {
      const type = data.defaultDiscountType || "PERCENT";
      const value = data.defaultDiscountValue ?? 0;
      if (type === "PERCENT") {
        data.customerDiscountPercent = value;
      }
    }
    const settings = await storage.updateAffiliateSettings(data);
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: "Failed to update affiliate settings" });
  }
});

router.get("/affiliates", async (req, res) => {
  try {
    const affiliates = await storage.getAffiliates();

    const customerIds = [...new Set(affiliates.map(a => a.customerId).filter(Boolean))];
    const customers = customerIds.length > 0
      ? await storage.getCustomersByIds(customerIds)
      : [];
    const customerMap = new Map(customers.map(c => [c.id, c]));

    const referralCounts = await storage.getAffiliateReferralCounts();
    const countMap = new Map(referralCounts.map(r => [r.affiliateId, r.count]));

    const affiliatesWithDetails = affiliates.map(affiliate => ({
      ...affiliate,
      customer: customerMap.get(affiliate.customerId) || null,
      referralCount: countMap.get(affiliate.id) || 0,
    }));

    res.json(affiliatesWithDetails);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch affiliates" });
  }
});

router.get("/affiliates/:id", async (req, res) => {
  try {
    const affiliate = await storage.getAffiliate(req.params.id);
    if (!affiliate) {
      return res.status(404).json({ message: "Affiliate not found" });
    }

    const customer = await storage.getCustomer(affiliate.customerId);
    const referrals = await storage.getAffiliateReferrals(affiliate.id);
    const agreements = await storage.getAffiliateAgreements(affiliate.id);
    const payouts = await storage.getAffiliatePayouts(affiliate.id);

    res.json({ ...affiliate, customer, referrals, agreements, payouts });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch affiliate" });
  }
});

router.patch("/affiliates/:id", async (req: any, res) => {
  try {
    const { status, paypalEmail, ffEnabled } = req.body;
    const prevAffiliate = await storage.getAffiliate(req.params.id);
    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (paypalEmail !== undefined) updateData.paypalEmail = paypalEmail;
    if (typeof ffEnabled === "boolean") updateData.ffEnabled = ffEnabled;
    const affiliate = await storage.updateAffiliate(req.params.id, updateData);
    if (!affiliate) {
      return res.status(404).json({ message: "Affiliate not found" });
    }

    const adminEmail = req.adminUser?.email || req.session?.adminEmail || "admin";
    await storage.createAuditLog({
      actor: adminEmail,
      action: ffEnabled !== undefined && status === undefined ? "affiliate.ff_toggled" : "affiliate.status_changed",
      entityType: "affiliate",
      entityId: affiliate.id,
      metadata: { 
        affiliateCode: affiliate.affiliateCode,
        prevStatus: prevAffiliate?.status,
        newStatus: status,
        paypalEmail,
        ffEnabled,
      },
    });

    res.json(affiliate);
  } catch (error) {
    res.status(500).json({ message: "Failed to update affiliate" });
  }
});

router.get("/affiliate-invites", async (req, res) => {
  try {
    const invites = await storage.getAffiliateInvites();
    
    const invitesWithDetails = await Promise.all(
      invites.map(async (invite) => {
        let createdByAdmin = null;
        let usedByAffiliate = null;
        let usedByCustomer = null;
        
        if (invite.createdByAdminId) {
          createdByAdmin = await storage.getAdminUser(invite.createdByAdminId);
        }
        
        if (invite.usedByAffiliateId) {
          usedByAffiliate = await storage.getAffiliate(invite.usedByAffiliateId);
          if (usedByAffiliate) {
            usedByCustomer = await storage.getCustomer(usedByAffiliate.customerId);
          }
        }
        
        return {
          ...invite,
          createdByAdmin: createdByAdmin ? { id: createdByAdmin.id, email: createdByAdmin.email } : null,
          usedByAffiliate: usedByAffiliate ? {
            id: usedByAffiliate.id,
            code: usedByAffiliate.affiliateCode,
            customerName: usedByCustomer?.name,
            customerEmail: usedByCustomer?.email,
          } : null,
          isExpired: invite.expiresAt && new Date(invite.expiresAt) < new Date(),
          isExhausted: invite.maxUses !== null && invite.timesUsed >= (invite.maxUses ?? 1),
        };
      })
    );
    
    res.json(invitesWithDetails);
  } catch (error) {
    console.error("Failed to fetch affiliate invites:", error);
    res.status(500).json({ message: "Failed to fetch affiliate invites" });
  }
});

router.post("/affiliate-invites", async (req: any, res) => {
  try {
    const { targetEmail, targetName, expiresAt, maxUses, notes } = req.body;
    
    const { randomBytes } = await import("crypto");
    const inviteCode = `INV${randomBytes(5).toString("hex").toUpperCase()}`;
    
    const invite = await storage.createAffiliateInvite({
      inviteCode,
      targetEmail: targetEmail || null,
      targetName: targetName || null,
      createdByAdminId: req.adminUser?.id || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      maxUses: maxUses || 1,
      notes: notes || null,
    });
    
    const adminEmail = req.adminUser?.email || req.session?.adminEmail || "admin";
    await storage.createAuditLog({
      actor: adminEmail,
      action: "affiliate_invite.created",
      entityType: "affiliate_invite",
      entityId: invite.id,
      metadata: {
        inviteCode,
        targetEmail,
        maxUses,
      },
    });
    
    res.json(invite);
  } catch (error) {
    console.error("Failed to create affiliate invite:", error);
    res.status(500).json({ message: "Failed to create affiliate invite" });
  }
});

router.post("/affiliate-invites/:id/resend", async (req: any, res) => {
  try {
    const invite = await storage.getAffiliateInvite(req.params.id);
    if (!invite) {
      return res.status(404).json({ message: "Invite not found" });
    }

    if (!invite.targetEmail) {
      return res.status(400).json({ message: "Invite has no email address" });
    }

    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return res.status(400).json({ message: "Invite has expired" });
    }

    if (invite.maxUses !== null && invite.timesUsed >= (invite.maxUses ?? 1)) {
      return res.status(400).json({ message: "Invite has been fully used" });
    }

    const baseUrl = getBaseUrl(req);
    const inviteUrl = `${baseUrl}/become-affiliate?code=${invite.inviteCode}`;
    const recipientName = invite.targetName || invite.targetEmail.split("@")[0];

    let emailResult = { success: false, error: "Failed to send" } as any;
    try {
      const { escapeHtml } = await import("../../utils/html-escape");
      const safeRecipientName = escapeHtml(recipientName);
      const safeInviteUrl = escapeHtml(inviteUrl);
      const expirationDate = invite.expiresAt ? new Date(invite.expiresAt) : null;
      emailResult = await emailService.sendEmail({
        to: invite.targetEmail,
        subject: `${recipientName}, you're invited to partner with Power Plunge`,
        html: `<div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
<p>Hi ${safeRecipientName},</p>

<p>I wanted to reach out personally — we'd love to have you as a Power Plunge affiliate partner.</p>

<p>You can sign up and get started here:<br>
<a href="${safeInviteUrl}">${safeInviteUrl}</a></p>

${expirationDate ? `<p style="color: #666; font-size: 13px;">This link expires on ${escapeHtml(expirationDate.toLocaleDateString())}.</p>` : ""}

<p>Let us know if you have any questions.</p>

<p>Thanks,<br>The Power Plunge Team</p>
</div>`,
        text: `Hi ${recipientName},\n\nI wanted to reach out personally — we'd love to have you as a Power Plunge affiliate partner.\n\nYou can sign up and get started here:\n${inviteUrl}\n\n${expirationDate ? `This link expires on ${expirationDate.toLocaleDateString()}.\n\n` : ""}Let us know if you have any questions.\n\nThanks,\nThe Power Plunge Team`,
      });
    } catch (emailError: any) {
      console.error("Failed to resend affiliate invite email:", emailError);
      emailResult = { success: false, error: emailError.message || "Failed to send email" };
    }

    const adminEmail = req.adminUser?.email || req.session?.adminEmail || "admin";
    await storage.createAuditLog({
      actor: adminEmail,
      action: "affiliate_invite.resent",
      entityType: "affiliate_invite",
      entityId: invite.id,
      metadata: {
        inviteCode: invite.inviteCode,
        targetEmail: invite.targetEmail,
        emailSent: emailResult.success,
        emailError: emailResult.error || null,
        inviteUrl,
      },
    });

    res.json({
      invite,
      inviteUrl,
      emailSent: emailResult.success,
      emailError: emailResult.success ? null : (emailResult.error || null),
    });
  } catch (error: any) {
    console.error("Failed to resend affiliate invite:", error);
    res.status(500).json({ message: "Failed to resend affiliate invite" });
  }
});

router.delete("/affiliate-invites/:id", async (req: any, res) => {
  try {
    const invite = await storage.getAffiliateInvite(req.params.id);
    if (!invite) {
      return res.status(404).json({ message: "Invite not found" });
    }
    
    await storage.deleteAffiliateInvite(req.params.id);
    
    const adminEmail = req.adminUser?.email || req.session?.adminEmail || "admin";
    await storage.createAuditLog({
      actor: adminEmail,
      action: "affiliate_invite.deleted",
      entityType: "affiliate_invite",
      entityId: req.params.id,
      metadata: {
        inviteCode: invite.inviteCode,
        wasUsed: invite.timesUsed > 0,
      },
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete affiliate invite:", error);
    res.status(500).json({ message: "Failed to delete affiliate invite" });
  }
});

router.post("/affiliate-invites/send", async (req: any, res) => {
  try {
    const sendInviteSchema = z.object({
      targetEmail: z.string().email("Valid email is required").optional().or(z.literal("")),
      targetPhone: z.string().optional().or(z.literal("")),
      targetName: z.string().optional(),
      expiresAt: z.string().optional(),
      expiresInDays: z.number().positive().optional(),
      maxUses: z.number().int().positive().optional(),
      notes: z.string().optional(),
      deliveryMethod: z.enum(["contacts", "text", "email"]).optional(),
    });

    const parseResult = sendInviteSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: parseResult.error.errors[0].message,
        errors: parseResult.error.errors,
      });
    }

    const { targetEmail, targetPhone, targetName, expiresAt, expiresInDays, maxUses, notes, deliveryMethod } = parseResult.data;

    if (deliveryMethod === "text" && (!targetPhone || !targetPhone.trim())) {
      return res.status(400).json({ message: "Phone number is required for text delivery" });
    }
    if (deliveryMethod === "email" && (!targetEmail || !targetEmail.trim())) {
      return res.status(400).json({ message: "Email address is required for email delivery" });
    }

    const normalizedEmail = targetEmail?.trim().toLowerCase() || null;

    let normalizedPhone: string | null = null;
    if (targetPhone && targetPhone.trim()) {
      const { smsService } = await import("../../services/sms.service");
      const phoneResult = smsService.validateAndNormalizePhone(targetPhone.trim());
      if (!phoneResult.valid || !phoneResult.e164) {
        return res.status(400).json({ message: phoneResult.error || "Invalid phone number" });
      }
      normalizedPhone = phoneResult.e164;
    }

    const affSettings = await storage.getAffiliateSettings();
    const defaultMaxUses = affSettings?.inviteDefaultMaxUses ?? 1;
    const defaultExpirationDays = affSettings?.inviteDefaultExpirationDays ?? 0;

    let expirationDate: Date | null = null;
    if (expiresAt) {
      expirationDate = new Date(expiresAt);
      if (isNaN(expirationDate.getTime())) {
        return res.status(400).json({ message: "Invalid expiration date format" });
      }
    } else if (expiresInDays) {
      expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + expiresInDays);
    } else if (defaultExpirationDays > 0) {
      expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + defaultExpirationDays);
    }

    const { randomBytes } = await import("crypto");
    const inviteCode = `INV${randomBytes(5).toString("hex").toUpperCase()}`;

    const invite = await storage.createAffiliateInvite({
      inviteCode,
      targetEmail: normalizedEmail,
      targetPhone: normalizedPhone,
      targetName: targetName || null,
      createdByAdminId: req.adminUser?.id || null,
      expiresAt: expirationDate,
      maxUses: maxUses || defaultMaxUses,
      notes: notes || null,
    });

    const baseUrl = getBaseUrl(req);
    const inviteUrl = `${baseUrl}/become-affiliate?code=${inviteCode}`;

    let emailResult = { success: false, error: "No email address provided" } as any;
    let smsResult = { success: false, error: "No phone number provided" } as any;
    let sentVia: string[] = [];

    const shouldSendEmail = normalizedEmail && (deliveryMethod === "email" || !deliveryMethod);
    const shouldSendSms = normalizedPhone && (deliveryMethod === "text" || (!deliveryMethod && !normalizedEmail));

    if (shouldSendEmail) {
      try {
        const { escapeHtml } = await import("../../utils/html-escape");
        const recipientName = targetName || normalizedEmail!.split("@")[0];
        const safeRecipientName = escapeHtml(recipientName);
        const safeInviteUrl = escapeHtml(inviteUrl);
        emailResult = await emailService.sendEmail({
          to: normalizedEmail!,
          subject: `${recipientName}, you're invited to partner with Power Plunge`,
          html: `<div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
<p>Hi ${safeRecipientName},</p>

<p>I wanted to reach out personally — we'd love to have you as a Power Plunge affiliate partner.</p>

<p>You can sign up and get started here:<br>
<a href="${safeInviteUrl}">${safeInviteUrl}</a></p>

${expirationDate ? `<p style="color: #666; font-size: 13px;">This link expires on ${escapeHtml(expirationDate.toLocaleDateString())}.</p>` : ""}

<p>Let us know if you have any questions.</p>

<p>Thanks,<br>The Power Plunge Team</p>
</div>`,
          text: `Hi ${recipientName},\n\nI wanted to reach out personally — we'd love to have you as a Power Plunge affiliate partner.\n\nYou can sign up and get started here:\n${inviteUrl}\n\n${expirationDate ? `This link expires on ${expirationDate.toLocaleDateString()}.\n\n` : ""}Let us know if you have any questions.\n\nThanks,\nThe Power Plunge Team`,
        });
        if (emailResult.success) sentVia.push("email");
      } catch (emailError: any) {
        console.error("Failed to send affiliate invite email:", emailError);
        emailResult = { success: false, error: emailError.message || "Failed to send email" };
      }
    }

    if (shouldSendSms) {
      try {
        const { smsService } = await import("../../services/sms.service");
        smsResult = await smsService.sendInviteSms(normalizedPhone!, inviteUrl, targetName || undefined);
        if (smsResult.success) sentVia.push("sms");
      } catch (smsError: any) {
        console.error("Failed to send affiliate invite SMS:", smsError);
        smsResult = { success: false, error: smsError.message || "Failed to send SMS" };
      }
    }

    const adminEmail = req.adminUser?.email || req.session?.adminEmail || "admin";
    await storage.createAuditLog({
      actor: adminEmail,
      action: "affiliate_invite.sent",
      entityType: "affiliate_invite",
      entityId: invite.id,
      metadata: {
        inviteCode,
        deliveryMethod: deliveryMethod || "legacy",
        targetEmail: normalizedEmail,
        targetPhone: normalizedPhone,
        targetName,
        sentVia,
        emailSent: emailResult.success,
        emailError: emailResult.error || null,
        smsSent: smsResult.success,
        smsError: smsResult.error || null,
        smsMessageSid: smsResult.messageSid || null,
        inviteUrl,
      },
    });

    res.json({
      invite,
      inviteUrl,
      emailSent: emailResult.success,
      emailError: emailResult.success ? null : (emailResult.error || null),
      smsSent: smsResult.success,
      smsError: smsResult.success ? null : (smsResult.error || null),
      sentVia,
    });
  } catch (error: any) {
    console.error("Failed to create and send affiliate invite:", error);
    res.status(500).json({ message: "Failed to create and send affiliate invite" });
  }
});

router.get("/payouts", async (req, res) => {
  try {
    const payouts = await storage.getAffiliatePayouts();
    
    const payoutsWithDetails = await Promise.all(
      payouts.map(async (payout) => {
        const affiliate = await storage.getAffiliate(payout.affiliateId);
        const customer = affiliate ? await storage.getCustomer(affiliate.customerId) : null;
        
        const payoutAccount = affiliate 
          ? await storage.getAffiliatePayoutAccountByAffiliateId(affiliate.id)
          : null;
        
        const connectStatus = payoutAccount
          ? (payoutAccount.payoutsEnabled ? "active" : 
             payoutAccount.detailsSubmitted ? "pending" : "incomplete")
          : "not_connected";

        return { 
          ...payout, 
          affiliate, 
          customer,
          stripeTransferId: payout.stripeTransferId || null,
          payoutBatchId: payout.payoutBatchId || null,
          connectStatus,
        };
      })
    );

    res.json(payoutsWithDetails);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch payouts" });
  }
});

router.patch("/payouts/:id", async (req: any, res) => {
  try {
    const { status, notes } = req.body;
    const updateData: any = { status, notes };
    
    const prevPayout = await storage.getAffiliatePayout(req.params.id);
    
    if (status === "paid" || status === "approved" || status === "rejected") {
      updateData.processedAt = new Date();
      updateData.processedBy = req.session?.adminId;
    }

    const payout = await storage.updateAffiliatePayout(req.params.id, updateData);
    if (!payout) {
      return res.status(404).json({ message: "Payout not found" });
    }

    if (status === "paid") {
      const affiliate = await storage.getAffiliate(payout.affiliateId);
      if (affiliate) {
        await storage.updateAffiliate(affiliate.id, {
          pendingBalance: Math.max(0, affiliate.pendingBalance - payout.amount),
          paidBalance: affiliate.paidBalance + payout.amount,
        });
      }
    }

    const adminEmail = req.adminUser?.email || req.session?.adminEmail || "admin";
    await storage.createAuditLog({
      actor: adminEmail,
      action: "payout.processed",
      entityType: "affiliate_payout",
      entityId: payout.id,
      metadata: { 
        affiliateId: payout.affiliateId,
        amount: payout.amount,
        prevStatus: prevPayout?.status,
        newStatus: status,
        notes,
      },
    });

    res.json(payout);
  } catch (error) {
    res.status(500).json({ message: "Failed to process payout" });
  }
});

router.post("/affiliate-payouts/run", async (req: any, res) => {
  try {
    const { affiliatePayoutService } = await import("../../services/affiliate-payout.service");
    const { stripeService } = await import("../../integrations/stripe/StripeService");

    if (!(await stripeService.isConfigured())) {
      return res.status(400).json({ 
        message: "Stripe is not configured. Please configure Stripe in admin settings." 
      });
    }

    const dryRun = req.body.dryRun === true || req.query.dryRun === "true";
    const adminUserId = req.session?.adminId;

    const summary = await affiliatePayoutService.runPayoutBatch({
      dryRun,
      adminUserId,
    });

    res.json({
      success: true,
      message: dryRun 
        ? "Dry run completed - no payouts were processed" 
        : `Payout batch ${summary.batchId} completed`,
      summary,
    });
  } catch (error: any) {
    console.error("Error running affiliate payout batch:", error);
    res.status(500).json({ 
      message: error.message || "Failed to run affiliate payout batch" 
    });
  }
});

router.get("/affiliate-payouts/batches/:batchId", async (req: any, res) => {
  try {
    const { batchId } = req.params;
    
    if (!batchId) {
      return res.status(400).json({ message: "Batch ID is required" });
    }

    const payouts = await storage.getAffiliatePayoutsByBatchId(batchId);
    
    if (payouts.length === 0) {
      return res.status(404).json({ message: "Batch not found or has no payouts" });
    }

    const affiliateIds = Array.from(new Set(payouts.map(p => p.affiliateId)));
    const affiliates = await Promise.all(
      affiliateIds.map(id => storage.getAffiliate(id))
    );
    const affiliateMap = new Map(
      affiliates.filter(Boolean).map(a => [a!.id, a!])
    );

    const enrichedPayouts = payouts.map(p => ({
      ...p,
      affiliateCode: affiliateMap.get(p.affiliateId)?.affiliateCode || "Unknown",
    }));

    const totalAmount = payouts.reduce((sum, p) => sum + p.amount, 0);
    const successfulPayouts = payouts.filter(p => p.status === "paid").length;
    const failedPayouts = payouts.filter(p => p.status === "failed").length;
    const pendingPayouts = payouts.filter(p => p.status === "pending").length;

    res.json({
      batchId,
      totalPayouts: payouts.length,
      totalAmount,
      successfulPayouts,
      failedPayouts,
      pendingPayouts,
      payouts: enrichedPayouts,
    });
  } catch (error: any) {
    console.error("Error fetching payout batch:", error);
    res.status(500).json({ 
      message: error.message || "Failed to fetch payout batch" 
    });
  }
});

export default router;
