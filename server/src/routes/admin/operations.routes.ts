import { Router } from "express";
import { storage } from "../../../storage";

const router = Router();

// ==================== SEED ROUTES ====================

router.post("/seed", async (req, res) => {
  try {
    const { seedDatabase } = await import("../../../seed");
    await seedDatabase();
    res.json({ success: true, message: "Database seeded successfully" });
  } catch (error) {
    console.error("Seed error:", error);
    res.status(500).json({ message: "Failed to seed database" });
  }
});

// ==================== AI CONTENT GENERATION ====================

router.post("/ai/generate-content", async (req, res) => {
  try {
    const { fieldType, promptStyle, context, pageTitle, blockType } = req.body;
    
    if (!fieldType || !promptStyle) {
      return res.status(400).json({ message: "fieldType and promptStyle are required" });
    }

    const { openaiService } = await import("../../integrations/openai/OpenAIService");
    const openai = openaiService;

    const systemPrompt = `You are a marketing copywriter for Power Plunge, a premium cold plunge/ice bath company. 
Your tone is professional, confident, and health-focused. You emphasize benefits like recovery, wellness, and vitality.
Write content that is concise, compelling, and conversion-focused.
Respond with ONLY the generated text - no quotes, no explanations, no formatting.`;

    let contextInfo = '';
    if (pageTitle) contextInfo += `Page: ${pageTitle}. `;
    if (blockType) contextInfo += `Block type: ${blockType}. `;
    if (context) contextInfo += `Additional context: ${context}. `;

    const userPrompt = `${promptStyle}. ${contextInfo}Keep it short and impactful.`;

    const result = await openai.generateText(userPrompt, {
      systemPrompt,
      maxTokens: 150,
      temperature: 0.7,
    });

    if (!result) {
      return res.status(500).json({ message: "AI generation returned no content" });
    }

    let content = result.trim();
    if (content.startsWith('"') && content.endsWith('"')) {
      content = content.slice(1, -1);
    }

    res.json({ content });
  } catch (error: any) {
    console.error("AI content generation error:", error);
    res.status(500).json({ message: error.message || "Failed to generate content" });
  }
});

// ==================== EMAIL EVENTS ====================

router.get("/email-events", async (req, res) => {
  try {
    const orderId = req.query.orderId as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const events = await storage.getEmailEvents(orderId, limit);
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch email events" });
  }
});

// ==================== REFUNDS ====================

router.get("/refunds", async (req, res) => {
  try {
    const refunds = await storage.getRefunds();
    res.json(refunds);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch refunds" });
  }
});

