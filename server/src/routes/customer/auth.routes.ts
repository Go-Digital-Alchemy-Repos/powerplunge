import { Router, Request, Response } from "express";
import { customerEmailService } from "../../services/customer-email.service";
import { storage } from "../../../storage";
import { z } from "zod";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { 
  createSessionToken, 
  verifySessionToken, 
  requireCustomerAuth,
  AuthenticatedRequest 
} from "../../middleware/customer-auth.middleware";
import { normalizeEmail } from "../../services/customer-identity.service";
import { authLimiter, passwordResetLimiter } from "../../middleware/rate-limiter";

const router = Router();

const registerSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
});

router.post("/register", authLimiter, async (req, res) => {
  try {
    const parsed = registerSchema.parse(req.body);
    const email = normalizeEmail(parsed.email);
    const { password, name } = parsed;
    
    const existingCustomer = await storage.getCustomerByEmail(email);
    if (existingCustomer) {
      if (existingCustomer.passwordHash) {
        return res.status(400).json({ message: "An account with this email already exists. Please sign in instead." });
      }
      const passwordHash = await bcrypt.hash(password, 10);
      await storage.updateCustomer(existingCustomer.id, { passwordHash, name });
      
      const sessionToken = createSessionToken(existingCustomer.id, email);
      return res.json({
        success: true,
        sessionToken,
        customer: {
          id: existingCustomer.id,
          email: existingCustomer.email,
          name,
        },
      });
    }
    
    const passwordHash = await bcrypt.hash(password, 10);
    const customer = await storage.createCustomer({
      email,
      name,
      passwordHash,
    });
    
    const sessionToken = createSessionToken(customer.id, email);
    
    res.json({
      success: true,
      sessionToken,
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    console.error("Registration error:", error);
    res.status(500).json({ message: "Failed to create account" });
  }
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1, "Password is required"),
});

router.post("/login", authLimiter, async (req: any, res) => {
  try {
    const parsed = loginSchema.parse(req.body);
    const email = normalizeEmail(parsed.email);
    const { password } = parsed;
    
    const customerRecord = await storage.getCustomerByEmail(email);
    
    if (!customerRecord) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    
    if (!customerRecord.passwordHash) {
      return res.status(401).json({ 
        message: "This account uses email link login. Please use 'Send login link' instead.",
        requireMagicLink: true 
      });
    }
    
    if (customerRecord.isDisabled) {
      return res.status(403).json({ message: "This account has been disabled" });
    }
    
    const passwordMatch = await bcrypt.compare(password, customerRecord.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    
    const sessionToken = createSessionToken(customerRecord.id, email);
    
    return res.json({
      success: true,
      sessionToken,
      customer: {
        id: customerRecord.id,
        email: customerRecord.email,
        name: customerRecord.name,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    console.error("Login error:", error);
    res.status(500).json({ message: "Failed to sign in" });
  }
});

const magicLinkSchema = z.object({
  email: z.string().trim().email(),
});

router.post("/magic-link", passwordResetLimiter, async (req, res) => {
  try {
    const parsed = magicLinkSchema.parse(req.body);
    const email = normalizeEmail(parsed.email);
    
    await customerEmailService.sendMagicLinkEmail(email);
    
    res.json({ 
      success: true, 
      message: "If an account exists with this email, you will receive a login link shortly." 
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid email address" });
    }
    console.error("Magic link request error:", error);
    res.status(500).json({ message: "Failed to send login link" });
  }
});

const verifyMagicLinkSchema = z.object({
  token: z.string().min(1),
});

router.post("/verify-magic-link", passwordResetLimiter, async (req, res) => {
  try {
    const { token } = verifyMagicLinkSchema.parse(req.body);
    
    const result = await customerEmailService.verifyMagicLinkToken(token);
    
    if (!result.valid) {
      return res.status(400).json({ message: result.error || "Invalid or expired link" });
    }

    const customer = await storage.getCustomer(result.customerId!);
    if (!customer) {
      return res.status(400).json({ message: "Customer not found" });
    }
    
    if (customer.isDisabled) {
      return res.status(403).json({ message: "This account has been disabled" });
    }

    const sessionToken = createSessionToken(customer.id, customer.email);

    res.json({ 
      success: true, 
      sessionToken,
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid token" });
    }
    console.error("Token verification error:", error);
    res.status(500).json({ message: "Failed to verify token" });
  }
});

// Checks if the authenticated customer's email has a corresponding admin account.
// Returns eligibility status only — does not grant any admin session.
router.get("/check-admin-eligible", requireCustomerAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const customerId = req.customerSession!.customerId;
    const customer = await storage.getCustomer(customerId);
    if (!customer) {
      return res.json({ eligible: false });
    }
    const admin = await storage.getAdminUserByEmail(customer.email);
    return res.json({ eligible: !!admin });
  } catch (error) {
    console.error("Admin eligibility check error:", error);
    return res.json({ eligible: false });
  }
});

router.get("/me", requireCustomerAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const customerId = req.customerSession!.customerId;
    
    const customer = await storage.getCustomer(customerId);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    
    if (customer.isDisabled) {
      return res.status(403).json({ message: "This account has been disabled" });
    }

    res.json({
      id: customer.id,
      email: customer.email,
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      state: customer.state,
      zipCode: customer.zipCode,
      country: customer.country,
      avatarUrl: customer.avatarUrl || null,
    });
  } catch (error: any) {
    console.error("Get customer error:", error);
    res.status(500).json({ message: "Failed to fetch customer data" });
  }
});

const updateProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  avatarUrl: z.string().nullable().optional(),
});

router.patch("/update-profile", requireCustomerAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const customerId = req.customerSession!.customerId;
    const data = updateProfileSchema.parse(req.body);
    
    const updateData: any = {};
    if (data.firstName !== undefined || data.lastName !== undefined) {
      const name = [data.firstName, data.lastName].filter(Boolean).join(' ');
      if (name) updateData.name = name;
    }
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.state !== undefined) updateData.state = data.state;
    if (data.zipCode !== undefined) updateData.zipCode = data.zipCode;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
    
    await storage.updateCustomer(customerId, updateData);
    
    res.json({ success: true, message: "Profile updated successfully" });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

router.post("/change-password", requireCustomerAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const customerId = req.customerSession!.customerId;
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    
    const customer = await storage.getCustomer(customerId);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    
    if (!customer.passwordHash) {
      return res.status(400).json({ message: "Cannot change password for accounts that use email link login" });
    }
    
    const passwordMatch = await bcrypt.compare(currentPassword, customer.passwordHash);
    if (!passwordMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }
    
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await storage.updateCustomer(customerId, { passwordHash: newPasswordHash });
    
    res.json({ success: true, message: "Password changed successfully" });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    console.error("Change password error:", error);
    res.status(500).json({ message: "Failed to change password" });
  }
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email(),
});

