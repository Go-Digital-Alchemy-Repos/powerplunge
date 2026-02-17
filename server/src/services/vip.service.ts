import { storage } from "../../storage";
import type { Customer, VipCustomer, VipSettings } from "@shared/schema";

export class VipService {
  /**
   * Get or create default VIP settings
   */
  async getSettings(): Promise<VipSettings> {
    const settings = await storage.getVipSettings();
    if (settings) return settings;
    
    // Create default settings
    return storage.updateVipSettings({
      lifetimeSpendThreshold: 100000, // $1000
      orderCountThreshold: 3,
      autoPromote: true,
      freeShippingEnabled: true,
      freeShippingThreshold: 0,
      exclusiveDiscountPercent: 10,
      prioritySupportEnabled: true,
      earlyAccessEnabled: true,
    });
  }

  /**
   * Check if a customer qualifies for VIP status
   */
  async checkVipEligibility(customerId: string): Promise<{
    eligible: boolean;
    reason: "lifetime_spend" | "order_count" | "none";
    lifetimeSpend: number;
    orderCount: number;
    thresholds: { spend: number; orders: number };
  }> {
    const settings = await this.getSettings();
    const orders = await storage.getOrdersByCustomerId(customerId);
    
    // Calculate lifetime spend (only orders with actual payment received)
    const paidOrders = orders.filter((o: any) => 
      (o.status === "paid" || o.status === "shipped" || o.status === "delivered") && !!o.stripePaymentIntentId
    );
    const lifetimeSpend = paidOrders.reduce((sum: number, o: { totalAmount: number }) => sum + o.totalAmount, 0);
    const orderCount = paidOrders.length;

    const spendThreshold = settings.lifetimeSpendThreshold || 100000;
    const orderThreshold = settings.orderCountThreshold || 3;

    let eligible = false;
    let reason: "lifetime_spend" | "order_count" | "none" = "none";

    if (lifetimeSpend >= spendThreshold) {
      eligible = true;
      reason = "lifetime_spend";
    } else if (orderCount >= orderThreshold) {
      eligible = true;
      reason = "order_count";
    }

    return {
      eligible,
      reason,
      lifetimeSpend,
      orderCount,
      thresholds: {
        spend: spendThreshold,
        orders: orderThreshold,
      },
    };
  }

  /**
   * Check if customer is VIP
   */
  async isVip(customerId: string): Promise<boolean> {
    const vip = await storage.getVipCustomer(customerId);
    return vip?.status === "active";
  }

  /**
   * Get VIP status for a customer
   */
  async getVipStatus(customerId: string): Promise<VipCustomer | null> {
    const vip = await storage.getVipCustomer(customerId);
    return vip || null;
  }

  /**
   * Auto-promote eligible customers to VIP
   * Called after order payment confirmation
   */
  async autoPromoteIfEligible(customerId: string): Promise<VipCustomer | null> {
    const settings = await this.getSettings();
    if (!settings.autoPromote) return null;

    // Check if already VIP
    const existing = await storage.getVipCustomer(customerId);
    if (existing?.status === "active") return existing;

    // Check eligibility
    const eligibility = await this.checkVipEligibility(customerId);
    if (!eligibility.eligible || eligibility.reason === "none") return null;

    // Promote to VIP
    return this.promoteToVip(customerId, eligibility.reason as "lifetime_spend" | "order_count", eligibility.lifetimeSpend, eligibility.orderCount);
  }

  /**
   * Manually promote customer to VIP
   */
  async promoteToVip(
    customerId: string,
    reason: "lifetime_spend" | "order_count" | "manual",
    lifetimeSpend: number = 0,
    orderCount: number = 0,
    adminId?: string,
    notes?: string
  ): Promise<VipCustomer> {
    const existing = await storage.getVipCustomer(customerId);
    
    if (existing) {
      // Reactivate if revoked
      if (existing.status !== "active") {
        return storage.updateVipCustomer(customerId, {
          status: "active",
          reason,
          lifetimeSpendAtPromotion: lifetimeSpend,
          orderCountAtPromotion: orderCount,
          promotedByAdminId: adminId,
          notes,
          revokedAt: null,
          revokedByAdminId: null,
          revokeReason: null,
        }) as Promise<VipCustomer>;
      }
      return existing;
    }

    return storage.createVipCustomer({
      customerId,
      status: "active",
      reason,
      lifetimeSpendAtPromotion: lifetimeSpend,
      orderCountAtPromotion: orderCount,
      promotedByAdminId: adminId,
      notes,
    });
  }

