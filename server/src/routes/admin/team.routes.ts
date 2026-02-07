import { Router, Request, Response } from "express";
import { storage } from "../../../storage";
import bcrypt from "bcryptjs";

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
      role: a.role 
    })));
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch team members" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, name, role = "admin" } = req.body;

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

    const existingAdmin = await storage.getAdminUserByEmail(email);
    if (existingAdmin) {
      return res.status(400).json({ message: "Team member with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await storage.createAdminUser({
      email,
      password: hashedPassword,
      firstName: resolvedFirstName,
      lastName: resolvedLastName,
      name: fullName,
      role,
    });

    res.json({ 
      id: admin.id, 
      email: admin.email, 
      firstName: admin.firstName,
      lastName: admin.lastName,
      name: admin.name, 
      role: admin.role 
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to add team member" });
  }
});

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, name, password, role } = req.body;
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
    
    if (password) updateData.password = await bcrypt.hash(password, 10);
    if (role) {
      const validRoles = ["admin", "store_manager", "fulfillment"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be admin, store_manager, or fulfillment" });
      }
      const currentAdmin = await storage.getAdminUser(req.params.id);
      if (currentAdmin?.role === "admin" && role !== "admin") {
        const allAdmins = await storage.getAdminUsers();
        const adminCount = allAdmins.filter(a => a.role === "admin").length;
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

    res.json({ 
      id: admin.id, 
      email: admin.email, 
      firstName: admin.firstName,
      lastName: admin.lastName,
      name: admin.name, 
      role: admin.role 
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to update team member" });
  }
});

router.delete("/:id", async (req: any, res: Response) => {
  try {
    if (req.params.id === req.session.adminId) {
      return res.status(400).json({ message: "Cannot delete your own account" });
    }

    const targetAdmin = await storage.getAdminUser(req.params.id);
    if (targetAdmin?.role === "admin") {
      const allAdmins = await storage.getAdminUsers();
      const adminCount = allAdmins.filter(a => a.role === "admin").length;
      if (adminCount <= 1) {
        return res.status(400).json({ message: "Cannot delete the last admin. At least one admin must remain to manage the system." });
      }
    }

    await storage.deleteAdminUser(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete team member" });
  }
});

export default router;
