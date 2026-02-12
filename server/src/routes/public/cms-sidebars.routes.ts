import { Router } from "express";
import { db } from "../../db";
import { sidebars, sidebarWidgets } from "@shared/schema";
import { eq, asc, and } from "drizzle-orm";

const router = Router();

router.get("/:id", async (req, res) => {
  try {
    const [row] = await db
      .select()
      .from(sidebars)
      .where(and(eq(sidebars.id, req.params.id), eq(sidebars.isActive, true)));
    if (!row) return res.status(404).json({ error: "Sidebar not found" });

    const widgets = await db
      .select()
      .from(sidebarWidgets)
      .where(
        and(
          eq(sidebarWidgets.sidebarId, row.id),
          eq(sidebarWidgets.isActive, true)
        )
      )
      .orderBy(asc(sidebarWidgets.sortOrder));

    res.json({ ...row, widgets });
  } catch (err) {
    console.error("[PUBLIC-SIDEBARS] Error getting sidebar:", err);
    res.status(500).json({ error: "Failed to get sidebar" });
  }
});

export default router;
