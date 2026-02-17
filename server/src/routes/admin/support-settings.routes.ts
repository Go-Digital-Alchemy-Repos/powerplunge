import { Router } from "express";
import { z } from "zod";
import { db } from "../../../db";
import { siteSettings } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const settings = await db.query.siteSettings.findFirst({
      where: eq(siteSettings.id, "main"),
    });

    res.json({
      supportNotifyEmails: settings?.supportNotifyEmails || "",
      supportNotifyOnNew: settings?.supportNotifyOnNew ?? true,
      supportNotifyOnReply: settings?.supportNotifyOnReply ?? true,
      supportAutoReplyEnabled: settings?.supportAutoReplyEnabled ?? true,
      supportAutoReplyMessage: settings?.supportAutoReplyMessage || "",
      supportFromEmail: settings?.supportFromEmail || "",
      supportSlaHours: settings?.supportSlaHours ?? 24,
      supportBusinessHours: settings?.supportBusinessHours || "",
      supportEmail: settings?.supportEmail || "",
      supportPhone: settings?.supportPhone || "",
      supportInboundRepliesEnabled: settings?.supportInboundRepliesEnabled ?? false,
    });
  } catch (error) {
    next(error);
  }
});

const updateSchema = z.object({
  supportNotifyEmails: z.string().max(500).optional(),
  supportNotifyOnNew: z.boolean().optional(),
  supportNotifyOnReply: z.boolean().optional(),
  supportAutoReplyEnabled: z.boolean().optional(),
  supportAutoReplyMessage: z.string().max(2000).optional(),
  supportFromEmail: z.string().max(200).optional(),
  supportSlaHours: z.number().int().min(1).max(168).optional(),
  supportBusinessHours: z.string().max(500).optional(),
  supportEmail: z.string().max(200).optional(),
  supportPhone: z.string().max(50).optional(),
  supportInboundRepliesEnabled: z.boolean().optional(),
});

router.put("/", async (req, res, next) => {
  try {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0].message });
    }

    const updateData: Record<string, any> = {};
    const d = parsed.data;

    if (d.supportNotifyEmails !== undefined) updateData.supportNotifyEmails = d.supportNotifyEmails;
    if (d.supportNotifyOnNew !== undefined) updateData.supportNotifyOnNew = d.supportNotifyOnNew;
    if (d.supportNotifyOnReply !== undefined) updateData.supportNotifyOnReply = d.supportNotifyOnReply;
    if (d.supportAutoReplyEnabled !== undefined) updateData.supportAutoReplyEnabled = d.supportAutoReplyEnabled;
    if (d.supportAutoReplyMessage !== undefined) updateData.supportAutoReplyMessage = d.supportAutoReplyMessage;
    if (d.supportFromEmail !== undefined) updateData.supportFromEmail = d.supportFromEmail;
    if (d.supportSlaHours !== undefined) updateData.supportSlaHours = d.supportSlaHours;
    if (d.supportBusinessHours !== undefined) updateData.supportBusinessHours = d.supportBusinessHours;
    if (d.supportEmail !== undefined) updateData.supportEmail = d.supportEmail;
    if (d.supportPhone !== undefined) updateData.supportPhone = d.supportPhone;
    if (d.supportInboundRepliesEnabled !== undefined) updateData.supportInboundRepliesEnabled = d.supportInboundRepliesEnabled;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    updateData.updatedAt = new Date();

    await db.update(siteSettings).set(updateData).where(eq(siteSettings.id, "main"));

    res.json({ success: true, message: "Support settings updated" });
  } catch (error) {
    next(error);
  }
});

export default router;
