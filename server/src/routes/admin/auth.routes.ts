import { Router } from "express";
import bcrypt from "bcryptjs";
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
      admin: { id: admin.id, email: admin.email, name: admin.name } 
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

  res.json({ id: admin.id, email: admin.email, name: admin.name, role: admin.role });
});

export default router;
