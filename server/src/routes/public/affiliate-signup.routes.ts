import { Router, Request, Response } from "express";
import { storage } from "../../../storage";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { createSessionToken, verifySessionToken } from "../../middleware/customer-auth.middleware";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const inviteCode = req.query.code as string | undefined;

    const settings = await storage.getAffiliateSettings();
    const agreementText = settings?.agreementText ?? "Affiliate Program Agreement - Terms and conditions for the affiliate program. By joining, you agree to promote our products ethically and in accordance with all applicable laws.";

    let invite = null;
    let inviteValid = false;
    let inviteError: string | null = null;

    if (!inviteCode) {
      inviteValid = false;
      inviteError = "Affiliate signup is invite-only. Please use a valid invite link.";
    } else {
      invite = await storage.getAffiliateInviteByCode(inviteCode);
      
      if (!invite) {
        inviteValid = false;
        inviteError = "Invalid invite code";
      } else if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
        inviteValid = false;
        inviteError = "This invite has expired";
      } else if (invite.maxUses && invite.timesUsed >= invite.maxUses) {
        inviteValid = false;
        inviteError = "This invite has reached its usage limit";
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

    res.json({
      agreementText,
      inviteRequired: true,
      invite: invite ? {
        code: invite.inviteCode,
        valid: inviteValid,
        error: inviteError,
        emailMasked: maskedEmail,
        hasTargetName: !!invite.targetName,
        isEmailLocked: !!invite.targetEmail,
        requiresPhoneVerification: !!invite.targetPhone && !invite.phoneVerified,
        phoneLastFour: invite.targetPhone ? invite.targetPhone.slice(-4) : null,
        sessionEmailMatch,
      } : null,
      inviteError: inviteError,
      programEnabled: settings?.programActive ?? true,
    });
  } catch (error: any) {
    console.error("Get affiliate signup info error:", error);
    res.status(500).json({ message: "Failed to get signup information" });
  }
});

const signupSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
  signatureName: z.string().min(1, "Signature is required"),
  inviteCode: z.string().min(1, "Affiliate signup is invite-only. A valid invite code is required."),
});

router.post("/", async (req: Request, res: Response) => {
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

    const { email, password, name, signatureName, inviteCode } = parseResult.data;

    const invite = await storage.getAffiliateInviteByCode(inviteCode);
    
    if (!invite) {
      return res.status(400).json({ message: "Invalid invite code" });
    }
    
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return res.status(400).json({ message: "This invite has expired" });
    }
    
    if (invite.maxUses && invite.timesUsed >= invite.maxUses) {
      return res.status(400).json({ message: "This invite has reached its usage limit" });
    }
    
    if (invite.targetEmail && invite.targetEmail.toLowerCase() !== email.toLowerCase()) {
      return res.status(400).json({ message: "This invite is for a different email address" });
    }

    if (invite.targetPhone && !invite.phoneVerified) {
      return res.status(403).json({ message: "This invite requires phone verification before signup. Please verify your phone number first." });
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
    res.status(500).json({ message: "Failed to create affiliate account" });
  }
});

const joinSchema = z.object({
  signatureName: z.string().min(1, "Signature is required"),
  inviteCode: z.string().min(1, "Invite code is required"),
});

router.post("/join", async (req: Request, res: Response) => {
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

    const { signatureName, inviteCode } = parseResult.data;

    const customer = await storage.getCustomer(tokenResult.customerId);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const existingAffiliate = await storage.getAffiliateByCustomerId(customer.id);
    if (existingAffiliate) {
      return res.status(400).json({ message: "You already have an affiliate account.", existingAffiliate: true });
    }

    const invite = await storage.getAffiliateInviteByCode(inviteCode);
    if (!invite) {
      return res.status(400).json({ message: "Invalid invite code" });
    }
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return res.status(400).json({ message: "This invite has expired" });
    }
    if (invite.maxUses && invite.timesUsed >= invite.maxUses) {
      return res.status(400).json({ message: "This invite has reached its usage limit" });
    }
    if (invite.targetEmail && invite.targetEmail.toLowerCase() !== customer.email.toLowerCase()) {
      return res.status(400).json({ message: "This invite is for a different email address" });
    }
    if (invite.targetPhone && !invite.phoneVerified) {
      return res.status(403).json({ message: "This invite requires phone verification before signup." });
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
    res.status(500).json({ message: "Failed to join affiliate program" });
  }
});

router.post("/send-verification", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      inviteCode: z.string().min(1, "Invite code is required"),
    });

    const parseResult = schema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: parseResult.error.errors[0].message });
    }

    const { inviteCode } = parseResult.data;
    const invite = await storage.getAffiliateInviteByCode(inviteCode);

    if (!invite) {
      return res.status(400).json({ message: "Invalid invite code" });
    }

    if (!invite.targetPhone) {
      return res.status(400).json({ message: "This invite does not require phone verification" });
    }

    if (invite.phoneVerified) {
      return res.json({ success: true, alreadyVerified: true });
    }

    const recentCount = await storage.countRecentPhoneVerificationCodes(inviteCode, 5);
    if (recentCount >= 3) {
      return res.status(429).json({ message: "Too many verification attempts. Please wait a few minutes before trying again." });
    }

    await storage.invalidatePhoneVerificationCodes(inviteCode, invite.targetPhone);

    const { smsService } = await import("../../services/sms.service");
    const code = smsService.generateCode();

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    await storage.createPhoneVerificationCode({
      inviteCode,
      phone: invite.targetPhone,
      code,
      expiresAt,
      verified: false,
      attempts: 0,
    });

    const smsResult = await smsService.sendVerificationCode(invite.targetPhone, code);

    if (!smsResult.success) {
      return res.status(500).json({ message: "Failed to send verification code. Please try again." });
    }

    res.json({
      success: true,
      phoneLastFour: invite.targetPhone.slice(-4),
    });
  } catch (error: any) {
    console.error("Send phone verification error:", error);
    res.status(500).json({ message: "Failed to send verification code" });
  }
});

router.post("/verify-phone", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      inviteCode: z.string().min(1, "Invite code is required"),
      code: z.string().min(1, "Verification code is required"),
    });

    const parseResult = schema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: parseResult.error.errors[0].message });
    }

    const { inviteCode, code } = parseResult.data;
    const invite = await storage.getAffiliateInviteByCode(inviteCode);

    if (!invite) {
      return res.status(400).json({ message: "Invalid invite code" });
    }

    if (!invite.targetPhone) {
      return res.status(400).json({ message: "This invite does not require phone verification" });
    }

    if (invite.phoneVerified) {
      return res.json({ success: true, alreadyVerified: true });
    }

    const verification = await storage.getPhoneVerificationCode(inviteCode, invite.targetPhone);

    if (!verification) {
      return res.status(400).json({ message: "No verification code found. Please request a new one." });
    }

    if (verification.attempts >= 5) {
      return res.status(429).json({ message: "Too many attempts. Please request a new verification code." });
    }

    if (new Date() > new Date(verification.expiresAt)) {
      return res.status(400).json({ message: "Verification code has expired. Please request a new one." });
    }

    if (verification.code !== code) {
      await storage.incrementPhoneVerificationAttempts(verification.id);
      return res.status(400).json({ message: "Incorrect verification code. Please try again." });
    }

    await storage.markPhoneVerificationCodeVerified(verification.id);
    await storage.updateAffiliateInvite(invite.id, { phoneVerified: true } as any);

    res.json({ success: true });
  } catch (error: any) {
    console.error("Verify phone error:", error);
    res.status(500).json({ message: "Failed to verify phone number" });
  }
});

export default router;
