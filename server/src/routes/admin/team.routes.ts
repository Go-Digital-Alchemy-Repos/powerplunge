import { Router, Request, Response } from "express";
import { storage } from "../../../storage";
import {
  BETTER_AUTH_LEGACY_PASSWORD_PLACEHOLDER,
  deleteBetterAuthAdminUser,
  getBetterAuthUserByEmail,
  syncBetterAuthAdminUser,
} from "../../auth/adminBetterAuth";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const admins = await storage.getAdminUsers();
    res.json(admins.map(a => ({ 
      id: a.id, 
      email: a.email, 
      firstName: a.firstName || "",
      lastName: a.lastName || "",
      name: a.name, 
      phone: a.phone || "",
      role: a.role 
    })));
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch team members" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  let createdAdminId: string | null = null;

  try {
    const { email, password, firstName, lastName, name, phone, role = "admin" } = req.body;
    const normalizedEmail = String(email || "").toLowerCase();

    const resolvedFirstName = firstName || (name ? name.split(" ")[0] : "");
    const resolvedLastName = lastName || (name ? name.split(" ").slice(1).join(" ") : "");
    const fullName = `${resolvedFirstName} ${resolvedLastName}`.trim();

    if (!email || !password || !fullName) {
      return res.status(400).json({ message: "Email, password, and name required" });
    }

    const validRoles = ["admin", "store_manager", "fulfillment"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role. Must be admin, store_manager, or fulfillment" });
    }

    const existingAdmin = await storage.getAdminUserByEmail(normalizedEmail);
    if (existingAdmin) {
      return res.status(400).json({ message: "Team member with this email already exists" });
    }

    const existingAuthUser = await getBetterAuthUserByEmail(normalizedEmail);
    if (existingAuthUser) {
      return res.status(400).json({ message: "A user with this email already exists" });
    }

    const admin = await storage.createAdminUser({
      email: normalizedEmail,
      password: BETTER_AUTH_LEGACY_PASSWORD_PLACEHOLDER,
      firstName: resolvedFirstName,
      lastName: resolvedLastName,
      name: fullName,
      phone: phone || "",
      role,
    });
    createdAdminId = admin.id;

    await syncBetterAuthAdminUser(admin, password);

    res.json({ 
      id: admin.id, 
      email: admin.email, 
      firstName: admin.firstName,
      lastName: admin.lastName,
      name: admin.name, 
      phone: admin.phone || "",
      role: admin.role 
    });
  } catch (error) {
    if (createdAdminId) {
      await storage.deleteAdminUser(createdAdminId).catch(() => {});
    }
    res.status(500).json({ message: "Failed to add team member" });
  }
});

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, name, email, phone, password, role } = req.body;
    const updateData: any = {};
    
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (firstName !== undefined || lastName !== undefined) {
      const currentAdmin = await storage.getAdminUser(req.params.id);
      const newFirstName = firstName ?? currentAdmin?.firstName ?? "";
      const newLastName = lastName ?? currentAdmin?.lastName ?? "";
      updateData.name = `${newFirstName} ${newLastName}`.trim();
    } else if (name) {
      updateData.name = name;
      updateData.firstName = name.split(" ")[0];
      updateData.lastName = name.split(" ").slice(1).join(" ");
    }

    if (email !== undefined) {
      const currentAdmin = await storage.getAdminUser(req.params.id);
      const normalizedEmail = String(email).toLowerCase();
      if (normalizedEmail !== currentAdmin?.email) {
        const existingAdmin = await storage.getAdminUserByEmail(normalizedEmail);
        if (existingAdmin) {
          return res.status(400).json({ message: "Another team member already uses this email" });
        }
        const existingAuthUser = await getBetterAuthUserByEmail(normalizedEmail);
        if (existingAuthUser && existingAuthUser.adminUserId !== req.params.id) {
          return res.status(400).json({ message: "Another user already uses this email" });
        }
      }
      updateData.email = normalizedEmail;
    }

    if (phone !== undefined) updateData.phone = phone;
    
    if (password) updateData.password = BETTER_AUTH_LEGACY_PASSWORD_PLACEHOLDER;
    if (role) {
      const currentAdmin = await storage.getAdminUser(req.params.id);
      if (currentAdmin?.role === "super_admin") {
        if (role !== "super_admin") {
          return res.status(403).json({ message: "Cannot change the role of the Super Admin account." });
        }
      } else {
        const validRoles = ["admin", "store_manager", "fulfillment"];
        if (!validRoles.includes(role)) {
          return res.status(400).json({ message: "Invalid role. Must be admin, store_manager, or fulfillment" });
        }
      }
      if (currentAdmin?.role === "admin" && role !== "admin") {
        const allAdmins = await storage.getAdminUsers();
        const adminCount = allAdmins.filter(a => a.role === "admin" || a.role === "super_admin").length;
        if (adminCount <= 1) {
          return res.status(400).json({ message: "Cannot change the role of the last admin. At least one admin must remain." });
        }
      }
      updateData.role = role;
    }

    const admin = await storage.updateAdminUser(req.params.id, updateData);
    if (!admin) {
      return res.status(404).json({ message: "Team member not found" });
    }

    await syncBetterAuthAdminUser(admin, password || undefined);

    res.json({ 
      id: admin.id, 
      email: admin.email, 
      firstName: admin.firstName,
      lastName: admin.lastName,
      name: admin.name, 
      phone: admin.phone || "",
      role: admin.role 
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to update team member" });
  }
});

router.delete("/:id", async (req: any, res: Response) => {
  try {
    if (req.params.id === req.adminUser?.id || req.params.id === req.adminId) {
      return res.status(400).json({ message: "Cannot delete your own account" });
    }

    const targetAdmin = await storage.getAdminUser(req.params.id);
    if (targetAdmin?.role === "super_admin") {
      return res.status(403).json({ message: "Cannot delete the Super Admin account." });
    }
    if (targetAdmin?.role === "admin") {
      const allAdmins = await storage.getAdminUsers();
      const adminCount = allAdmins.filter(a => a.role === "admin" || a.role === "super_admin").length;
      if (adminCount <= 1) {
        return res.status(400).json({ message: "Cannot delete the last admin. At least one admin must remain to manage the system." });
      }
    }

    await storage.deleteAdminUser(req.params.id);
    await deleteBetterAuthAdminUser(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete team member" });
  }
});

export default router;
