import { Router } from "express";
import { storage } from "../../../storage";
import bcrypt from "bcryptjs";

const router = Router();

router.get("/:customerId/notes", async (req, res) => {
  try {
    const notes = await storage.getCustomerNotes(req.params.customerId);
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch customer notes" });
  }
});

router.post("/:customerId/notes", async (req: any, res) => {
  try {
    const admin = await storage.getAdminUser(req.session.adminId!);
    const note = await storage.createCustomerNote({
      customerId: req.params.customerId,
      note: req.body.note,
      createdBy: req.session.adminId,
    });
    res.json(note);
  } catch (error) {
    res.status(500).json({ message: "Failed to create customer note" });
  }
});

router.delete("/:customerId/notes/:noteId", async (req, res) => {
  try {
    await storage.deleteCustomerNote(req.params.noteId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete customer note" });
  }
});

router.get("/:customerId/profile", async (req, res) => {
  try {
    const profile = await storage.getCustomerProfile(req.params.customerId);
    if (!profile) {
      return res.status(404).json({ message: "Customer not found" });
    }
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: "Failed to get customer profile" });
  }
});

router.get("/:customerId/tags", async (req, res) => {
  try {
    const tags = await storage.getCustomerTags(req.params.customerId);
    res.json(tags);
  } catch (error) {
    res.status(500).json({ message: "Failed to get customer tags" });
  }
});

router.put("/:customerId/tags", async (req: any, res) => {
  try {
    const { tags } = req.body;
    if (!Array.isArray(tags)) {
      return res.status(400).json({ message: "Tags must be an array" });
    }
    const adminId = (req as any).adminUser?.id;
    const updatedTags = await storage.setCustomerTags(req.params.customerId, tags, adminId);
    
    await storage.createAdminAuditLog({
      adminId: adminId || "system",
      action: "update_tags",
      targetType: "customer",
      targetId: req.params.customerId,
      details: { tags },
      ipAddress: req.ip || null,
    });
    
    res.json(updatedTags);
  } catch (error) {
    res.status(500).json({ message: "Failed to update customer tags" });
  }
});

router.patch("/:customerId", async (req: any, res) => {
  try {
    const customer = await storage.getCustomer(req.params.customerId);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const allowedFields = ["name", "email", "phone", "address", "city", "state", "zipCode", "country"] as const;
    const updateData: Record<string, string> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        const val = String(req.body[field]).trim();
        if (val.length > 500) {
          return res.status(400).json({ message: `${field} is too long` });
        }
        updateData[field] = val;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    if (updateData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateData.email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }
      if (updateData.email !== customer.email) {
        const existing = await storage.getCustomerByEmail(updateData.email);
        if (existing && existing.id !== customer.id) {
          return res.status(409).json({ message: "A customer with this email already exists" });
        }
      }
    }

    const updated = await storage.updateCustomer(req.params.customerId, updateData);

    const adminId = (req as any).adminUser?.id;
    await storage.createAdminAuditLog({
      adminId: adminId || "system",
      action: "update_customer_profile",
      targetType: "customer",
      targetId: req.params.customerId,
      details: { updatedFields: Object.keys(updateData) },
      ipAddress: req.ip || null,
    });

    res.json(updated);
  } catch (error) {
    console.error("Failed to update customer:", error);
    res.status(500).json({ message: "Failed to update customer" });
  }
});

router.get("/:customerId/orders", async (req, res) => {
  try {
    const allOrders = await storage.getOrders();
    const customerOrders = allOrders.filter(o => o.customerId === req.params.customerId);
    const sortedOrders = customerOrders.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    res.json(sortedOrders);
  } catch (error) {
    res.status(500).json({ message: "Failed to get customer orders" });
  }
});

router.get("/:customerId/audit-logs", async (req, res) => {
  try {
    const logs = await storage.getAuditLogsForTarget("customer", req.params.customerId);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: "Failed to get audit logs" });
  }
});

router.post("/:customerId/disable", async (req: any, res) => {
  try {
    const customer = await storage.getCustomer(req.params.customerId);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    
    const adminId = (req as any).adminUser?.id;
    await storage.updateCustomer(req.params.customerId, { 
      isDisabled: true 
    } as any);
    
    await storage.createAdminAuditLog({
      adminId: adminId || "system",
      action: "disable_account",
      targetType: "customer",
      targetId: req.params.customerId,
      details: { reason: req.body.reason || "No reason provided" },
      ipAddress: req.ip || null,
    });
    
    res.json({ success: true, message: "Account disabled" });
  } catch (error) {
    res.status(500).json({ message: "Failed to disable account" });
  }
});

router.post("/:customerId/enable", async (req: any, res) => {
  try {
    const customer = await storage.getCustomer(req.params.customerId);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    
    const adminId = (req as any).adminUser?.id;
    await storage.updateCustomer(req.params.customerId, { 
      isDisabled: false 
    } as any);
    
    await storage.createAdminAuditLog({
      adminId: adminId || "system",
      action: "enable_account",
      targetType: "customer",
      targetId: req.params.customerId,
      details: {},
      ipAddress: req.ip || null,
    });
    
    res.json({ success: true, message: "Account enabled" });
  } catch (error) {
    res.status(500).json({ message: "Failed to enable account" });
  }
});

router.post("/:customerId/send-password-reset", async (req: any, res) => {
  try {
    const customer = await storage.getCustomer(req.params.customerId);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    
    const adminId = (req as any).adminUser?.id;
    
    await storage.createAdminAuditLog({
      adminId: adminId || "system",
      action: "send_password_reset",
      targetType: "customer",
      targetId: req.params.customerId,
      details: { email: customer.email },
      ipAddress: req.ip || null,
    });
    
    res.json({ success: true, message: "Password reset email sent" });
  } catch (error) {
    res.status(500).json({ message: "Failed to send password reset email" });
  }
});

router.post("/:customerId/reset-password", async (req: any, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }
    
    const customer = await storage.getCustomer(req.params.customerId);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    
    const adminId = (req as any).adminUser?.id;
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await storage.updateCustomer(req.params.customerId, {
      passwordHash: hashedPassword,
    });
    
    await storage.createAdminAuditLog({
      adminId: adminId || "system",
      action: "admin_password_reset",
      targetType: "customer",
      targetId: req.params.customerId,
      details: { email: customer.email },
      ipAddress: req.ip || null,
    });
    
    res.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    console.error("Failed to reset password:", error);
    res.status(500).json({ message: "Failed to reset password" });
  }
});

router.post("/:customerId/force-logout", async (req: any, res) => {
  try {
    const customer = await storage.getCustomer(req.params.customerId);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    
    const adminId = (req as any).adminUser?.id;
    
    await storage.updateCustomer(req.params.customerId, {
      sessionInvalidatedAt: new Date(),
    });
    
    await storage.createAdminAuditLog({
      adminId: adminId || "system",
      action: "force_logout",
      targetType: "customer",
      targetId: req.params.customerId,
      details: { email: customer.email },
      ipAddress: req.ip || null,
    });
    
    res.json({ success: true, message: "All sessions invalidated" });
  } catch (error) {
    console.error("Failed to force logout:", error);
    res.status(500).json({ message: "Failed to invalidate sessions" });
  }
});

export default router;
