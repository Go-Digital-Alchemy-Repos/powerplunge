import { Router } from "express";
import { sitePresetsService } from "../../services/cmsV2.sitePresets.service";
import { sitePresetApplyService } from "../../services/cmsV2.sitePresets.apply.service";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const presets = await sitePresetsService.list();
    res.json(presets);
  } catch {
    res.status(500).json({ error: "Failed to fetch site presets" });
  }
});

router.get("/apply-history", async (_req, res) => {
  try {
    const history = await sitePresetApplyService.getHistory();
    res.json(history);
  } catch {
    res.status(500).json({ error: "Failed to fetch apply history" });
  }
});

router.get("/apply-history/:id", async (req, res) => {
  try {
    const entry = await sitePresetApplyService.getHistoryEntry(req.params.id);
    if (!entry) return res.status(404).json({ error: "History entry not found" });
    res.json(entry);
  } catch {
    res.status(500).json({ error: "Failed to fetch history entry" });
  }
});

router.post("/seed", async (req, res) => {
  try {
    const result = await sitePresetsService.seed();
    res.json(result);
  } catch {
    res.status(500).json({ error: "Failed to seed presets" });
  }
});

router.post("/import", async (req, res) => {
  try {
    const adminEmail = (req as any).adminUser?.email || "unknown";
    const result = await sitePresetsService.importPreset(req.body, adminEmail);
    if (result.error) return res.status(400).json({ error: result.error });
    res.status(201).json(result.preset);
  } catch {
    res.status(500).json({ error: "Failed to import preset" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const preset = await sitePresetsService.getById(req.params.id);
    if (!preset) return res.status(404).json({ error: "Site preset not found" });
    res.json(preset);
  } catch {
    res.status(500).json({ error: "Failed to fetch site preset" });
  }
});

router.get("/:id/export", async (req, res) => {
  try {
    const result = await sitePresetsService.exportPreset(req.params.id);
    if ("error" in result) return res.status(404).json({ error: result.error });
    res.json(result);
  } catch {
    res.status(500).json({ error: "Failed to export preset" });
  }
});

router.post("/", async (req, res) => {
  try {
    const adminEmail = (req as any).adminUser?.email || "unknown";
    const result = await sitePresetsService.create(req.body, adminEmail);
    if (result.error) return res.status(400).json({ error: result.error, details: result.details });
    res.status(201).json(result.preset);
  } catch {
    res.status(500).json({ error: "Failed to create site preset" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const adminEmail = (req as any).adminUser?.email || "unknown";
    const result = await sitePresetsService.update(req.params.id, req.body, adminEmail);
    if (result.error) {
      const status = result.error === "Site preset not found" ? 404 : 400;
      return res.status(status).json({ error: result.error, details: result.details });
    }
    res.json(result.preset);
  } catch {
    res.status(500).json({ error: "Failed to update site preset" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const adminEmail = (req as any).adminUser?.email || "unknown";
    const result = await sitePresetsService.remove(req.params.id, adminEmail);
    if (!result.success) return res.status(404).json({ error: result.error });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete site preset" });
  }
});

router.post("/:id/duplicate", async (req, res) => {
  try {
    const adminEmail = (req as any).adminUser?.email || "unknown";
    const result = await sitePresetsService.duplicate(req.params.id, adminEmail);
    if (result.error) return res.status(404).json({ error: result.error });
    res.status(201).json(result.preset);
  } catch {
    res.status(500).json({ error: "Failed to duplicate site preset" });
  }
});

router.post("/:id/preview", async (req, res) => {
  try {
    const result = await sitePresetApplyService.preview(req.params.id);
    if ("error" in result) return res.status(404).json({ error: result.error });
    res.json(result);
  } catch {
    res.status(500).json({ error: "Failed to generate preview" });
  }
});

router.post("/:id/activate", async (req, res) => {
  try {
    const adminEmail = (req as any).adminUser?.email || "unknown";
    const notes = req.body?.notes;
    const result = await sitePresetApplyService.activate(req.params.id, adminEmail, notes);
    if ("error" in result) return res.status(404).json({ error: result.error });
    res.json(result);
  } catch {
    res.status(500).json({ error: "Failed to activate preset" });
  }
});

router.post("/rollback", async (req, res) => {
  try {
    const adminEmail = (req as any).adminUser?.email || "unknown";
    const result = await sitePresetApplyService.rollback(adminEmail);
    if ("error" in result) return res.status(404).json({ error: result.error });
    res.json(result);
  } catch {
    res.status(500).json({ error: "Failed to rollback" });
  }
});

export default router;
