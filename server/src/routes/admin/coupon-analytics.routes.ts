import { Router } from "express";
import { couponAnalyticsService } from "../../services/coupon-analytics.service";
import { requireFullAccess } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../utils/async-handler";

const router = Router();

router.get("/admin/analytics", requireFullAccess, asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days as string) || 30;
  const summary = await couponAnalyticsService.getAnalyticsSummary(days);
  res.json(summary);
}));

router.get("/admin/performance", requireFullAccess, asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days as string) || 30;
  const performance = await couponAnalyticsService.getCouponPerformance(days);
  res.json(performance);
}));

router.post("/admin/:couponId/disable", requireFullAccess, asyncHandler(async (req, res) => {
  const { couponId } = req.params;
  await couponAnalyticsService.disableCoupon(couponId);
  res.json({ success: true, message: "Coupon disabled" });
}));

router.post("/admin/:couponId/enable", requireFullAccess, asyncHandler(async (req, res) => {
  const { couponId } = req.params;
  await couponAnalyticsService.enableCoupon(couponId);
  res.json({ success: true, message: "Coupon enabled" });
}));

router.post("/admin/auto-expire", requireFullAccess, asyncHandler(async (req, res) => {
  const expiredCoupons = await couponAnalyticsService.autoExpireUnderperformingCoupons();
  res.json({ 
    success: true, 
    expiredCount: expiredCoupons.length,
    expiredCoupons 
  });
}));

router.post("/validate-stacking", asyncHandler(async (req, res) => {
  const { couponCode, hasAffiliate, hasVipDiscount, orderSubtotal } = req.body;
  
  if (!couponCode) {
    return res.status(400).json({ valid: false, message: "Coupon code required" });
  }

  const result = await couponAnalyticsService.validateStacking(
    couponCode,
    hasAffiliate || false,
    hasVipDiscount || false,
    orderSubtotal || 0
  );

  res.json(result);
}));

export default router;
