import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { storage } from "../../../storage";
import { authLimiter, passwordResetLimiter } from "../../middleware/rate-limiter";
import {
  BETTER_AUTH_LEGACY_PASSWORD_PLACEHOLDER,
  applyBetterAuthHeaders,
  assertAdminBetterAuthReady,
  attachAdminAuthContext,
  changeAdminPassword,
  deleteBetterAuthUserById,
  getAdminAuthContext,
  getBetterAuthUserByAdminId,
  requestAdminPasswordReset,
  resetAdminPasswordAndCreateSession,
  serializeAdmin,
  signInAdminWithPassword,
  signOutAdmin,
  signUpAdminAndCreateSession,
  syncBetterAuthAdminUser,
  updateBetterAuthAdminUser,
  validateAdminPasswordResetToken,
} from "../../auth/adminBetterAuth";

const router = Router();

type SerializedAdmin = ReturnType<typeof serializeAdmin>;

function splitName(name: string) {
  const parts = name.trim().split(/\s+/);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  };
}

function handleAuthConfigError(res: any, error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("Better Auth is not configured")) {
    res.status(503).json({ message });
    return true;
  }
  return false;
}

function attachSessionCompat(req: any, admin: SerializedAdmin) {
  if (!req.session) return;
  req.session.adminId = admin.id;
  req.session.adminRole = admin.role;
  req.session.adminEmail = admin.email;
  req.session.adminUser = admin;
}

router.get("/check-setup", async (_req, res) => {
  try {
    const admins = await storage.getAdminUsers();
    res.json({ needsSetup: admins.length === 0 });
  } catch (error) {
    res.status(500).json({ message: "Failed to check setup status" });
  }
});

router.post("/setup", authLimiter, async (req, res) => {
  let createdAdminId: string | null = null;
  let createdBetterAuthUserId: string | null = null;

  try {
    const admins = await storage.getAdminUsers();
    if (admins.length > 0) {
      return res.status(403).json({ message: "Admin already exists. Use login instead." });
    }

    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ message: "Email, password, and name are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const { firstName, lastName } = splitName(name);
    const admin = await storage.createAdminUser({
      email: String(email).toLowerCase(),
      password: BETTER_AUTH_LEGACY_PASSWORD_PLACEHOLDER,
      firstName,
      lastName,
      name,
      role: "super_admin",
    });
    createdAdminId = admin.id;

    const signUp = await signUpAdminAndCreateSession({ email, password, name });
    createdBetterAuthUserId = signUp.response.user.id;
    await updateBetterAuthAdminUser(createdBetterAuthUserId, admin);
    applyBetterAuthHeaders(res, signUp.headers);
    attachSessionCompat(req, serializeAdmin(admin));

    res.status(201).json({
      success: true,
      admin: serializeAdmin(admin),
    });
  } catch (error: any) {
    if (createdAdminId) {
      await storage.deleteAdminUser(createdAdminId).catch(() => {});
    }
    if (createdBetterAuthUserId) {
      await deleteBetterAuthUserById(createdBetterAuthUserId).catch(() => {});
    }
    if (handleAuthConfigError(res, error)) return;
    res.status(error?.statusCode || 500).json({ message: error?.message || "Failed to create admin account" });
  }
});

router.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    let signIn: Awaited<ReturnType<typeof signInAdminWithPassword>>;
    try {
      signIn = await signInAdminWithPassword({ email, password });
    } catch (error: any) {
      const admin = await storage.getAdminUserByEmail(String(email).toLowerCase());
      const validLegacyPassword = admin ? await bcrypt.compare(password, admin.password).catch(() => false) : false;
      if (!admin || !validLegacyPassword) {
        throw error;
      }

      await syncBetterAuthAdminUser(admin, password);
      signIn = await signInAdminWithPassword({ email, password });
    }

    const admin = await storage.getAdminUserByEmail(String(signIn.response.user.email).toLowerCase());

    if (!admin) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const linkedUser = await getBetterAuthUserByAdminId(admin.id);
    if (!linkedUser || linkedUser.id !== signIn.response.user.id) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    await syncBetterAuthAdminUser(admin);
    applyBetterAuthHeaders(res, signIn.headers);
    attachSessionCompat(req, serializeAdmin(admin));

    res.json({
      success: true,
      admin: serializeAdmin(admin),
    });
  } catch (error: any) {
    if (handleAuthConfigError(res, error)) return;
    res.status(error?.statusCode === 401 ? 401 : 500).json({ message: error?.statusCode ? "Invalid credentials" : "Login failed" });
  }
});

router.post("/logout", async (req, res) => {
  try {
    const signOut = await signOutAdmin(req);
    applyBetterAuthHeaders(res, signOut.headers);

    if (req.session) {
      delete req.session.adminId;
      delete req.session.adminRole;
      delete req.session.adminEmail;
      delete req.session.adminUser;
    }

    res.json({ success: true });
  } catch (error) {
    if (handleAuthConfigError(res, error)) return;
    res.status(500).json({ message: "Logout failed" });
  }
});

router.get("/me", async (req, res) => {
  try {
    const context = await getAdminAuthContext(req);
    if (!context) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    attachAdminAuthContext(req, context);
    res.json(serializeAdmin(context.admin));
  } catch (error) {
    if (handleAuthConfigError(res, error)) return;
    res.status(500).json({ message: "Failed to load admin" });
  }
});

