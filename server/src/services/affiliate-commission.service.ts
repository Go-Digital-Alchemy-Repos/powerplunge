import { db } from "../../db";
import { storage } from "../../storage";
import { affiliates, affiliateReferrals, affiliateSettings, affiliateClicks, orders, orderItems, customers, coupons, couponRedemptions, adminUsers, products, type Product, type AffiliateSettings } from "@shared/schema";
import { eq, and, lt, sql, isNull, isNotNull, desc } from "drizzle-orm";

export type FraudCheckResult = {
  isFlagged: boolean;
  reason?: "self_referral" | "coupon_abuse" | "suspicious_pattern";
  details?: string;
};

const processedCommissions = new Map<string, { timestamp: number; result: CommissionResult }>();
const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000; // 5 minutes

function cleanupIdempotencyCache() {
  const now = Date.now();
  const entries = Array.from(processedCommissions.entries());
  for (const [key, value] of entries) {
    if (now - value.timestamp > IDEMPOTENCY_TTL_MS) {
      processedCommissions.delete(key);
    }
  }
}

export interface CommissionResult {
  success: boolean;
  referralId?: string;
  commissionAmount?: number;
  error?: string;
}

export interface AffiliateStats {
  affiliateId: string;
  affiliateCode: string;
  customerName: string;
  email: string;
  status: string;
  totalRevenue: number;
  totalCommission: number;
  pendingCommission: number;
  approvedCommission: number;
  paidCommission: number;
  totalOrders: number;
  conversionRate: number;
  createdAt: string;
}

export interface CommissionDetail {
  id: string;
  orderId: string;
  orderAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: string;
  createdAt: string;
  approvedAt: string | null;
  paidAt: string | null;
  customerName: string;
  customerEmail: string;
}

export class AffiliateCommissionService {

