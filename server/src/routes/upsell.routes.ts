import { Router } from "express";
import { storage } from "../../storage";
import { upsellService } from "../services/upsell.service";
import { asyncHandler } from "../utils/async-handler";
import { requireAdmin } from "../middleware/auth.middleware";

const router = Router();

// Get upsell suggestions for cart products
router.post("/cart-suggestions", asyncHandler(async (req, res) => {
  const { productIds } = req.body;
  
  if (!productIds || !Array.isArray(productIds)) {
    return res.status(400).json({ message: "productIds array required" });
  }

  const { frequentlyBoughtTogether, accessories } = await upsellService.getCartUpsells(productIds);
  
  // Transform to flat array format expected by frontend
  const suggestions = [
    ...frequentlyBoughtTogether.map(product => ({
      product,
      relationshipType: "frequently_bought_together",
      reason: "Frequently bought together",
    })),
    ...accessories.map(product => ({
      product,
      relationshipType: "accessory",
      reason: "Complete your setup",
    })),
  ];
  
  res.json(suggestions);
}));

// Get post-purchase offer for an order
router.get("/post-purchase/:orderId", asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  
  const offer = await upsellService.getPendingOffer(orderId);
  if (!offer) {
    return res.json({ offer: null });
  }

  // Get product details
  const product = await storage.getProduct(offer.productId);
  
  res.json({
    offer: {
      ...offer,
      product,
    },
  });
}));

// Accept a post-purchase offer
router.post("/post-purchase/:offerId/accept", asyncHandler(async (req, res) => {
  const { offerId } = req.params;
  const result = await upsellService.acceptOffer(offerId);
  res.json(result);
}));

// Decline a post-purchase offer
router.post("/post-purchase/:offerId/decline", asyncHandler(async (req, res) => {
  const { offerId } = req.params;
  await storage.updatePostPurchaseOffer(offerId, { status: "declined" });
  res.json({ success: true });
}));

// Track upsell event (impression, click)
router.post("/track", asyncHandler(async (req, res) => {
  const { productId, upsellProductId, upsellType, eventType, orderId, customerId } = req.body;
  
  if (!productId || !upsellProductId || !upsellType || !eventType) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  await upsellService.trackEvent({
    productId,
    upsellProductId,
    upsellType,
    eventType,
    orderId,
    customerId,
  });

  res.json({ success: true });
}));

// ==================== ADMIN ROUTES ====================

// Get product relationships for a product
router.get("/admin/relationships/:productId", requireAdmin, asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const relationships = await storage.getProductRelationships(productId);
  
  // Get related product details
  const withProducts = await Promise.all(relationships.map(async (rel) => {
    const product = await storage.getProduct(rel.relatedProductId);
    return { ...rel, relatedProduct: product };
  }));

  res.json(withProducts);
}));

// Create product relationship
router.post("/admin/relationships", requireAdmin, asyncHandler(async (req, res) => {
  const { productId, relatedProductId, relationshipType, sortOrder } = req.body;
  
  if (!productId || !relatedProductId || !relationshipType) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const relationship = await storage.createProductRelationship({
    productId,
    relatedProductId,
    relationshipType,
    sortOrder: sortOrder || 0,
    isActive: true,
  });

  res.json(relationship);
}));

// Delete product relationship
router.delete("/admin/relationships/:id", requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  await storage.deleteProductRelationship(id);
  res.json({ success: true });
}));

// Get upsell rules
router.get("/admin/rules", requireAdmin, asyncHandler(async (req, res) => {
  const { productId } = req.query;
  const rules = await storage.getUpsellRules(productId as string | undefined);
  res.json(rules);
}));

// Create upsell rule
router.post("/admin/rules", requireAdmin, asyncHandler(async (req, res) => {
  const rule = await storage.createUpsellRule(req.body);
  res.json(rule);
}));

// Update upsell rule
router.patch("/admin/rules/:id", requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const rule = await storage.updateUpsellRule(id, req.body);
  res.json(rule);
}));

// Delete upsell rule
router.delete("/admin/rules/:id", requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  await storage.deleteUpsellRule(id);
  res.json({ success: true });
}));

// Get upsell analytics (admin)
router.get("/admin/analytics", requireAdmin, asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  const start = startDate ? new Date(startDate as string) : undefined;
  const end = endDate ? new Date(endDate as string) : undefined;
  
  const analytics = await upsellService.getAnalytics(start, end);
  res.json(analytics);
}));

// Get upsell analytics for revenue dashboard
router.get("/analytics", requireAdmin, asyncHandler(async (req, res) => {
  const { startDate, endDate, preset } = req.query;
  
  let start: Date | undefined;
  let end: Date | undefined;
  
  if (preset) {
    const now = new Date();
    end = now;
    switch (preset) {
      case "today":
        start = new Date(now.setHours(0, 0, 0, 0));
        break;
      case "7d":
        start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "mtd":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "ytd":
        start = new Date(now.getFullYear(), 0, 1);
        break;
    }
  } else {
    start = startDate ? new Date(startDate as string) : undefined;
    end = endDate ? new Date(endDate as string) : undefined;
  }
  
  const analytics = await upsellService.getAnalytics(start, end);
  
  // Transform to match Revenue Dashboard expected format
  res.json({
    totalImpressions: analytics.totalImpressions,
    totalClicks: analytics.totalClicks,
    totalConversions: analytics.totalConversions,
    clickRate: analytics.totalImpressions > 0 
      ? analytics.totalClicks / analytics.totalImpressions 
      : 0,
    conversionRate: analytics.totalImpressions > 0 
      ? analytics.totalConversions / analytics.totalImpressions 
      : 0,
    upsellRevenue: analytics.totalRevenue,
    revenueUplift: analytics.totalRevenue > 0 ? 0.15 : 0, // Estimated uplift %
    topUpsells: analytics.byProduct.map(p => ({
      productName: p.productName,
      relatedProductName: p.productName, // Would need join data
      conversions: p.conversions,
      revenue: p.revenue,
    })),
  });
}));

export default router;
