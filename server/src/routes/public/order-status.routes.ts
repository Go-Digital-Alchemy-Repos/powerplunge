import { Router } from "express";
import { storage } from "../../../storage";

const router = Router();

router.get("/:orderId/status", async (req, res) => {
  try {
    const order = await storage.getOrder(req.params.orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    const [items, customer, shipments, orderRefunds] = await Promise.all([
      storage.getOrderItems(order.id),
      storage.getCustomer(order.customerId),
      storage.getShipments(order.id),
      storage.getRefundsByOrderId(order.id),
    ]);

    const { computeRefundSummary } = await import("../../services/refund.service");
    const refundSummary = computeRefundSummary(order, orderRefunds);

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
        name: order.shippingName || customer.name,
        email: customer.email,
        address: order.shippingAddress || customer.address || null,
        addressLine2: order.shippingLine2 || null,
        city: order.shippingCity || customer.city,
        state: order.shippingState || customer.state,
        zipCode: order.shippingZip || customer.zipCode || null,
        country: order.shippingCountry || customer.country,
      } : null,
      shipments,
      isManualOrder: order.isManualOrder,
      stripePaymentIntentId: order.stripePaymentIntentId,
      paymentStatus: refundSummary.paymentStatus,
      refundedAmount: refundSummary.refundedAmount,
    });
  } catch (error) {
    console.error("Public order status error:", error);
    res.status(500).json({ message: "Failed to fetch order" });
  }
});

export default router;