router.patch("/refunds/:id", async (req: any, res) => {
  try {
    const { status, reason, reasonCode } = req.body;
    const updateData: any = {};

    if (status) {
      const validStatuses = ["pending", "processed", "rejected", "failed"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`, code: "INVALID_STATUS" });
      }
      updateData.status = status;
    }
    if (reason !== undefined) updateData.reason = reason;
    if (reasonCode !== undefined) updateData.reasonCode = reasonCode;
    if (status === "processed") updateData.processedAt = new Date();

    const refund = await storage.updateRefund(req.params.id, updateData);
    if (!refund) {
      return res.status(404).json({ message: "Refund not found" });
    }

    const adminEmail = req.adminUser?.email || req.session?.adminEmail || "admin";
    await storage.createAuditLog({
      actor: adminEmail,
      action: "refund.updated",
      entityType: "refund",
      entityId: refund.id,
      metadata: { 
        orderId: refund.orderId, 
        newStatus: refund.status,
        stripeRefundId: refund.stripeRefundId,
        changes: req.body,
      },
    });

    const { updateOrderPaymentStatus } = await import("../../services/refund.service");
    await updateOrderPaymentStatus(refund.orderId);

    res.json(refund);
  } catch (error) {
    res.status(500).json({ message: "Failed to update refund" });
  }
});

// ==================== EMAIL TEMPLATES ====================

router.get("/email-templates", async (req, res) => {
  try {
    const templates = await storage.getEmailTemplates();
    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch email templates" });
  }
});

router.post("/email-templates", async (req, res) => {
  try {
    const template = await storage.createEmailTemplate(req.body);
    res.json(template);
  } catch (error) {
    res.status(500).json({ message: "Failed to create email template" });
  }
});

router.patch("/email-templates/:id", async (req, res) => {
  try {
    const template = await storage.updateEmailTemplate(req.params.id, req.body);
    if (!template) {
      return res.status(404).json({ message: "Email template not found" });
    }
    res.json(template);
  } catch (error) {
    res.status(500).json({ message: "Failed to update email template" });
  }
});

// ==================== INVENTORY ====================

router.get("/inventory", async (req, res) => {
  try {
    const inventory = await storage.getAllInventory();
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch inventory" });
  }
});

router.get("/inventory/:productId", async (req, res) => {
  try {
    const inventory = await storage.getInventory(req.params.productId);
    res.json(inventory || { quantity: 0, trackInventory: false });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch inventory" });
  }
});

router.patch("/inventory/:productId", async (req, res) => {
  try {
    let inventory = await storage.getInventory(req.params.productId);
    if (!inventory) {
      inventory = await storage.createInventory({
        productId: req.params.productId,
        ...req.body,
      });
    } else {
      inventory = await storage.updateInventory(req.params.productId, req.body);
    }
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ message: "Failed to update inventory" });
  }
});

// ==================== AUDIT LOGS ====================

router.get("/audit-logs", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const logs = await storage.getAuditLogs(limit);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch audit logs" });
  }
});

// ==================== BACKGROUND JOBS ====================

router.get("/jobs/status", async (req, res) => {
  try {
    const { jobRunner } = await import("../../services/job-runner");
    const status = await jobRunner.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch job status" });
  }
});

router.post("/jobs/:jobName/run", async (req: any, res) => {
  try {
    const { jobRunner } = await import("../../services/job-runner");
    const force = req.query.force === "true";
    const result = await jobRunner.runNow(req.params.jobName, force);

    if (result.success) {
      await storage.createAuditLog({
        actor: req.session?.adminEmail || "admin",
        action: "job.manual_run",
        entityType: "job",
        entityId: req.params.jobName,
        metadata: { result: result.data },
      });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to run job" });
  }
});

// ==================== SEPARATE ROUTERS ====================

export const refundOrderRoutes = Router();

refundOrderRoutes.post("/:orderId/refunds", async (req: any, res) => {
  try {
    const { amount, reason, reasonCode, type, source } = req.body;
    const adminEmail = req.adminUser?.email || req.session?.adminEmail || "admin";

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ message: "Amount must be a positive number (in cents)", code: "INVALID_AMOUNT" });
    }

    if (!reasonCode) {
      return res.status(400).json({ message: "Reason code is required", code: "MISSING_REASON_CODE" });
    }

    const { createStripeRefund, createManualRefund, RefundError } = await import("../../services/refund.service");

    let refund;
    if (source === "manual") {
      refund = await createManualRefund({
        orderId: req.params.orderId,
        amount,
        reason,
        reasonCode,
        type: type || "full",
        adminEmail,
      });
    } else {
      refund = await createStripeRefund({
        orderId: req.params.orderId,
        amount,
        reason,
        reasonCode,
        type: type || "full",
        adminEmail,
      });
    }
    
    res.json(refund);
  } catch (error: any) {
    if (error.name === "RefundError") {
      return res.status(error.statusCode).json({ message: error.message, code: error.code });
    }
    console.error("Failed to create refund:", error);
    res.status(500).json({ message: "Failed to create refund", code: "INTERNAL_ERROR" });
  }
});

export const dashboardRoutes = Router();

dashboardRoutes.get("/", async (req, res) => {
  try {
    const stats = await storage.getDashboardStats();
    const affiliates = await storage.getAffiliates();
    const pendingPayouts = (await storage.getAffiliatePayouts()).filter(p => p.status === "pending");
    
    res.json({
      ...stats,
      totalAffiliates: affiliates.length,
      activeAffiliates: affiliates.filter(a => a.status === "active").length,
      pendingPayouts: pendingPayouts.length,
      pendingPayoutAmount: pendingPayouts.reduce((sum, p) => sum + p.amount, 0),
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ message: "Failed to fetch dashboard stats" });
  }
});

export default router;