router.post("/forgot-password", passwordResetLimiter, async (req, res) => {
  try {
    const parsed = forgotPasswordSchema.parse(req.body);
    const email = normalizeEmail(parsed.email);

    const customer = await storage.getCustomerByEmail(email);
    if (customer) {
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await storage.createPasswordResetToken({
        email: customer.email,
        token,
        expiresAt,
        used: false,
      });

      await customerEmailService.sendPasswordResetEmail(customer.email, customer.name || "there", token);
    }

    res.json({
      success: true,
      message: "If an account exists with this email, you will receive a password reset link shortly.",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid email address" });
    }
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Failed to process password reset request" });
  }
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

router.post("/reset-password", passwordResetLimiter, async (req, res) => {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);

    const tokenRecord = await storage.getPasswordResetToken(token);

    if (!tokenRecord) {
      return res.status(400).json({ message: "Invalid or expired reset link" });
    }

    if (tokenRecord.used) {
      return res.status(400).json({ message: "This reset link has already been used" });
    }

    if (new Date() > tokenRecord.expiresAt) {
      return res.status(400).json({ message: "This reset link has expired. Please request a new one." });
    }

    const customer = await storage.getCustomerByEmail(tokenRecord.email);
    if (!customer) {
      return res.status(400).json({ message: "Account not found" });
    }

    if (customer.isDisabled) {
      return res.status(403).json({ message: "This account has been disabled" });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await storage.updateCustomer(customer.id, { passwordHash: newPasswordHash });
    await storage.markPasswordResetTokenUsed(token);

    const sessionToken = createSessionToken(customer.id, customer.email);

    res.json({
      success: true,
      message: "Password has been reset successfully",
      sessionToken,
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Failed to reset password" });
  }
});

router.post("/verify-session", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.json({ valid: false });
    }

    const token = authHeader.slice(7);
    const result = verifySessionToken(token);

    if (!result.valid) {
      return res.json({ valid: false });
    }
    
    const customer = await storage.getCustomer(result.customerId!);
    if (!customer || customer.isDisabled) {
      return res.json({ valid: false });
    }

    res.json({ 
      valid: true,
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        avatarUrl: customer.avatarUrl || null,
      }
    });
  } catch (error: any) {
    console.error("Session verification error:", error);
    res.json({ valid: false });
  }
});

export default router;
