import { Router } from "express";
import { storage } from "../../storage";
import { vipService } from "../services/vip.service";
import { asyncHandler } from "../utils/async-handler";
import { requireAdmin, isAuthenticated } from "../middleware/auth.middleware";

const router = Router();

// ==================== CUSTOMER ROUTES ====================

// Get VIP status and benefits for authenticated customer
router.get("/status", isAuthenticated, asyncHandler(async (req: any, res) => {
  const userId = req.user.claims.sub;
  const customer = await storage.getCustomerByUserId(userId);
  
  if (!customer) {
    return res.json({ isVip: false, benefits: null });
  }

  const vipStatus = await vipService.getVipStatus(customer.id);
  const benefits = await vipService.getVipBenefits(customer.id);
  const eligibility = await vipService.checkVipEligibility(customer.id);

  res.json({
    isVip: vipStatus?.status === "active",
    vipStatus,
    benefits,
    eligibility,
  });
}));

// Get VIP activity log for authenticated customer
router.get("/activity", isAuthenticated, asyncHandler(async (req: any, res) => {
  const userId = req.user.claims.sub;
  const customer = await storage.getCustomerByUserId(userId);
  
  if (!customer) {
    return res.json({ activities: [] });
  }

  const activities = await storage.getVipActivityLogs(customer.id);
  res.json({ activities });
}));

// ==================== ADMIN ROUTES ====================

// Get VIP settings
router.get("/admin/settings", requireAdmin, asyncHandler(async (req, res) => {
  const settings = await vipService.getSettings();
  res.json(settings);
}));

// Update VIP settings
router.patch("/admin/settings", requireAdmin, asyncHandler(async (req, res) => {
  const settings = await storage.updateVipSettings(req.body);
  res.json(settings);
}));

// Get all VIP customers
router.get("/admin/customers", requireAdmin, asyncHandler(async (req, res) => {
  const vips = await storage.getVipCustomers();
  
  // Get customer details for each VIP
  const withCustomers = await Promise.all(vips.map(async (vip) => {
    const customer = await storage.getCustomer(vip.customerId);
    const orders = await storage.getOrdersByCustomerId(vip.customerId);
    const lifetimeSpend = orders
      .filter(o => ["paid", "shipped", "delivered"].includes(o.status))
      .reduce((sum, o) => sum + o.totalAmount, 0);
    
    return {
      ...vip,
      customer,
      currentStats: {
        lifetimeSpend,
        orderCount: orders.length,
      },
    };
  }));

  res.json(withCustomers);
}));

// Get VIP customer profile
router.get("/admin/customers/:customerId", requireAdmin, asyncHandler(async (req, res) => {
  const { customerId } = req.params;
  
  const vip = await storage.getVipCustomer(customerId);
  const customer = await storage.getCustomer(customerId);
  const activities = await storage.getVipActivityLogs(customerId);
  const orders = await storage.getOrdersByCustomerId(customerId);
  
  if (!customer) {
    return res.status(404).json({ message: "Customer not found" });
  }

  const lifetimeSpend = orders
    .filter(o => ["paid", "shipped", "delivered"].includes(o.status))
    .reduce((sum, o) => sum + o.totalAmount, 0);

  res.json({
    vip,
    customer,
    activities,
    currentStats: {
      lifetimeSpend,
      orderCount: orders.length,
    },
  });
}));

// Manually promote customer to VIP
router.post("/admin/promote/:customerId", requireAdmin, asyncHandler(async (req: any, res) => {
  const { customerId } = req.params;
  const { notes } = req.body;
  const adminId = req.session?.adminUser?.id;

  const customer = await storage.getCustomer(customerId);
  if (!customer) {
    return res.status(404).json({ message: "Customer not found" });
  }

  const eligibility = await vipService.checkVipEligibility(customerId);
  
  const vip = await vipService.promoteToVip(
    customerId,
    "manual",
    eligibility.lifetimeSpend,
    eligibility.orderCount,
    adminId,
    notes
  );

  res.json(vip);
}));

// Revoke VIP status
router.post("/admin/revoke/:customerId", requireAdmin, asyncHandler(async (req: any, res) => {
  const { customerId } = req.params;
  const { reason } = req.body;
  const adminId = req.session?.adminUser?.id;

  if (!reason) {
    return res.status(400).json({ message: "Reason required for revocation" });
  }

  const vip = await vipService.revokeVipStatus(customerId, adminId, reason);
  
  if (!vip) {
    return res.status(400).json({ message: "Customer is not currently a VIP" });
  }

  res.json(vip);
}));

// Get VIP analytics
router.get("/admin/analytics", requireAdmin, asyncHandler(async (req, res) => {
  const analytics = await vipService.getAnalytics();
  
  // Transform to match Revenue Dashboard expected format
  const activeVips = analytics.totalVips;
  const aovUplift = analytics.nonVipAov > 0 
    ? (analytics.vipAov - analytics.nonVipAov) / analytics.nonVipAov 
    : 0;
  
  res.json({
    totalVips: analytics.totalVips,
    activeVips: activeVips,
    vipRevenue: analytics.vipRevenue,
    vipRevenuePercent: analytics.vipRevenuePercent / 100, // Convert to decimal
    vipAov: analytics.vipAov,
    nonVipAov: analytics.nonVipAov,
    aovUplift: aovUplift,
    recentPromotions: analytics.recentPromotions,
  });
}));

// Check customer eligibility for VIP
router.get("/admin/eligibility/:customerId", requireAdmin, asyncHandler(async (req, res) => {
  const { customerId } = req.params;
  const eligibility = await vipService.checkVipEligibility(customerId);
  res.json(eligibility);
}));

export default router;
