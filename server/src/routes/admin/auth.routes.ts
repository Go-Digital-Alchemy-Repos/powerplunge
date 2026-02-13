import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { storage } from "../../../storage";
import { authLimiter } from "../../middleware/rate-limiter";

const router = Router();

router.get("/check-setup", async (req, res) => {
  try {
    const admins = await storage.getAdminUsers();
    res.json({ needsSetup: admins.length === 0 });
  } catch (error) {
    res.status(500).json({ message: "Failed to check setup status" });
  }
});

router.post("/setup", authLimiter, async (req: any, res) => {
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

    const hashedPassword = await bcrypt.hash(password, 12);
    const admin = await storage.createAdminUser({
      email,
      password: hashedPassword,
      name,
      role: "super_admin",
    });

    req.session.adminId = admin.id;

    // Admin setup only creates admin session — no customer session token issued.
    // Storefront access requires separate customer login.
    res.status(201).json({ 
      success: true, 
      admin: { id: admin.id, email: admin.email, name: admin.name } 
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to create admin account" });
  }
});

router.post("/login", authLimiter, async (req: any, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const admin = await storage.getAdminUserByEmail(email);
    if (!admin) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(password, admin.password);
    if (!validPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    req.session.adminId = admin.id;

    // Admin login only creates admin session — no customer session token issued.
    // Storefront access requires separate customer login.
    res.json({ 
      success: true, 
      admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role } 
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed" });
  }
});

router.post("/logout", (req: any, res) => {
  req.session.destroy((err: any) => {
    if (err) {
      return res.status(500).json({ message: "Logout failed" });
    }
    res.json({ success: true });
  });
});

router.get("/me", async (req: any, res) => {
  if (!req.session.adminId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const admin = await storage.getAdminUser(req.session.adminId);
  if (!admin) {
    return res.status(401).json({ message: "Admin not found" });
  }

  res.json({ id: admin.id, email: admin.email, name: admin.name, role: admin.role, avatarUrl: admin.avatarUrl || null });
});

router.get("/me/profile", async (req: any, res) => {
  if (!req.session.adminId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  const admin = await storage.getAdminUser(req.session.adminId);
  if (!admin) {
    return res.status(401).json({ message: "Admin not found" });
  }
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
});

const adminProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().nullable().optional(),
});

router.patch("/me/profile", async (req: any, res) => {
  if (!req.session.adminId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  try {
    const data = adminProfileSchema.parse(req.body);
    const updateData: any = {};
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.firstName !== undefined || data.lastName !== undefined) {
      const admin = await storage.getAdminUser(req.session.adminId);
      const fn = data.firstName ?? admin?.firstName ?? "";
      const ln = data.lastName ?? admin?.lastName ?? "";
      updateData.name = [fn, ln].filter(Boolean).join(" ");
    }
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;

    await storage.updateAdminUser(req.session.adminId, updateData);
    res.json({ success: true, message: "Profile updated" });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(500).json({ message: "Failed to update profile" });
  }
});

const adminChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

router.post("/me/change-password", async (req: any, res) => {
  if (!req.session.adminId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  try {
    const { currentPassword, newPassword } = adminChangePasswordSchema.parse(req.body);
    const admin = await storage.getAdminUser(req.session.adminId);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }
    const valid = await bcrypt.compare(currentPassword, admin.password);
    if (!valid) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }
    const hashed = await bcrypt.hash(newPassword, 12);
    await storage.updateAdminUser(admin.id, { password: hashed });
    res.json({ success: true, message: "Password changed successfully" });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(500).json({ message: "Failed to change password" });
  }
});

export default router;
