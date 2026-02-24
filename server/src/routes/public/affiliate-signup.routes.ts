import { Router, Request, Response } from "express";
import { storage } from "../../../storage";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { createSessionToken, verifySessionToken } from "../../middleware/customer-auth.middleware";
import { affiliateSignupLimiter, smsVerificationLimiter, smsSendLimiter, smsPhoneLimiter } from "../../middleware/rate-limiter";

const router = Router();

const GENERIC_ERROR = "Unable to process your request. Please try again later.";
const PHONE_DAILY_CAP = 10;
const INVITE_RESEND_WINDOW_MINUTES = 5;
const INVITE_RESEND_MAX = 3;
const VERIFICATION_TOKEN_EXPIRY_MINUTES = 30;

function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

router.get("/", async (req: Request, res: Response) => {
  try {
    const inviteCode = req.query.code as string | undefined;

    const settings = await storage.getAffiliateSettings();
    const agreementText = settings?.agreementText ?? "Affiliate Program Agreement - Terms and conditions for the affiliate program. By joining, you agree to promote our products ethically and in accordance with all applicable laws.";

    let invite = null;
    let inviteValid = false;
    let inviteError: string | null = null;

    let isExistingAffiliate = false;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const token = authHeader.substring(7);
        const payload = verifySessionToken(token);
        if (payload?.customerId) {
          const existingAffiliate = await storage.getAffiliateByCustomerId(payload.customerId);
          if (existingAffiliate) {
            isExistingAffiliate = true;
          }
        }
      } catch {}
    }

    if (!inviteCode) {
      inviteValid = false;
      inviteError = "Affiliate signup is invite-only. Please use a valid invite link.";
    } else {
      invite = await storage.getAffiliateInviteByCode(inviteCode);

      if (!invite) {
        inviteValid = false;
        inviteError = GENERIC_ERROR;
      } else if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
        inviteValid = false;
        inviteError = GENERIC_ERROR;
      } else if (invite.maxUses && invite.timesUsed >= invite.maxUses) {
        if (isExistingAffiliate) {
          inviteValid = true;
        } else {
          inviteValid = false;
          inviteError = GENERIC_ERROR;
        }
      } else {
        inviteValid = true;
      }
    }

    const maskedEmail = invite?.targetEmail
      ? invite.targetEmail.replace(/^(.)(.*)(@.*)$/, (_, first, middle, domain) => first + middle.replace(/./g, "*") + domain)
      : null;

    let sessionEmailMatch: boolean | null = null;
    if (invite?.targetEmail) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        try {
          const token = authHeader.substring(7);
          const payload = verifySessionToken(token);
          if (payload?.customerId) {
            const customers = await storage.getCustomersByIds([payload.customerId]);
            const customer = customers[0];
            if (customer?.email) {
              sessionEmailMatch = customer.email.toLowerCase() === invite.targetEmail.toLowerCase();
            }
          }
        } catch {}
      }
    }

    let requiresPhoneVerification = false;
    let smsAvailable = false;
    if (invite?.targetPhone) {
      const { smsService } = await import("../../services/sms.service");
      smsAvailable = await smsService.isSmsAvailable();
      if (smsAvailable) {
        const verified = await storage.getVerifiedVerificationForInvite(invite.id, invite.targetPhone);
        requiresPhoneVerification = !verified;
      }
    }

    const commissionType = settings?.defaultCommissionType ?? "PERCENT";
    const commissionValue = commissionType === "FIXED"
      ? (settings?.defaultCommissionValue ?? 0) / 100
      : settings?.defaultCommissionValue ?? 10;

    res.json({
      agreementText,
      inviteRequired: true,
      commissionType,
      commissionValue,
      invite: invite ? {
        code: invite.inviteCode,
        valid: inviteValid,
        error: inviteError,
        emailMasked: maskedEmail,
        hasTargetName: !!invite.targetName,
        isEmailLocked: !!invite.targetEmail,
        requiresPhoneVerification,
        phoneLastFour: invite.targetPhone ? invite.targetPhone.slice(-4) : null,
        sessionEmailMatch,
      } : null,
      inviteError: inviteError,
      programEnabled: settings?.programActive ?? true,
    });
  } catch (error: any) {
    console.error("Get affiliate signup info error:", error);
    res.status(500).json({ message: GENERIC_ERROR });
  }
});

const signupSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
  signatureName: z.string().min(1, "Signature is required"),
  inviteCode: z.string().min(1, "Affiliate signup is invite-only. A valid invite code is required."),
  verificationToken: z.string().optional(),
});

router.post("/", affiliateSignupLimiter, async (req: Request, res: Response) => {
  try {
    const settings = await storage.getAffiliateSettings();
    if (!settings?.programActive) {
      return res.status(400).json({
        message: "The affiliate program is not currently accepting new members"
      });
    }

    const parseResult = signupSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: parseResult.error.errors[0].message,
        errors: parseResult.error.errors
      });
    }

    const { email, password, name, signatureName, inviteCode, verificationToken } = parseResult.data;

    const invite = await storage.getAffiliateInviteByCode(inviteCode);

    if (!invite) {
      return res.status(400).json({ message: GENERIC_ERROR });
    }

    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return res.status(400).json({ message: GENERIC_ERROR });
    }

    if (invite.maxUses && invite.timesUsed >= invite.maxUses) {
      return res.status(400).json({ message: GENERIC_ERROR });
    }

    if (invite.targetEmail && invite.targetEmail.toLowerCase() !== email.toLowerCase()) {
      return res.status(400).json({ message: "This invite is for a different email address" });
    }

    if (invite.targetPhone) {
      const { smsService } = await import("../../services/sms.service");
      const smsAvailable = await smsService.isSmsAvailable();
      if (smsAvailable) {
        let verified = false;
        if (verificationToken) {
          const verification = await storage.getVerificationByToken(verificationToken);
          if (verification && verification.inviteId === invite.id && verification.status === "verified") {
            const tokenAge = Date.now() - new Date(verification.updatedAt).getTime();
            verified = tokenAge < VERIFICATION_TOKEN_EXPIRY_MINUTES * 60 * 1000;
          }
        }
        if (!verified) {
          const recentVerified = await storage.getVerifiedVerificationForInvite(invite.id, invite.targetPhone);
          verified = !!recentVerified;
        }
        if (!verified) {
          return res.status(403).json({ message: "Phone verification is required before signup. Please verify your phone number first." });
        }
      }
    }

    const existingCustomer = await storage.getCustomerByEmail(email);

    if (existingCustomer) {
      const existingAffiliate = await storage.getAffiliateByCustomerId(existingCustomer.id);
      if (existingAffiliate) {
        return res.status(400).json({
          message: "An affiliate account already exists with this email. Please sign in to access your affiliate portal.",
          existingAffiliate: true
        });
      }

      const wasMagicLinkOnly = !existingCustomer.passwordHash;

      if (existingCustomer.passwordHash) {
        const passwordMatch = await bcrypt.compare(password, existingCustomer.passwordHash);
        if (!passwordMatch) {
          return res.status(400).json({
            message: "An account with this email already exists. Please enter your correct password to join the affiliate program.",
            existingCustomer: true
          });
        }
        if (name && name !== existingCustomer.name) {
          await storage.updateCustomer(existingCustomer.id, { name });
        }
      } else {
        const passwordHash = await bcrypt.hash(password, 10);
        await storage.updateCustomer(existingCustomer.id, { passwordHash, name });
      }

      const code = `${name.replace(/\s+/g, '').substring(0, 6).toUpperCase() || 'REF'}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const affiliate = await storage.createAffiliate({
        customerId: existingCustomer.id,
        affiliateCode: code,
        status: "active",
      });

      await storage.createAffiliateAgreement({
        affiliateId: affiliate.id,
        agreementText: `Affiliate Program Agreement v1.0 - Signed by ${signatureName}`,
        signatureName,
        signatureIp: req.ip || "unknown",
      });

      const redemption = await storage.redeemAffiliateInvite(invite.id, affiliate.id, JSON.stringify({ email, signupType: "existing_customer" }));
      if (!redemption.success) {
        return res.status(409).json({ message: redemption.error || "This invite is no longer available" });
      }

      const sessionToken = createSessionToken(existingCustomer.id, email);

      const payoutAccount = await storage.getAffiliatePayoutAccountByAffiliateId(affiliate.id);

      return res.json({
        success: true,
        sessionToken,
        passwordUpgraded: wasMagicLinkOnly,
        customer: {
          id: existingCustomer.id,
          email: existingCustomer.email,
          name,
        },
        affiliate: {
          id: affiliate.id,
          code: affiliate.affiliateCode,
        },
        onboarding: {
          requiresStripeSetup: !payoutAccount?.payoutsEnabled,
          hasPayoutAccount: !!payoutAccount,
          canCustomizeCode: true,
          nextRecommendedStep: !payoutAccount?.payoutsEnabled ? "stripe" : "code",
        },
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const customer = await storage.createCustomer({
      email,
      name,
      passwordHash,
    });

    const code = `${name.replace(/\s+/g, '').substring(0, 6).toUpperCase() || 'REF'}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const affiliate = await storage.createAffiliate({
      customerId: customer.id,
      affiliateCode: code,
      status: "active",
    });

    await storage.createAffiliateAgreement({
      affiliateId: affiliate.id,
      agreementText: `Affiliate Program Agreement v1.0 - Signed by ${signatureName}`,
      signatureName,
      signatureIp: req.ip || "unknown",
    });

    const redemption = await storage.redeemAffiliateInvite(invite.id, affiliate.id, JSON.stringify({ email, signupType: "new_customer" }));
    if (!redemption.success) {
      return res.status(409).json({ message: redemption.error || "This invite is no longer available" });
    }

    const sessionToken = createSessionToken(customer.id, email);

    res.json({
      success: true,
      sessionToken,
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
      },
      affiliate: {
        id: affiliate.id,
        code: affiliate.affiliateCode,
      },
      onboarding: {
        requiresStripeSetup: true,
        hasPayoutAccount: false,
        canCustomizeCode: true,
        nextRecommendedStep: "stripe",
      },
    });
  } catch (error: any) {
    console.error("Affiliate signup error:", error);
    res.status(500).json({ message: GENERIC_ERROR });
  }
});

