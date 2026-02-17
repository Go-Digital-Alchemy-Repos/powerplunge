import { Router } from "express";
import { requireCustomerAuth, AuthenticatedRequest } from "../../middleware/customer-auth";
import { notificationService } from "../../services/notification.service";

const router = Router();

router.get("/", requireCustomerAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const customerId = req.customerSession!.customerId;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await notificationService.listForRecipient("customer", customerId, limit, offset);
    res.json(result);
  } catch (error) {
    console.error("Fetch customer notifications error:", error);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

router.get("/unread-count", requireCustomerAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const customerId = req.customerSession!.customerId;
    const count = await notificationService.getUnreadCount("customer", customerId);
    res.json({ count });
  } catch (error) {
    console.error("Fetch unread count error:", error);
    res.status(500).json({ message: "Failed to fetch unread count" });
  }
});

router.patch("/:id/read", requireCustomerAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const customerId = req.customerSession!.customerId;
    const success = await notificationService.markRead(req.params.id, "customer", customerId);
    if (!success) {
      return res.status(404).json({ message: "Notification not found" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Mark notification read error:", error);
    res.status(500).json({ message: "Failed to mark notification as read" });
  }
});

router.patch("/mark-all-read", requireCustomerAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const customerId = req.customerSession!.customerId;
    const count = await notificationService.markAllRead("customer", customerId);
    res.json({ success: true, count });
  } catch (error) {
    console.error("Mark all read error:", error);
    res.status(500).json({ message: "Failed to mark all as read" });
  }
});

export default router;