  /**
   * Revoke VIP status
   */
  async revokeVipStatus(customerId: string, adminId: string, reason: string): Promise<VipCustomer | null> {
    const vip = await storage.getVipCustomer(customerId);
    if (!vip || vip.status !== "active") return null;

    const revoked = await storage.revokeVipStatus(customerId, adminId, reason);
    return revoked || null;
  }

  /**
   * Get VIP benefits for customer
   */
  async getVipBenefits(customerId: string): Promise<{
    isVip: boolean;
    freeShipping: boolean;
    freeShippingThreshold: number;
    discountPercent: number;
    prioritySupport: boolean;
    earlyAccess: boolean;
  }> {
    const vip = await storage.getVipCustomer(customerId);
    const settings = await this.getSettings();

    if (!vip || vip.status !== "active") {
      return {
        isVip: false,
        freeShipping: false,
        freeShippingThreshold: 0,
        discountPercent: 0,
        prioritySupport: false,
        earlyAccess: false,
      };
    }

    return {
      isVip: true,
      freeShipping: settings.freeShippingEnabled ?? true,
      freeShippingThreshold: settings.freeShippingThreshold ?? 0,
      discountPercent: settings.exclusiveDiscountPercent ?? 10,
      prioritySupport: settings.prioritySupportEnabled ?? true,
      earlyAccess: settings.earlyAccessEnabled ?? true,
    };
  }

  /**
   * Log VIP benefit usage
   */
  async logBenefitUsage(
    customerId: string,
    activityType: "free_shipping" | "exclusive_discount" | "early_access" | "priority_support",
    orderId?: string,
    savedAmount?: number,
    details?: Record<string, unknown>
  ): Promise<void> {
    await storage.createVipActivityLog({
      customerId,
      activityType,
      orderId: orderId || null,
      savedAmount: savedAmount || 0,
      details: details || null,
    });
  }

  /**
   * Get VIP analytics
   */
  async getAnalytics(): Promise<{
    totalVips: number;
    vipRevenue: number;
    nonVipRevenue: number;
    vipRevenuePercent: number;
    vipAov: number;
    nonVipAov: number;
    aovDifference: number;
    recentPromotions: Array<{ customer: Customer; vip: VipCustomer }>;
  }> {
    const vips = await storage.getVipCustomers();
    const vipCustomerIds = new Set(vips.map(v => v.customerId));

    // Get all orders for analysis
    const allOrders = await storage.getOrders();
    const paidOrders = allOrders.filter(o => 
      o.status === "paid" || o.status === "shipped" || o.status === "delivered"
    );

    let vipRevenue = 0;
    let nonVipRevenue = 0;
    let vipOrderCount = 0;
    let nonVipOrderCount = 0;

    for (const order of paidOrders) {
      if (vipCustomerIds.has(order.customerId)) {
        vipRevenue += order.totalAmount;
        vipOrderCount++;
      } else {
        nonVipRevenue += order.totalAmount;
        nonVipOrderCount++;
      }
    }

    const totalRevenue = vipRevenue + nonVipRevenue;
    const vipRevenuePercent = totalRevenue > 0 ? (vipRevenue / totalRevenue) * 100 : 0;
    const vipAov = vipOrderCount > 0 ? vipRevenue / vipOrderCount : 0;
    const nonVipAov = nonVipOrderCount > 0 ? nonVipRevenue / nonVipOrderCount : 0;
    const aovDifference = vipAov - nonVipAov;

    // Get recent promotions with customer data
    const recentVips = vips.slice(0, 10);
    const recentPromotions = await Promise.all(
      recentVips.map(async (vip) => {
        const customer = await storage.getCustomer(vip.customerId);
        return { customer: customer!, vip };
      })
    );

    return {
      totalVips: vips.length,
      vipRevenue,
      nonVipRevenue,
      vipRevenuePercent,
      vipAov,
      nonVipAov,
      aovDifference,
      recentPromotions: recentPromotions.filter(p => p.customer),
    };
  }
}

export const vipService = new VipService();
