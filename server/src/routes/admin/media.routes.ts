import { Router } from "express";
import { storage } from "../../../storage";
import { z } from "zod";
import type { InsertMediaLibrary } from "@shared/schema";
import { openaiService } from "../../integrations/openai/OpenAIService";

const router = Router();

const updateMediaSchema = z.object({
  title: z.string().optional(),
  altText: z.string().optional(),
  caption: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  folder: z.string().optional(),
});

router.get("/", async (req, res) => {
  try {
    const { folder, mimeType, search, tags } = req.query;
    const filters: { folder?: string; mimeType?: string; search?: string; tags?: string[] } = {};

    if (folder && typeof folder === "string") filters.folder = folder;
    if (mimeType && typeof mimeType === "string") filters.mimeType = mimeType;
    if (search && typeof search === "string") filters.search = search;
    if (tags && typeof tags === "string") filters.tags = tags.split(",");

    const items = await storage.getMediaItems(filters);
    res.json(items);
  } catch (error) {
    console.error("[Media Library] Error fetching items:", error);
    res.status(500).json({ error: "Failed to fetch media items" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const item = await storage.getMediaItem(req.params.id);
    if (!item) {
      return res.status(404).json({ error: "Media item not found" });
    }
    res.json(item);
  } catch (error) {
    console.error("[Media Library] Error fetching item:", error);
    res.status(500).json({ error: "Failed to fetch media item" });
  }
});

router.post("/", async (req, res) => {
  try {
    console.log("[Media Library] Creating item with data:", JSON.stringify(req.body, null, 2));
    const item: InsertMediaLibrary = req.body;
    
    if (!item.filename || !item.storagePath || !item.publicUrl || !item.mimeType || item.fileSize === undefined) {
      console.error("[Media Library] Missing required fields:", {
        filename: !!item.filename,
        storagePath: !!item.storagePath,
        publicUrl: !!item.publicUrl,
        mimeType: !!item.mimeType,
        fileSize: item.fileSize !== undefined,
      });
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    const created = await storage.createMediaItem(item);
    console.log("[Media Library] Created item:", created?.id);
    res.status(201).json(created);
  } catch (error) {
    console.error("[Media Library] Error creating item:", error);
    res.status(500).json({ error: "Failed to create media item" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const updates = updateMediaSchema.parse(req.body);
    const updated = await storage.updateMediaItem(req.params.id, updates);
    if (!updated) {
      return res.status(404).json({ error: "Media item not found" });
    }
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request body", details: error.errors });
    }
    console.error("[Media Library] Error updating item:", error);
    res.status(500).json({ error: "Failed to update media item" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const item = await storage.getMediaItem(req.params.id);
    if (!item) {
      return res.status(404).json({ error: "Media item not found" });
    }

    if (item.usageCount > 0) {
      return res.status(400).json({
        error: "Media item is in use",
        usageCount: item.usageCount,
        usedIn: item.usedIn,
      });
    }

    await storage.deleteMediaItem(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error("[Media Library] Error deleting item:", error);
    res.status(500).json({ error: "Failed to delete media item" });
  }
});

router.delete("/:id/force", async (req, res) => {
  try {
    const item = await storage.getMediaItem(req.params.id);
    if (!item) {
      return res.status(404).json({ error: "Media item not found" });
    }

    await storage.deleteMediaItem(req.params.id);
    res.json({ success: true, wasInUse: item.usageCount > 0 });
  } catch (error) {
    console.error("[Media Library] Error force deleting item:", error);
    res.status(500).json({ error: "Failed to delete media item" });
  }
});

router.get("/folders/list", async (req, res) => {
  try {
    const items = await storage.getMediaItems();
    const folderSet = new Set<string>();
    items.forEach(item => {
      if (item.folder) folderSet.add(item.folder);
    });
    res.json(Array.from(folderSet));
  } catch (error) {
    console.error("[Media Library] Error fetching folders:", error);
    res.status(500).json({ error: "Failed to fetch folders" });
  }
});

router.get("/stats/summary", async (req, res) => {
  try {
    const items = await storage.getMediaItems();
    const totalSize = items.reduce((sum, item) => sum + (item.fileSize || 0), 0);
    const byMimeType = items.reduce((acc, item) => {
      const type = item.mimeType.split("/")[0];
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      totalItems: items.length,
      totalSize,
      totalSizeFormatted: formatBytes(totalSize),
      byMimeType,
    });
  } catch (error) {
    console.error("[Media Library] Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

router.post("/:id/generate-seo", async (req, res) => {
  try {
    const isConfigured = await openaiService.isConfigured();
    if (!isConfigured) {
      return res.status(400).json({
        error: "OpenAI not configured",
        message: "Please configure OpenAI API key in Settings > Integrations to use SEO recommendations.",
      });
    }

    const item = await storage.getMediaItem(req.params.id);
    if (!item) {
      return res.status(404).json({ error: "Media item not found" });
    }

    const context = req.body || {};
    const recommendations = await openaiService.generateSeoRecommendations(
      item.filename,
      item.mimeType,
      context
    );

    if (!recommendations) {
      return res.status(500).json({ error: "Failed to generate SEO recommendations" });
    }

    res.json(recommendations);
  } catch (error) {
    console.error("[Media Library] Error generating SEO:", error);
    res.status(500).json({ error: "Failed to generate SEO recommendations" });
  }
});

router.get("/openai/status", async (req, res) => {
  try {
    const isConfigured = await openaiService.isConfigured();
    res.json({ configured: isConfigured });
  } catch (error) {
    res.status(500).json({ error: "Failed to check OpenAI status" });
  }
});

export default router;
