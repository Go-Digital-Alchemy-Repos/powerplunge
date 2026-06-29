import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { storage } from "../../../storage";
import { requireCustomerAuth, type AuthenticatedRequest } from "../../middleware/customer-auth.middleware";
import { authLimiter, passwordResetLimiter } from "../../middleware/rate-limiter";
import { claimOrdersByEmail } from "../../services/order-claim.service";
import {
  BETTER_AUTH_CUSTOMER_PASSWORD_PLACEHOLDER,
  applyBetterAuthHeaders,
  changeCustomerPassword,
  getBetterAuthUserByCustomerId,
  getAttachedCustomerAuthContext,
  isBetterAuthEmailReservedForAdmin,
  normalizeCustomerEmail,
  requestCustomerMagicLink,
  requestCustomerPasswordReset,
  resetCustomerPasswordAndCreateSession,
  serializeCustomer,
  signInCustomerWithPassword,
  signOutCustomer,
  syncBetterAuthCustomerUser,
  verifyCustomerMagicLink,
} from "../../auth/customerBetterAuth";

const router = Router();

const registerSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1, "Password is required"),
});

const magicLinkSchema = z.object({
  email: z.string().trim().email(),
});

const verifyMagicLinkSchema = z.object({
  token: z.string().min(1),
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

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

function handleAuthConfigError(res: any, error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("Better Auth is not configured")) {
    res.status(503).json({ message });
    return true;
  }
  return false;
}

function parseErrorMessage(error: any, fallback: string) {
  return error?.body?.message || error?.message || fallback;
}

async function signInWithLegacyFallback(email: string, password: string) {
  try {
    return await signInCustomerWithPassword({ email, password });
  } catch (error) {
    const customer = await storage.getCustomerByEmail(email);
    const legacyHash = customer?.passwordHash;
    const canUseLegacyHash = legacyHash && legacyHash !== BETTER_AUTH_CUSTOMER_PASSWORD_PLACEHOLDER;
    const validLegacyPassword = canUseLegacyHash
      ? await bcrypt.compare(password, legacyHash).catch(() => false)
      : false;

    if (!customer || !validLegacyPassword) {
      throw error;
    }

    await syncBetterAuthCustomerUser(customer, password);
    const signIn = await signInCustomerWithPassword({ email, password });
    await storage.updateCustomer(customer.id, {
      passwordHash: BETTER_AUTH_CUSTOMER_PASSWORD_PLACEHOLDER,
    });
    return signIn;
  }
}

router.post("/register", authLimiter, async (req, res) => {
  let createdCustomerId: string | null = null;

  try {
    const parsed = registerSchema.parse(req.body);
    const email = normalizeCustomerEmail(parsed.email);

    let customer = await storage.getCustomerByEmail(email);
    if (!customer && await isBetterAuthEmailReservedForAdmin(email)) {
      return res.status(400).json({ message: "An account with this email already exists. Please sign in instead." });
    }
    if (customer && !customer.isDisabled && customer.passwordHash) {
      return res.status(400).json({ message: "An account with this email already exists. Please sign in instead." });
    }

    if (customer?.isDisabled) {
      return res.status(403).json({ message: "This account has been disabled" });
    }

    if (!customer) {
      customer = await storage.createCustomer({
        email,
        name: parsed.name,
      });
      createdCustomerId = customer.id;
    }

    await syncBetterAuthCustomerUser(customer, parsed.password);
    const updatedCustomer = await storage.updateCustomer(customer.id, {
      name: parsed.name,
      passwordHash: BETTER_AUTH_CUSTOMER_PASSWORD_PLACEHOLDER,
    });
    if (updatedCustomer) customer = updatedCustomer;
    const signIn = await signInCustomerWithPassword({ email, password: parsed.password });
    applyBetterAuthHeaders(res, signIn.headers);

    claimOrdersByEmail(customer.id, email, "register").catch(
      (err) => console.error("[ORDER-CLAIM] register failed:", err),
    );

    res.json({
      success: true,
      customer: serializeCustomer(customer),
    });
  } catch (error: any) {
    if (createdCustomerId) {
      await storage.deleteCustomer(createdCustomerId).catch(() => {});
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    if (handleAuthConfigError(res, error)) return;
    console.error("Registration error:", error);
    res.status(error?.statusCode || 500).json({ message: parseErrorMessage(error, "Failed to create account") });
  }
});

router.post("/login", authLimiter, async (req, res) => {
  try {
    const parsed = loginSchema.parse(req.body);
    const email = normalizeCustomerEmail(parsed.email);

    const customer = await storage.getCustomerByEmail(email);
    if (!customer) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    if (customer.isDisabled) {
      return res.status(403).json({ message: "This account has been disabled" });
    }
    if (customer.mergedIntoCustomerId) {
      return res.status(409).json({
        message: "This account has been merged. Please use your primary account.",
        mergedInto: customer.mergedIntoCustomerId,
      });
    }

    const signIn = await signInWithLegacyFallback(email, parsed.password);
    const linkedUser = await getBetterAuthUserByCustomerId(customer.id);
    if (!linkedUser || linkedUser.id !== signIn.response.user.id) {
      await syncBetterAuthCustomerUser(customer);
    }

    applyBetterAuthHeaders(res, signIn.headers);
    claimOrdersByEmail(customer.id, email, "login").catch(
      (err) => console.error("[ORDER-CLAIM] login failed:", err),
    );

    res.json({
      success: true,
      customer: serializeCustomer(customer),
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    if (handleAuthConfigError(res, error)) return;
    console.error("Login error:", error);
    res.status(error?.statusCode === 401 ? 401 : 500).json({
      message: error?.statusCode === 401 ? "Invalid email or password" : "Failed to sign in",
    });
  }
});

router.post("/logout", async (req, res) => {
  try {
    const signOut = await signOutCustomer(req);
    applyBetterAuthHeaders(res, signOut.headers);
    res.json({ success: true });
  } catch (error) {
    if (handleAuthConfigError(res, error)) return;
    res.status(500).json({ message: "Logout failed" });
  }
});

router.post("/magic-link", passwordResetLimiter, async (req, res) => {
  try {
    const parsed = magicLinkSchema.parse(req.body);
    await requestCustomerMagicLink(req, parsed.email);

    res.json({
      success: true,
      message: "If an account exists with this email, you will receive a login link shortly.",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid email address" });
    }
    if (handleAuthConfigError(res, error)) return;
    console.error("Magic link request error:", error);
    res.status(500).json({ message: "Failed to send login link" });
  }
});

router.post("/verify-magic-link", passwordResetLimiter, async (req, res) => {
  try {
    const { token } = verifyMagicLinkSchema.parse(req.body);
    const customer = await verifyCustomerMagicLink(req, res, token);

    claimOrdersByEmail(customer.id, customer.email, "magic-link").catch(
      (err) => console.error("[ORDER-CLAIM] magic-link failed:", err),
    );

    res.json({
      success: true,
      customer: serializeCustomer(customer),
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid token" });
    }
    if (handleAuthConfigError(res, error)) return;
    console.error("Token verification error:", error);
    res.status(error?.statusCode || 400).json({ message: parseErrorMessage(error, "Invalid or expired link") });
  }
});

router.get("/check-admin-eligible", requireCustomerAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const customer = await storage.getCustomer(req.customerSession!.customerId);
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
    const customer = await storage.getCustomer(req.customerSession!.customerId);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    res.json(serializeCustomer(customer));
  } catch (error: any) {
    console.error("Get customer error:", error);
    res.status(500).json({ message: "Failed to fetch customer data" });
  }
});

router.patch("/update-profile", requireCustomerAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const customerId = req.customerSession!.customerId;
    const data = updateProfileSchema.parse(req.body);

    const updateData: any = {};
    if (data.firstName !== undefined || data.lastName !== undefined) {
      const name = [data.firstName, data.lastName].filter(Boolean).join(" ");
      if (name) updateData.name = name;
    }
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.state !== undefined) updateData.state = data.state;
    if (data.zipCode !== undefined) updateData.zipCode = data.zipCode;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;

    const customer = await storage.updateCustomer(customerId, updateData);
    if (customer) {
      await syncBetterAuthCustomerUser(customer);
    }

    res.json({ success: true, message: "Profile updated successfully" });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    if (handleAuthConfigError(res, error)) return;
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

router.post("/change-password", requireCustomerAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const result = await changeCustomerPassword(req, { currentPassword, newPassword });
    applyBetterAuthHeaders(res, result.headers);
    await storage.updateCustomer(req.customerSession!.customerId, {
      passwordHash: BETTER_AUTH_CUSTOMER_PASSWORD_PLACEHOLDER,
    });
    res.json({ success: true, message: "Password changed successfully" });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    if (handleAuthConfigError(res, error)) return;
    console.error("Change password error:", error);
    res.status(error?.statusCode === 400 ? 400 : 500).json({
      message: error?.statusCode === 400 ? "Current password is incorrect" : "Failed to change password",
    });
  }
});

router.post("/forgot-password", passwordResetLimiter, async (req, res) => {
  try {
    const parsed = forgotPasswordSchema.parse(req.body);
    const customer = await storage.getCustomerByEmail(parsed.email);
    if (
      customer &&
      !customer.isDisabled &&
      !customer.mergedIntoCustomerId &&
      !(await isBetterAuthEmailReservedForAdmin(customer.email))
    ) {
      await syncBetterAuthCustomerUser(customer);
      await requestCustomerPasswordReset(customer.email);
    }

    res.json({
      success: true,
      message: "If an account exists with this email, you will receive a password reset link shortly.",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid email address" });
    }
    if (handleAuthConfigError(res, error)) return;
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Failed to process password reset request" });
  }
});

router.post("/reset-password", passwordResetLimiter, async (req, res) => {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);
    const { customer } = await resetCustomerPasswordAndCreateSession(res, { token, newPassword });

    claimOrdersByEmail(customer.id, customer.email, "password-reset").catch(
      (err) => console.error("[ORDER-CLAIM] password-reset failed:", err),
    );

    res.json({
      success: true,
      message: "Password has been reset successfully",
      customer: serializeCustomer(customer),
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    if (handleAuthConfigError(res, error)) return;
    console.error("Reset password error:", error);
    res.status(error?.statusCode || 500).json({ message: parseErrorMessage(error, "Failed to reset password") });
  }
});

router.post("/verify-session", async (req, res) => {
  try {
    const context = await getAttachedCustomerAuthContext(req);
    if (!context) {
      return res.json({ valid: false });
    }
    claimOrdersByEmail(context.customer.id, context.customer.email, "session").catch(
      (err) => console.error("[ORDER-CLAIM] session failed:", err),
    );
    res.json({
      valid: true,
      customer: serializeCustomer(context.customer),
    });
  } catch (error) {
    if (handleAuthConfigError(res, error)) return;
    res.json({ valid: false });
  }
});

export default router;
