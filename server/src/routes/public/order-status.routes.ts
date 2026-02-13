import { Router } from "express";
import { storage } from "../../../storage";

const router = Router();

router.get("/:orderId/status", async (req, res) => {
  try {
    const order = await storage.getOrder(req.params.orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    const items = await storage.getOrderItems(order.id);
    const customer = await storage.getCustomer(order.customerId);
    const shipments = await storage.getShipments(order.id);

    const maskedEmail = customer ? maskEmail(customer.email) : null;

    res.json({
      id: order.id,
      status: order.status,
      totalAmount: order.totalAmount,
      subtotalAmount: order.subtotalAmount || null,
      taxAmount: order.taxAmount || null,
      affiliateDiscountAmount: order.affiliateDiscountAmount || null,
      couponDiscountAmount: order.couponDiscountAmount || null,
      couponCode: order.couponCode || null,
      createdAt: order.createdAt,
      items,
      customer: customer ? {
        name: customer.name,
        email: maskedEmail,
        city: customer.city,
        state: customer.state,
        country: customer.country,
      } : null,
      shipments,
      isManualOrder: order.isManualOrder,
      stripePaymentIntentId: order.stripePaymentIntentId,
    });
  } catch (error) {
    console.error("Public order status error:", error);
    res.status(500).json({ message: "Failed to fetch order" });
  }
});

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const visibleChars = Math.min(2, local.length);
  return `${local.slice(0, visibleChars)}${"*".repeat(Math.max(0, local.length - visibleChars))}@${domain}`;
}

export default router;