  /**
   * Check for fraud indicators on a commission.
   * Returns flagged=true if self-referral or coupon abuse is detected.
   */
  async checkForFraud(
    orderId: string,
    affiliateId: string,
    affiliateCustomerId: string
  ): Promise<FraudCheckResult> {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));

    if (!order) {
      return { isFlagged: false };
    }

    // Get affiliate's customer record to compare emails
    const [affiliateCustomer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, affiliateCustomerId));

    // Get order's customer record
    const [orderCustomer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, order.customerId));

    // Check 1: Self-referral detection (email match)
    if (affiliateCustomer && orderCustomer) {
      if (affiliateCustomer.email.toLowerCase() === orderCustomer.email.toLowerCase()) {
        return {
          isFlagged: true,
          reason: "self_referral",
          details: `Customer email ${orderCustomer.email} matches affiliate owner email`,
        };
      }
    }

    // Check 2: Coupon abuse detection - check if a blocking coupon was used
    const redemptions = await db
      .select({
        couponId: couponRedemptions.couponId,
        couponCode: coupons.code,
        blockAffiliateCommission: coupons.blockAffiliateCommission,
      })
      .from(couponRedemptions)
      .innerJoin(coupons, eq(couponRedemptions.couponId, coupons.id))
      .where(eq(couponRedemptions.orderId, orderId));

    for (const redemption of redemptions) {
      if (redemption.blockAffiliateCommission) {
        return {
          isFlagged: true,
          reason: "coupon_abuse",
          details: `Order used coupon "${redemption.couponCode}" which blocks affiliate commission`,
        };
      }
    }

    return { isFlagged: false };
  }

  /**
   * Calculate and record commission when an order is paid.
   * Prevents double-counting via unique orderId constraint + in-memory idempotency cache.
   * Also performs fraud checks and flags suspicious commissions.
   */
  async recordCommission(orderId: string, options?: {
    sessionId?: string;
    attributionType?: string;
    idempotencyKey?: string;
    customerIp?: string;
    isFriendsFamily?: boolean;
  }): Promise<CommissionResult> {
    // Generate idempotency key from orderId if not provided
    const idempotencyKey = options?.idempotencyKey || `commission-${orderId}`;
    
    // Cleanup old cache entries periodically
    cleanupIdempotencyCache();
    
    // Check idempotency cache first (fast path for duplicate webhook calls)
    const cached = processedCommissions.get(idempotencyKey);
    if (cached) {
      console.log(`[AFFILIATE] Idempotency hit for ${idempotencyKey}`);
      return cached.result;
    }
    
    try {
      // Get the order with affiliate code
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, orderId));

      if (!order) {
        return { success: false, error: "Order not found" };
      }

      if (!order.affiliateCode) {
        return { success: false, error: "Order has no affiliate code" };
      }

      // Check if commission already exists in DB (prevents double-counting across restarts)
      const [existing] = await db
        .select()
        .from(affiliateReferrals)
        .where(eq(affiliateReferrals.orderId, orderId));

      if (existing) {
        const result: CommissionResult = { 
          success: true, 
          referralId: existing.id,
          commissionAmount: existing.commissionAmount,
          error: "Commission already recorded"
        };
        // Cache the result
        processedCommissions.set(idempotencyKey, { timestamp: Date.now(), result });
        return result;
      }

      // Find the affiliate
      const [affiliate] = await db
        .select()
        .from(affiliates)
        .where(eq(affiliates.affiliateCode, order.affiliateCode));

      if (!affiliate) {
        return { success: false, error: "Affiliate not found for code: " + order.affiliateCode };
      }

      if (affiliate.status !== "active") {
        return { success: false, error: "Affiliate is not active" };
      }

      // Get current settings
      const [settings] = await db
        .select()
        .from(affiliateSettings)
        .where(eq(affiliateSettings.id, "main"));

      // Get order items with their products for per-product commission
      const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId));

      let commissionAmount = 0;
      const commissionBase = order.subtotalAmount ?? order.totalAmount;
      const isFriendsFamily = options?.isFriendsFamily && settings?.ffEnabled;

      const hasCustomRates = affiliate.useCustomRates && affiliate.customCommissionType && affiliate.customCommissionValue != null;

      if (items.length > 0) {
        for (const item of items) {
          const [product] = await db
            .select()
            .from(products)
            .where(eq(products.id, item.productId));

          if (!product || !product.affiliateEnabled) continue;

          const lineAmount = item.unitPrice * item.quantity;

          let commType: string;
          let commValue: number;
          if (isFriendsFamily) {
            commType = settings?.ffCommissionType || "PERCENT";
            commValue = settings?.ffCommissionValue ?? 0;
          } else if (hasCustomRates) {
            commType = affiliate.customCommissionType!;
            commValue = affiliate.customCommissionValue!;
          } else if (product.affiliateUseGlobalSettings || !product.affiliateCommissionType) {
            commType = settings?.defaultCommissionType || "PERCENT";
            commValue = settings?.defaultCommissionValue ?? settings?.commissionRate ?? 10;
          } else {
            commType = product.affiliateCommissionType;
            commValue = product.affiliateCommissionValue ?? 0;
          }

          if (commType === "PERCENT") {
            commissionAmount += Math.floor(lineAmount * (commValue / 100));
          } else {
            commissionAmount += Math.min(lineAmount, commValue);
          }
        }
      } else {
        let fallbackValue: number;
        let fallbackType: string;
        if (isFriendsFamily) {
          fallbackType = settings?.ffCommissionType || "PERCENT";
          fallbackValue = settings?.ffCommissionValue ?? 0;
        } else if (hasCustomRates) {
          fallbackType = affiliate.customCommissionType!;
          fallbackValue = affiliate.customCommissionValue!;
        } else {
          fallbackValue = settings?.defaultCommissionValue ?? settings?.commissionRate ?? 10;
          fallbackType = settings?.defaultCommissionType || "PERCENT";
        }
        if (fallbackType === "PERCENT") {
          commissionAmount = Math.floor(commissionBase * (fallbackValue / 100));
        } else {
          commissionAmount = Math.min(commissionBase, fallbackValue);
        }
      }

      const effectiveCommissionRate = commissionBase > 0
        ? Math.round((commissionAmount / commissionBase) * 100)
        : (settings?.defaultCommissionValue ?? settings?.commissionRate ?? 10);

      // Lookup the attributed click if session ID is provided
      // Only link click if its affiliateId matches the order's affiliate
      let attributedClickId: string | null = null;
      if (options?.sessionId) {
        const [click] = await db
          .select()
          .from(affiliateClicks)
          .where(eq(affiliateClicks.sessionId, options.sessionId));
        if (click && click.affiliateId === affiliate.id) {
          attributedClickId = click.id;
        }
      }

      // Perform fraud detection checks
      const fraudCheck = await this.checkForFraud(orderId, affiliate.id, affiliate.customerId);

      // Create the commission record with fraud flag if applicable
      const [referral] = await db
        .insert(affiliateReferrals)
        .values({
          affiliateId: affiliate.id,
          orderId: order.id,
          orderAmount: commissionBase,
          commissionRate: effectiveCommissionRate,
          commissionAmount,
          status: fraudCheck.isFlagged ? "flagged" : "pending",
          attributedClickId,
          attributionType: options?.attributionType || "direct",
          flagReason: fraudCheck.reason || null,
          flagDetails: fraudCheck.details || null,
          flaggedAt: fraudCheck.isFlagged ? new Date() : null,
          customerIp: options?.customerIp || order.customerIp || null,
        })
        .returning();

      if (fraudCheck.isFlagged) {
        console.log(`[AFFILIATE] Flagged commission for order ${orderId}: ${fraudCheck.reason} - ${fraudCheck.details}`);
      }

      // Update affiliate totals (only add to pending balance if not flagged)
      if (!fraudCheck.isFlagged) {
        await db
          .update(affiliates)
          .set({
            totalReferrals: sql`${affiliates.totalReferrals} + 1`,
            totalSales: sql`${affiliates.totalSales} + ${order.totalAmount}`,
            totalEarnings: sql`${affiliates.totalEarnings} + ${commissionAmount}`,
            pendingBalance: sql`${affiliates.pendingBalance} + ${commissionAmount}`,
            updatedAt: new Date(),
          })
          .where(eq(affiliates.id, affiliate.id));
      }

      console.log(`[AFFILIATE] Recorded commission: $${(commissionAmount / 100).toFixed(2)} for affiliate ${affiliate.affiliateCode}, order ${orderId}`);

      const result: CommissionResult = {
        success: true,
        referralId: referral.id,
        commissionAmount,
      };
      
      // Cache the successful result
      processedCommissions.set(idempotencyKey, { timestamp: Date.now(), result });
      
      return result;
    } catch (error: any) {
      // Unique constraint violation means commission already exists
      if (error.code === "23505") {
        const result: CommissionResult = { success: true, error: "Commission already recorded (duplicate)" };
        processedCommissions.set(idempotencyKey, { timestamp: Date.now(), result });
        return result;
      }
      console.error("[AFFILIATE] Failed to record commission:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Auto-approve pending commissions after the configured number of days.
   * Should be called periodically (e.g., daily cron).
   */
  async autoApproveCommissions(): Promise<{ approved: number; errors: string[] }> {
    const errors: string[] = [];
    let approved = 0;

    try {
      // Get approval days setting
      const [settings] = await db
        .select()
        .from(affiliateSettings)
        .where(eq(affiliateSettings.id, "main"));

      const approvalDays = settings?.approvalDays || 14;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - approvalDays);

      // Find pending commissions older than approval days
      const pendingCommissions = await db
        .select()
        .from(affiliateReferrals)
        .where(and(
          eq(affiliateReferrals.status, "pending"),
          lt(affiliateReferrals.createdAt, cutoffDate)
        ));

      for (const commission of pendingCommissions) {
        try {
          await this.approveCommission(commission.id);
          approved++;
        } catch (error: any) {
          errors.push(`Failed to approve ${commission.id}: ${error.message}`);
        }
      }

      if (approved > 0) {
        console.log(`[AFFILIATE] Auto-approved ${approved} commissions`);
      }

      return { approved, errors };
    } catch (error: any) {
      errors.push(`Auto-approve failed: ${error.message}`);
      return { approved, errors };
    }
  }

  /**
   * Get flagged commissions for admin review queue.
   */
  async getFlaggedCommissions(): Promise<{
    id: string;
    affiliateCode: string;
    affiliateName: string;
    affiliateEmail: string;
    orderId: string;
    orderAmount: number;
    commissionAmount: number;
    flagReason: string | null;
    flagDetails: string | null;
    flaggedAt: string | null;
    customerName: string;
    customerEmail: string;
    customerIp: string | null;
    createdAt: string;
  }[]> {
    const data = await db
      .select({
        id: affiliateReferrals.id,
        affiliateId: affiliateReferrals.affiliateId,
        affiliateCode: affiliates.affiliateCode,
        affiliateName: customers.name,
        affiliateEmail: customers.email,
        orderId: affiliateReferrals.orderId,
        orderAmount: affiliateReferrals.orderAmount,
        commissionAmount: affiliateReferrals.commissionAmount,
        flagReason: affiliateReferrals.flagReason,
        flagDetails: affiliateReferrals.flagDetails,
        flaggedAt: affiliateReferrals.flaggedAt,
        customerIp: affiliateReferrals.customerIp,
        createdAt: affiliateReferrals.createdAt,
      })
      .from(affiliateReferrals)
      .innerJoin(affiliates, eq(affiliateReferrals.affiliateId, affiliates.id))
      .innerJoin(customers, eq(affiliates.customerId, customers.id))
      .where(eq(affiliateReferrals.status, "flagged"))
      .orderBy(desc(affiliateReferrals.createdAt));

    // Get customer info from orders
    const results = await Promise.all(
      data.map(async (row) => {
        const [order] = await db
          .select({ customerId: orders.customerId })
          .from(orders)
          .where(eq(orders.id, row.orderId));

        let customerName = "Unknown";
        let customerEmail = "Unknown";
        if (order) {
          const [cust] = await db
            .select({ name: customers.name, email: customers.email })
            .from(customers)
            .where(eq(customers.id, order.customerId));
          if (cust) {
            customerName = cust.name;
            customerEmail = cust.email;
          }
        }

        return {
          id: row.id,
          affiliateCode: row.affiliateCode,
          affiliateName: row.affiliateName,
          affiliateEmail: row.affiliateEmail,
          orderId: row.orderId,
          orderAmount: row.orderAmount,
          commissionAmount: row.commissionAmount,
          flagReason: row.flagReason,
          flagDetails: row.flagDetails,
          flaggedAt: row.flaggedAt?.toISOString() || null,
          customerName,
          customerEmail,
          customerIp: row.customerIp,
          createdAt: row.createdAt.toISOString(),
        };
      })
    );

    return results;
  }

  /**
   * Manually approve a commission (handles both pending and flagged).
   */
  async approveCommission(referralId: string, adminId?: string, notes?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const [referral] = await db
        .select()
        .from(affiliateReferrals)
        .where(eq(affiliateReferrals.id, referralId));

      if (!referral) {
        return { success: false, error: "Commission not found" };
      }

      if (referral.status !== "pending" && referral.status !== "flagged") {
        return { success: false, error: `Cannot approve commission with status: ${referral.status}` };
      }

      const wasFlagged = referral.status === "flagged";

      await db
        .update(affiliateReferrals)
        .set({
          status: "approved",
          approvedAt: new Date(),
          reviewedBy: adminId || null,
          reviewedAt: wasFlagged ? new Date() : null,
          reviewNotes: notes || null,
        })
        .where(eq(affiliateReferrals.id, referralId));

      // If it was flagged, we need to add it to affiliate totals now
      if (wasFlagged) {
        const [order] = await db
          .select()
          .from(orders)
          .where(eq(orders.id, referral.orderId));

        if (order) {
          await db
            .update(affiliates)
            .set({
              totalReferrals: sql`${affiliates.totalReferrals} + 1`,
              totalSales: sql`${affiliates.totalSales} + ${order.totalAmount}`,
              totalEarnings: sql`${affiliates.totalEarnings} + ${referral.commissionAmount}`,
              pendingBalance: sql`${affiliates.pendingBalance} + ${referral.commissionAmount}`,
              updatedAt: new Date(),
            })
            .where(eq(affiliates.id, referral.affiliateId));
        }
      }

      console.log(`[AFFILIATE] Approved${wasFlagged ? " (from flagged)" : ""} commission ${referralId}`);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Void a commission (e.g., if order is refunded or flagged for fraud).
   */
  async voidCommission(referralId: string, reason?: string, adminId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const [referral] = await db
        .select()
        .from(affiliateReferrals)
        .where(eq(affiliateReferrals.id, referralId));

      if (!referral) {
        return { success: false, error: "Commission not found" };
      }

      if (referral.status === "paid") {
        return { success: false, error: "Cannot void a paid commission" };
      }

      const wasFlagged = referral.status === "flagged";

      await db
        .update(affiliateReferrals)
        .set({ 
          status: "void",
          reviewedBy: adminId || null,
          reviewedAt: wasFlagged ? new Date() : null,
          reviewNotes: reason || null,
        })
        .where(eq(affiliateReferrals.id, referralId));

      // Only subtract from balances if it wasn't flagged (flagged never added to balance)
      if (!wasFlagged && referral.status === "pending") {
        await db
          .update(affiliates)
          .set({
            totalEarnings: sql`${affiliates.totalEarnings} - ${referral.commissionAmount}`,
            pendingBalance: sql`${affiliates.pendingBalance} - ${referral.commissionAmount}`,
            updatedAt: new Date(),
          })
          .where(eq(affiliates.id, referral.affiliateId));
      }

      console.log(`[AFFILIATE] Voided commission ${referralId}: ${reason || "no reason"}`);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get affiliate leaderboard with stats including conversion rate.
   */
  async getLeaderboard(limit: number = 20): Promise<AffiliateStats[]> {
    const data = await db
      .select({
        affiliateId: affiliates.id,
        affiliateCode: affiliates.affiliateCode,
        customerName: customers.name,
        email: customers.email,
        status: affiliates.status,
        totalRevenue: affiliates.totalSales,
        totalCommission: affiliates.totalEarnings,
        pendingCommission: affiliates.pendingBalance,
        paidCommission: affiliates.paidBalance,
        totalOrders: affiliates.totalReferrals,
        totalClicks: affiliates.totalClicks,
        createdAt: affiliates.createdAt,
      })
      .from(affiliates)
      .innerJoin(customers, eq(affiliates.customerId, customers.id))
      .orderBy(sql`${affiliates.totalSales} DESC`)
      .limit(limit);

    return data.map((row) => ({
      affiliateId: row.affiliateId,
      affiliateCode: row.affiliateCode,
      customerName: row.customerName,
      email: row.email,
      status: row.status,
      totalRevenue: row.totalRevenue,
      totalCommission: row.totalCommission,
      pendingCommission: row.pendingCommission,
      paidCommission: row.paidCommission,
      totalOrders: row.totalOrders,
      approvedCommission: row.totalCommission - row.pendingCommission - row.paidCommission,
      conversionRate: row.totalClicks > 0 
        ? Math.round((row.totalOrders / row.totalClicks) * 10000) / 100
        : 0,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  /**
   * Get commission details for an affiliate.
   */
  async getAffiliateCommissions(affiliateId: string): Promise<CommissionDetail[]> {
    const data = await db
      .select({
        id: affiliateReferrals.id,
        orderId: affiliateReferrals.orderId,
        orderAmount: affiliateReferrals.orderAmount,
        commissionRate: affiliateReferrals.commissionRate,
        commissionAmount: affiliateReferrals.commissionAmount,
        status: affiliateReferrals.status,
        createdAt: affiliateReferrals.createdAt,
        approvedAt: affiliateReferrals.approvedAt,
        paidAt: affiliateReferrals.paidAt,
        customerName: customers.name,
        customerEmail: customers.email,
      })
      .from(affiliateReferrals)
      .innerJoin(orders, eq(affiliateReferrals.orderId, orders.id))
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .where(eq(affiliateReferrals.affiliateId, affiliateId))
      .orderBy(sql`${affiliateReferrals.createdAt} DESC`);

    return data.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      approvedAt: row.approvedAt?.toISOString() || null,
      paidAt: row.paidAt?.toISOString() || null,
    }));
  }

  /**
   * Get referred customers for an affiliate.
   */
  async getReferredCustomers(affiliateId: string): Promise<any[]> {
    const [affiliate] = await db
      .select()
      .from(affiliates)
      .where(eq(affiliates.id, affiliateId));

    if (!affiliate) return [];

    // Find customers who ordered using this affiliate's code
    const data = await db
      .select({
        customerId: customers.id,
        customerName: customers.name,
        email: customers.email,
        totalSpent: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)::int`,
        orderCount: sql<number>`COUNT(DISTINCT ${orders.id})::int`,
        firstOrderDate: sql<string>`MIN(${orders.createdAt})::text`,
        lastOrderDate: sql<string>`MAX(${orders.createdAt})::text`,
      })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .where(and(
        eq(orders.affiliateCode, affiliate.affiliateCode),
        sql`${orders.status} IN ('paid', 'shipped', 'delivered')`
      ))
      .groupBy(customers.id, customers.name, customers.email)
      .orderBy(sql`SUM(${orders.totalAmount}) DESC`);

    return data;
  }

  /**
   * Get affiliate lifetime stats for portal.
   */
  async getAffiliateLifetimeStats(affiliateId: string): Promise<{
    totalRevenue: number;
    totalCommission: number;
    pendingCommission: number;
    approvedCommission: number;
    paidCommission: number;
    totalOrders: number;
    totalCustomers: number;
    avgOrderValue: number;
  } | null> {
    const [affiliate] = await db
      .select()
      .from(affiliates)
      .where(eq(affiliates.id, affiliateId));

    if (!affiliate) return null;

    // Get unique customer count
    const [customerCount] = await db
      .select({
        count: sql<number>`COUNT(DISTINCT ${orders.customerId})::int`,
      })
      .from(orders)
      .where(and(
        eq(orders.affiliateCode, affiliate.affiliateCode),
        sql`${orders.status} IN ('paid', 'shipped', 'delivered')`
      ));

    return {
      totalRevenue: affiliate.totalSales,
      totalCommission: affiliate.totalEarnings,
      pendingCommission: affiliate.pendingBalance,
      approvedCommission: affiliate.totalEarnings - affiliate.pendingBalance - affiliate.paidBalance,
      paidCommission: affiliate.paidBalance,
      totalOrders: affiliate.totalReferrals,
      totalCustomers: customerCount?.count || 0,
      avgOrderValue: affiliate.totalReferrals > 0 
        ? Math.floor(affiliate.totalSales / affiliate.totalReferrals) 
        : 0,
    };
  }
}

export const affiliateCommissionService = new AffiliateCommissionService();
