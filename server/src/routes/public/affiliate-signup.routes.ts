import { Router, Request, Response } from "express";
import { storage } from "../../../storage";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { createSessionToken } from "../../middleware/customer-auth.middleware";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const inviteCode = req.query.code as string | undefined;

    const settings = await storage.getAffiliateSettings();
    const agreementText = settings?.agreementText ?? "Affiliate Program Agreement - Terms and conditions for the affiliate program. By joining, you agree to promote our products ethically and in accordance with all applicable laws.";

    let invite = null;
    let inviteValid = true;
    let inviteError: string | null = null;

    if (inviteCode) {
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
      }
    }

    res.json({
      agreementText,
      invite: invite ? {
        code: invite.inviteCode,
        valid: inviteValid,
        error: inviteError,
        targetEmail: invite.targetEmail,
        targetName: invite.targetName,
      } : null,
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
  inviteCode: z.string().optional(),
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

    let invite = null;
    if (inviteCode) {
      invite = await storage.getAffiliateInviteByCode(inviteCode);
      
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
      
      if (existingCustomer.passwordHash) {
        return res.status(400).json({ 
          message: "An account with this email already exists. Please sign in to your account and join the affiliate program from your dashboard.",
          existingCustomer: true
        });
      }
      
      const passwordHash = await bcrypt.hash(password, 10);
      await storage.updateCustomer(existingCustomer.id, { passwordHash, name });
      
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
      
      if (invite) {
        await storage.incrementAffiliateInviteUsage(invite.id);
        await storage.updateAffiliateInvite(invite.id, {
          usedByAffiliateId: affiliate.id,
          usedAt: new Date(),
        });
      }
      
      const sessionToken = createSessionToken(existingCustomer.id, email);
      
      return res.json({
        success: true,
        sessionToken,
        customer: {
          id: existingCustomer.id,
          email: existingCustomer.email,
          name,
        },
        affiliate: {
          id: affiliate.id,
          code: affiliate.affiliateCode,
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
    
    if (invite) {
      await storage.incrementAffiliateInviteUsage(invite.id);
      await storage.updateAffiliateInvite(invite.id, {
        usedByAffiliateId: affiliate.id,
        usedAt: new Date(),
      });
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
    });
  } catch (error: any) {
    console.error("Affiliate signup error:", error);
    res.status(500).json({ message: "Failed to create affiliate account" });
  }
});

export default router;
