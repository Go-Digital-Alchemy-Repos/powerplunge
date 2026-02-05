import { Router } from "express";
import { checkoutRecoveryService } from "../services/checkout-recovery.service";
import { requireAdmin } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";

const router = Router();

router.get("/admin/analytics", requireAdmin, asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days as string) || 30;
  const analytics = await checkoutRecoveryService.getRecoveryAnalytics(days);
  res.json(analytics);
}));

router.get("/admin/abandoned-carts", requireAdmin, asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const carts = await checkoutRecoveryService.getAbandonedCartsList(limit);
  res.json(carts);
}));

router.get("/admin/failed-payments", requireAdmin, asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const payments = await checkoutRecoveryService.getFailedPaymentsList(limit);
  res.json(payments);
}));

router.post("/admin/detect-abandoned", requireAdmin, asyncHandler(async (req, res) => {
  const carts = await checkoutRecoveryService.detectAbandonedCarts();
  res.json({ 
    success: true, 
    detected: carts.length,
    message: `Detected ${carts.length} abandoned carts` 
  });
}));

router.post("/admin/expire-old", requireAdmin, asyncHandler(async (req, res) => {
  await checkoutRecoveryService.expireOldRecoveries();
  res.json({ success: true, message: "Expired old recoveries" });
}));

router.post("/admin/send-recovery-emails", requireAdmin, asyncHandler(async (req, res) => {
  const abandonedCarts = await checkoutRecoveryService.getAbandonedCartsForRecovery();
  const failedPayments = await checkoutRecoveryService.getFailedPaymentsForRecovery();
  
  res.json({
    success: true,
    pendingRecovery: {
      abandonedCarts: abandonedCarts.length,
      failedPayments: failedPayments.length,
    },
    message: `${abandonedCarts.length} abandoned carts and ${failedPayments.length} failed payments ready for recovery emails`,
  });
}));

router.post("/track-cart", asyncHandler(async (req, res) => {
  const { sessionId, cartData, cartValue, email, customerId, couponCode, affiliateCode } = req.body;
  
  if (!sessionId || !cartData || cartValue === undefined) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  await checkoutRecoveryService.trackCartActivity(
    sessionId,
    cartData,
    cartValue,
    email,
    customerId,
    couponCode,
    affiliateCode
  );

  res.json({ success: true });
}));

router.post("/mark-cart-recovered", asyncHandler(async (req, res) => {
  const { sessionId, orderId } = req.body;
  
  if (!sessionId || !orderId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  await checkoutRecoveryService.markCartRecovered(sessionId, orderId);
  res.json({ success: true });
}));

router.post("/record-failed-payment", asyncHandler(async (req, res) => {
  const { orderId, email, amount, paymentIntentId, failureReason, failureCode, customerId } = req.body;
  
  if (!orderId || !email || !amount) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  await checkoutRecoveryService.recordFailedPayment(
    orderId,
    email,
    amount,
    paymentIntentId,
    failureReason,
    failureCode,
    customerId
  );

  res.json({ success: true });
}));

router.post("/mark-payment-recovered", asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  
  if (!orderId) {
    return res.status(400).json({ error: "Missing orderId" });
  }

  await checkoutRecoveryService.markPaymentRecovered(orderId);
  res.json({ success: true });
}));

export default router;