const joinSchema = z.object({
  signatureName: z.string().min(1, "Signature is required"),
  inviteCode: z.string().min(1, "Invite code is required"),
  verificationToken: z.string().optional(),
});

router.post("/join", affiliateSignupLimiter, async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const token = authHeader.slice(7);
    const tokenResult = verifySessionToken(token);
    if (!tokenResult.valid || !tokenResult.customerId) {
      return res.status(401).json({ message: "Invalid or expired session" });
    }

    const settings = await storage.getAffiliateSettings();
    if (!settings?.programActive) {
      return res.status(400).json({ message: "The affiliate program is not currently accepting new members" });
    }

    const parseResult = joinSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: parseResult.error.errors[0].message });
    }

    const { signatureName, inviteCode, verificationToken } = parseResult.data;

    const customer = await storage.getCustomer(tokenResult.customerId);
    if (!customer) {
      return res.status(404).json({ message: GENERIC_ERROR });
    }

    const existingAffiliate = await storage.getAffiliateByCustomerId(customer.id);
    if (existingAffiliate) {
      return res.status(400).json({ message: "You already have an affiliate account.", existingAffiliate: true });
    }

    const invite = await storage.getAffiliateInviteByCode(inviteCode);
    if (!invite) {
      return res.status(400).json({ message: GENERIC_ERROR });
    }
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return res.status(400).json({ message: GENERIC_ERROR });
    }
    if (invite.maxUses && invite.timesUsed >= invite.maxUses) {
      return res.status(400).json({ message: GENERIC_ERROR });
    }
    if (invite.targetEmail && invite.targetEmail.toLowerCase() !== customer.email.toLowerCase()) {
      return res.status(400).json({ message: "This invite is for a different email address" });
    }

    if (invite.targetPhone) {
      const { smsService } = await import("../../services/sms.service");
      const smsAvailable = await smsService.isSmsAvailable();
      if (smsAvailable) {
        let verified = false;
        if (verificationToken) {
          const verification = await storage.getVerificationByToken(verificationToken);
          if (verification && verification.inviteId === invite.id && verification.status === "verified") {
            const tokenAge = Date.now() - new Date(verification.updatedAt).getTime();
            verified = tokenAge < VERIFICATION_TOKEN_EXPIRY_MINUTES * 60 * 1000;
          }
        }
        if (!verified) {
          const recentVerified = await storage.getVerifiedVerificationForInvite(invite.id, invite.targetPhone);
          verified = !!recentVerified;
        }
        if (!verified) {
          return res.status(403).json({ message: "Phone verification is required before signup." });
        }
      }
    }

    const name = customer.name || signatureName;
    const code = `${name.replace(/\s+/g, '').substring(0, 6).toUpperCase() || 'REF'}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const affiliate = await storage.createAffiliate({
      customerId: customer.id,
      affiliateCode: code,
      status: "active",
    });

    await storage.createAffiliateAgreement({
      affiliateId: affiliate.id,
      agreementText: `Affiliate Program Agreement v1.0 - Signed by ${signatureName}`,
      signatureName,
      signatureIp: req.ip || "unknown",
    });

    const redemption = await storage.redeemAffiliateInvite(invite.id, affiliate.id, JSON.stringify({ email: customer.email, signupType: "authenticated_customer" }));
    if (!redemption.success) {
      return res.status(409).json({ message: redemption.error || "This invite is no longer available" });
    }

    const payoutAccount = await storage.getAffiliatePayoutAccountByAffiliateId(affiliate.id);

    res.json({
      success: true,
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
      },
      affiliate: {
        id: affiliate.id,
        code: affiliate.affiliateCode,
      },
      onboarding: {
        requiresStripeSetup: !payoutAccount?.payoutsEnabled,
        hasPayoutAccount: !!payoutAccount,
        canCustomizeCode: true,
        nextRecommendedStep: !payoutAccount?.payoutsEnabled ? "stripe" : "code",
      },
    });
  } catch (error: any) {
    console.error("Affiliate join error:", error);
    res.status(500).json({ message: GENERIC_ERROR });
  }
});

router.post("/send-verification", smsVerificationLimiter, smsSendLimiter, smsPhoneLimiter, async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      inviteCode: z.string().min(1, "Invite code is required"),
      sessionNonce: z.string().min(1, "Session identifier is required"),
    });

    const parseResult = schema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: GENERIC_ERROR });
    }

    const { inviteCode, sessionNonce } = parseResult.data;
    const invite = await storage.getAffiliateInviteByCode(inviteCode);

    if (!invite) {
      console.warn(`[SMS_VERIFY] Invalid invite code attempted: ${inviteCode.substring(0, 6)}...`);
      return res.status(400).json({ message: GENERIC_ERROR });
    }

    if (!invite.targetPhone) {
      return res.status(400).json({ message: GENERIC_ERROR });
    }

    const { smsService } = await import("../../services/sms.service");
    const phoneValidation = smsService.validateAndNormalizePhone(invite.targetPhone);
    if (!phoneValidation.valid || !phoneValidation.e164) {
      console.error(`[SMS_VERIFY] Invalid phone on invite ${invite.id}: ${invite.targetPhone}`);
      return res.status(400).json({ message: GENERIC_ERROR });
    }
    const normalizedPhone = phoneValidation.e164;

    const recentVerified = await storage.getVerifiedVerificationForInvite(invite.id, normalizedPhone);
    if (recentVerified) {
      return res.json({ success: true, alreadyVerified: true });
    }

    const recentInviteCount = await storage.countRecentVerificationsForInvite(invite.id, INVITE_RESEND_WINDOW_MINUTES);
    if (recentInviteCount >= INVITE_RESEND_MAX) {
      console.warn(`[SMS_VERIFY] Rate limit: invite ${invite.id} exceeded ${INVITE_RESEND_MAX} sends in ${INVITE_RESEND_WINDOW_MINUTES} min`);
      return res.status(429).json({ message: "Too many verification attempts. Please wait a few minutes before trying again." });
    }

    const dailyPhoneCount = await storage.countDailyVerificationsForPhone(normalizedPhone);
    if (dailyPhoneCount >= PHONE_DAILY_CAP) {
      console.warn(`[SMS_VERIFY] Daily cap: phone ${normalizedPhone.slice(-4)} exceeded ${PHONE_DAILY_CAP} sends`);
      return res.status(429).json({ message: "Daily verification limit reached for this number. Please try again tomorrow." });
    }

    if (!smsService.checkDailyBudget()) {
      console.error("[SMS_VERIFY] Global SMS budget exceeded");
      return res.status(503).json({ message: "Verification service is temporarily unavailable. Please try again later." });
    }

    await storage.invalidatePendingVerifications(invite.id, normalizedPhone);

    const verifyResult = await smsService.startVerification(normalizedPhone);

    if (!verifyResult.success) {
      console.error(`[SMS_VERIFY] Twilio Verify start failed: ${verifyResult.error}`);
      return res.status(500).json({ message: "Failed to send verification code. Please try again." });
    }

    await storage.createAffiliateInviteVerification({
      inviteId: invite.id,
      phone: normalizedPhone,
      sessionNonce,
      status: "pending",
      twilioVerifySid: verifyResult.verifySid || null,
    });

    res.json({
      success: true,
      phoneLastFour: normalizedPhone.slice(-4),
    });
  } catch (error: any) {
    console.error("Send phone verification error:", error);
    res.status(500).json({ message: GENERIC_ERROR });
  }
});

router.post("/verify-phone", smsVerificationLimiter, async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      inviteCode: z.string().min(1, "Invite code is required"),
      code: z.string().min(1, "Verification code is required"),
      sessionNonce: z.string().min(1, "Session identifier is required"),
    });

    const parseResult = schema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: GENERIC_ERROR });
    }

    const { inviteCode, code, sessionNonce } = parseResult.data;
    const invite = await storage.getAffiliateInviteByCode(inviteCode);

    if (!invite) {
      console.warn(`[SMS_VERIFY] Verify attempt with invalid invite: ${inviteCode.substring(0, 6)}...`);
      return res.status(400).json({ message: GENERIC_ERROR });
    }

    if (!invite.targetPhone) {
      return res.status(400).json({ message: GENERIC_ERROR });
    }

    const { smsService } = await import("../../services/sms.service");
    const phoneValidation = smsService.validateAndNormalizePhone(invite.targetPhone);
    if (!phoneValidation.valid || !phoneValidation.e164) {
      return res.status(400).json({ message: GENERIC_ERROR });
    }
    const normalizedPhone = phoneValidation.e164;

    const recentVerified = await storage.getVerifiedVerificationForInvite(invite.id, normalizedPhone);
    if (recentVerified) {
      return res.json({
        success: true,
        alreadyVerified: true,
        verificationToken: recentVerified.verificationToken,
      });
    }

    const verification = await storage.getPendingVerificationForInvite(invite.id, normalizedPhone, sessionNonce);
    if (!verification) {
      return res.status(400).json({ message: GENERIC_ERROR });
    }

    const checkResult = await smsService.checkVerification(normalizedPhone, code);

    if (!checkResult.success) {
      console.error(`[SMS_VERIFY] Twilio Verify check error: ${checkResult.error}`);
      return res.status(500).json({ message: GENERIC_ERROR });
    }

    if (!checkResult.valid) {
      return res.status(400).json({
        message: checkResult.status === "not_found"
          ? "Verification code has expired. Please request a new one."
          : "Incorrect verification code. Please try again.",
      });
    }

    const vToken = generateVerificationToken();
    await storage.updateAffiliateInviteVerification(verification.id, {
      status: "verified",
      verificationToken: vToken,
    });

    res.json({
      success: true,
      verificationToken: vToken,
    });
  } catch (error: any) {
    console.error("Verify phone error:", error);
    res.status(500).json({ message: GENERIC_ERROR });
  }
});

router.get("/program-info", async (_req: Request, res: Response) => {
  try {
    const settings = await storage.getAffiliateSettings();
    if (!settings || !settings.programActive) {
      return res.json({
        programActive: false,
        commissionType: "PERCENT",
        commissionValue: 0,
        discountType: "PERCENT",
        discountValue: 0,
        cookieDuration: 30,
      });
    }
    res.json({
      programActive: true,
      commissionType: settings.defaultCommissionType,
      commissionValue: settings.defaultCommissionValue,
      discountType: settings.defaultDiscountType,
      discountValue: settings.defaultDiscountValue,
      cookieDuration: settings.cookieDuration,
    });
  } catch (error: any) {
    console.error("Program info error:", error);
    res.status(500).json({ message: "Unable to load program information." });
  }
});

export default router;
