import { Router, Request, Response } from "express";
import { revenueMonitoringService } from "../../services/revenue-monitoring.service";
import { z } from "zod";

const router = Router();

const updateThresholdSchema = z.object({
  thresholdValue: z.number().min(0).optional(),
  comparisonPeriod: z.enum(["24h", "7d", "30d"]).optional(),
  enabled: z.boolean().optional(),
  emailAlertEnabled: z.boolean().optional(),
});

router.get("/admin/active", async (req: Request, res: Response) => {
  try {
    const alerts = await revenueMonitoringService.getActiveAlerts();
    res.json(alerts);
  } catch (error: any) {
    console.error("Error fetching active alerts:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/admin/all", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const alerts = await revenueMonitoringService.getAllAlerts(limit);
    res.json(alerts);
  } catch (error: any) {
    console.error("Error fetching all alerts:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/admin/stats", async (req: Request, res: Response) => {
  try {
    const stats = await revenueMonitoringService.getAlertStats();
    res.json(stats);
  } catch (error: any) {
    console.error("Error fetching alert stats:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/admin/thresholds", async (req: Request, res: Response) => {
  try {
    await revenueMonitoringService.initializeDefaultThresholds();
    const thresholds = await revenueMonitoringService.getThresholds();
    res.json(thresholds);
  } catch (error: any) {
    console.error("Error fetching thresholds:", error);
    res.status(500).json({ error: error.message });
  }
});

router.patch("/admin/thresholds/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parseResult = updateThresholdSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: "Invalid threshold update", 
        details: parseResult.error.flatten() 
      });
    }
    const threshold = await revenueMonitoringService.updateThreshold(id, parseResult.data);
    if (!threshold) {
      return res.status(404).json({ error: "Threshold not found" });
    }
    res.json(threshold);
  } catch (error: any) {
    console.error("Error updating threshold:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/admin/:id/acknowledge", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = (req.session as any)?.adminId;
    if (!adminId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const alert = await revenueMonitoringService.acknowledgeAlert(id, adminId);
    if (!alert) {
      return res.status(404).json({ error: "Alert not found" });
    }
    res.json(alert);
  } catch (error: any) {
    console.error("Error acknowledging alert:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/admin/:id/resolve", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const alert = await revenueMonitoringService.resolveAlert(id);
    if (!alert) {
      return res.status(404).json({ error: "Alert not found" });
    }
    res.json(alert);
  } catch (error: any) {
    console.error("Error resolving alert:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/admin/run-checks", async (req: Request, res: Response) => {
  try {
    const result = await revenueMonitoringService.runAllChecks();
    res.json({
      message: `Checked all thresholds. ${result.alerts.length} new alert(s) created.`,
      alerts: result.alerts,
      metrics: result.metrics,
    });
  } catch (error: any) {
    console.error("Error running checks:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/admin/webhook-failures", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const failures = await revenueMonitoringService.getWebhookFailures(limit);
    res.json(failures);
  } catch (error: any) {
    console.error("Error fetching webhook failures:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
