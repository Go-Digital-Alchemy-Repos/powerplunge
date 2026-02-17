import { Router } from "express";
import { requireAdmin } from "../../middleware";
import { notificationService } from "../../services/notification.service";

const router = Router();

router.get("/", requireAdmin, async (req, res, next) => {
  try {
    const adminId = (req as any).adminId;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await notificationService.listForRecipient("admin", adminId, limit, offset);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get("/unread-count", requireAdmin, async (req, res, next) => {
  try {
    const adminId = (req as any).adminId;
    const count = await notificationService.getUnreadCount("admin", adminId);
    res.json({ count });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/read", requireAdmin, async (req, res, next) => {
  try {
    const adminId = (req as any).adminId;
    const success = await notificationService.markRead(req.params.id, "admin", adminId);
    if (!success) {
      return res.status(404).json({ message: "Notification not found" });
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.patch("/mark-all-read", requireAdmin, async (req, res, next) => {
  try {
    const adminId = (req as any).adminId;
    const count = await notificationService.markAllRead("admin", adminId);
    res.json({ success: true, count });
  } catch (error) {
    next(error);
  }
});

export default router;
