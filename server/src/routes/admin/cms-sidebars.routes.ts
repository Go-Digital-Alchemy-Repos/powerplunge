import { Router } from "express";
import { db } from "../../db";
import { sidebars, sidebarWidgets, insertSidebarSchema, insertSidebarWidgetSchema } from "@shared/schema";
import { eq, asc } from "drizzle-orm";
import { WIDGET_TEMPLATES } from "@shared/widgetTemplates";
import { z } from "zod";

const updateSidebarSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

const updateWidgetSchema = z.object({
  title: z.string().min(1).optional(),
  settings: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const router = Router();

// --- Sidebars CRUD ---

router.get("/", async (_req, res) => {
  try {
    const rows = await db.select().from(sidebars).orderBy(asc(sidebars.name));
    res.json(rows);
  } catch (err) {
    console.error("[SIDEBARS] Error listing sidebars:", err);
    res.status(500).json({ error: "Failed to list sidebars" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const [row] = await db.select().from(sidebars).where(eq(sidebars.id, req.params.id));
    if (!row) return res.status(404).json({ error: "Sidebar not found" });
    const widgets = await db
      .select()
      .from(sidebarWidgets)
      .where(eq(sidebarWidgets.sidebarId, row.id))
      .orderBy(asc(sidebarWidgets.sortOrder));
    res.json({ ...row, widgets });
  } catch (err) {
    console.error("[SIDEBARS] Error getting sidebar:", err);
    res.status(500).json({ error: "Failed to get sidebar" });
  }
});

router.post("/", async (req, res) => {
  try {
    const parsed = insertSidebarSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid data", details: parsed.error.flatten() });
    const [row] = await db.insert(sidebars).values(parsed.data).returning();
    res.status(201).json(row);
  } catch (err: any) {
    if (err?.code === "23505") return res.status(409).json({ error: "A sidebar with that slug already exists" });
    console.error("[SIDEBARS] Error creating sidebar:", err);
    res.status(500).json({ error: "Failed to create sidebar" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const parsed = updateSidebarSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid data", details: parsed.error.flatten() });
    const [row] = await db
      .update(sidebars)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(sidebars.id, req.params.id))
      .returning();
    if (!row) return res.status(404).json({ error: "Sidebar not found" });
    res.json(row);
  } catch (err: any) {
    if (err?.code === "23505") return res.status(409).json({ error: "A sidebar with that slug already exists" });
    console.error("[SIDEBARS] Error updating sidebar:", err);
    res.status(500).json({ error: "Failed to update sidebar" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const [row] = await db.delete(sidebars).where(eq(sidebars.id, req.params.id)).returning();
    if (!row) return res.status(404).json({ error: "Sidebar not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("[SIDEBARS] Error deleting sidebar:", err);
    res.status(500).json({ error: "Failed to delete sidebar" });
  }
});

// --- Widgets within a sidebar ---

router.get("/:sidebarId/widgets", async (req, res) => {
  try {
    const widgets = await db
      .select()
      .from(sidebarWidgets)
      .where(eq(sidebarWidgets.sidebarId, req.params.sidebarId))
      .orderBy(asc(sidebarWidgets.sortOrder));
    res.json(widgets);
  } catch (err) {
    console.error("[SIDEBARS] Error listing widgets:", err);
    res.status(500).json({ error: "Failed to list widgets" });
  }
});

router.post("/:sidebarId/widgets", async (req, res) => {
  try {
    const maxResult = await db
      .select()
      .from(sidebarWidgets)
      .where(eq(sidebarWidgets.sidebarId, req.params.sidebarId))
      .orderBy(asc(sidebarWidgets.sortOrder));
    const nextOrder = maxResult.length > 0 ? Math.max(...maxResult.map((w) => w.sortOrder)) + 1 : 0;

    const data = {
      ...req.body,
      sidebarId: req.params.sidebarId,
      sortOrder: req.body.sortOrder ?? nextOrder,
    };
    const parsed = insertSidebarWidgetSchema.safeParse(data);
    if (!parsed.success) return res.status(400).json({ error: "Invalid data", details: parsed.error.flatten() });
    const [widget] = await db.insert(sidebarWidgets).values(parsed.data).returning();
    res.status(201).json(widget);
  } catch (err) {
    console.error("[SIDEBARS] Error creating widget:", err);
    res.status(500).json({ error: "Failed to create widget" });
  }
});

router.put("/:sidebarId/widgets/:widgetId", async (req, res) => {
  try {
    const parsed = updateWidgetSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid data", details: parsed.error.flatten() });

    const [widget] = await db
      .update(sidebarWidgets)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(sidebarWidgets.id, req.params.widgetId))
      .returning();
    if (!widget) return res.status(404).json({ error: "Widget not found" });
    res.json(widget);
  } catch (err) {
    console.error("[SIDEBARS] Error updating widget:", err);
    res.status(500).json({ error: "Failed to update widget" });
  }
});

router.delete("/:sidebarId/widgets/:widgetId", async (req, res) => {
  try {
    const [widget] = await db
      .delete(sidebarWidgets)
      .where(eq(sidebarWidgets.id, req.params.widgetId))
      .returning();
    if (!widget) return res.status(404).json({ error: "Widget not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("[SIDEBARS] Error deleting widget:", err);
    res.status(500).json({ error: "Failed to delete widget" });
  }
});

router.put("/:sidebarId/widgets-reorder", async (req, res) => {
  try {
    const { widgetIds } = req.body;
    if (!Array.isArray(widgetIds)) return res.status(400).json({ error: "widgetIds must be an array" });

    await Promise.all(
      widgetIds.map((id: string, index: number) =>
        db
          .update(sidebarWidgets)
          .set({ sortOrder: index, updatedAt: new Date() })
          .where(eq(sidebarWidgets.id, id))
      )
    );
    res.json({ success: true });
  } catch (err) {
    console.error("[SIDEBARS] Error reordering widgets:", err);
    res.status(500).json({ error: "Failed to reorder widgets" });
  }
});

// --- Widget Templates ---

router.get("/widget-templates/list", async (_req, res) => {
  res.json(WIDGET_TEMPLATES);
});

export default router;