router.get("/optional-me", async (req, res) => {
  try {
    const context = await getAdminAuthContext(req);
    if (!context) return res.json(null);

    attachAdminAuthContext(req, context);
    res.json(serializeAdmin(context.admin));
  } catch (error) {
    if (handleAuthConfigError(res, error)) return;
    res.json(null);
  }
});

router.get("/me/profile", async (req, res) => {
  try {
    const context = await getAdminAuthContext(req);
    if (!context) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    attachAdminAuthContext(req, context);
    const admin = context.admin;
    res.json({
      id: admin.id,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      name: admin.name,
      phone: admin.phone,
      avatarUrl: admin.avatarUrl || null,
      role: admin.role,
    });
  } catch (error) {
    if (handleAuthConfigError(res, error)) return;
    res.status(500).json({ message: "Failed to load profile" });
  }
});

const adminProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().nullable().optional(),
});

router.patch("/me/profile", async (req, res) => {
  try {
    const context = await getAdminAuthContext(req);
    if (!context) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    attachAdminAuthContext(req, context);
    const data = adminProfileSchema.parse(req.body);
    const updateData: any = {};
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.firstName !== undefined || data.lastName !== undefined) {
      const fn = data.firstName ?? context.admin.firstName ?? "";
      const ln = data.lastName ?? context.admin.lastName ?? "";
      updateData.name = [fn, ln].filter(Boolean).join(" ");
    }
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;

    const admin = await storage.updateAdminUser(context.admin.id, updateData);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }
    await syncBetterAuthAdminUser(admin);
    res.json({ success: true, message: "Profile updated" });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    if (handleAuthConfigError(res, error)) return;
    res.status(500).json({ message: "Failed to update profile" });
  }
});

const adminChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

const adminForgotPasswordSchema = z.object({
  email: z.string().trim().email(),
});

const adminResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  newPassword: z.string().min(8, "Password must be at least 8 characters").optional(),
}).refine((data) => data.password || data.newPassword, {
  message: "Password must be at least 8 characters",
  path: ["password"],
});

const adminValidateResetTokenSchema = z.object({
  token: z.string().min(1),
});

const ADMIN_FORGOT_PASSWORD_RESPONSE_FLOOR_MS = 250;
const ADMIN_FORGOT_PASSWORD_RESPONSE_JITTER_MS = 100;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForAdminForgotPasswordResponseFloor(startedAt: number) {
  const targetMs = ADMIN_FORGOT_PASSWORD_RESPONSE_FLOOR_MS +
    Math.floor(Math.random() * ADMIN_FORGOT_PASSWORD_RESPONSE_JITTER_MS);
  const elapsedMs = Date.now() - startedAt;
  if (elapsedMs < targetMs) {
    await delay(targetMs - elapsedMs);
  }
}

async function deliverAdminPasswordReset(email: string) {
  try {
    const admin = await storage.getAdminUserByEmail(email.toLowerCase());
    const linkedUser = admin ? await getBetterAuthUserByAdminId(admin.id) : null;
    if (!admin || !linkedUser) return;

    await syncBetterAuthAdminUser(admin);
    await requestAdminPasswordReset(admin.email);
  } catch (error) {
    console.error("Admin forgot password delivery failed:", error);
  }
}

router.post("/me/change-password", async (req, res) => {
  try {
    const context = await getAdminAuthContext(req);
    if (!context) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    attachAdminAuthContext(req, context);
    const { currentPassword, newPassword } = adminChangePasswordSchema.parse(req.body);
    const result = await changeAdminPassword(req, { currentPassword, newPassword });
    applyBetterAuthHeaders(res, result.headers);
    res.json({ success: true, message: "Password changed successfully" });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    if (handleAuthConfigError(res, error)) return;
    res.status(error?.statusCode === 400 ? 400 : 500).json({
      message: error?.statusCode === 400 ? "Current password is incorrect" : "Failed to change password",
    });
  }
});

router.post("/forgot-password", passwordResetLimiter, async (req, res) => {
  const startedAt = Date.now();

  try {
    const { email } = adminForgotPasswordSchema.parse(req.body);
    assertAdminBetterAuthReady();
    void deliverAdminPasswordReset(email);
    await waitForAdminForgotPasswordResponseFloor(startedAt);

    res.json({
      success: true,
      message: "If an admin account exists with this email, you will receive a password reset link shortly.",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid email address" });
    }
    if (handleAuthConfigError(res, error)) return;
    res.status(500).json({ message: "Failed to process password reset request" });
  }
});

router.get("/validate-reset-token", async (req, res) => {
  try {
    const { token } = adminValidateResetTokenSchema.parse(req.query);
    res.json({ valid: await validateAdminPasswordResetToken(token) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.json({ valid: false });
    }
    if (handleAuthConfigError(res, error)) return;
    res.json({ valid: false });
  }
});

router.post("/reset-password", passwordResetLimiter, async (req, res) => {
  try {
    const parsed = adminResetPasswordSchema.parse(req.body);
    const { admin } = await resetAdminPasswordAndCreateSession(res, {
      token: parsed.token,
      newPassword: parsed.newPassword || parsed.password!,
    });

    res.json({
      success: true,
      message: "Password has been reset successfully",
      admin: serializeAdmin(admin),
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    if (handleAuthConfigError(res, error)) return;
    res.status(error?.statusCode || 500).json({ message: error?.message || "Failed to reset password" });
  }
});

export default router;
