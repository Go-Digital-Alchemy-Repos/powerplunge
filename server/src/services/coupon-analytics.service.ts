import { db } from "../db";
import { storage } from "../../storage";
import {
  coupons,
  couponRedemptions,
  orders,
  affiliateReferrals,
  Coupon,
  CouponRedemption,
} from "@shared/schema";
import { eq, sql, and, gte, lte, desc, isNull, or } from "drizzle-orm";

export interface CouponPerformance {
  couponId: string;
  code: string;
  description: string | null;
  type: string;
  value: number;
  active: boolean;
  timesUsed: number;
  totalOrderRevenue: number; // Total revenue from orders using this coupon
  totalDiscountGiven: number; // Total discount amount
  netRevenue: number; // Revenue after discount
  averageOrderValue: number;
  affiliateOverlap: number; // Orders with both coupon + affiliate
  affiliateCommissionBlocked: number; // How many times we blocked commission
  marginPercent: number; // (netRevenue / totalOrderRevenue) * 100
  isUnderperforming: boolean;
  autoExpireEnabled: boolean;
  autoExpiredAt: Date | null;
  createdAt: Date;
}

export interface CouponAnalyticsSummary {
  totalCoupons: number;
  activeCoupons: number;
  totalRedemptions: number;
  totalDiscountCost: number;
  totalNetRevenue: number;
  affiliateOverlapCount: number;
  averageMarginPercent: number;
  underperformingCount: number;
}

export interface StackingValidationResult {
  valid: boolean;
  blockAffiliateCommission: boolean;
  blockVipDiscount: boolean;
  message?: string;
  adjustedDiscount?: number;
}

class CouponAnalyticsService {
  async getCouponPerformance(days: number = 30): Promise<CouponPerformance[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const allCoupons = await db.select().from(coupons);
    
    const performances: CouponPerformance[] = [];

    for (const coupon of allCoupons) {
      const redemptions = await db
        .select()
        .from(couponRedemptions)
        .where(
          and(
            eq(couponRedemptions.couponId, coupon.id),
            gte(couponRedemptions.redeemedAt, startDate)
          )
        );

      const totalDiscountGiven = redemptions.reduce((sum, r) => sum + r.discountAmount, 0);
      const totalOrderRevenue = redemptions.reduce((sum, r) => sum + (r.orderTotal || 0), 0);
      const netRevenue = totalOrderRevenue - totalDiscountGiven;
      const affiliateOverlap = redemptions.filter(r => r.affiliateCode).length;
      const affiliateCommissionBlocked = redemptions.filter(r => r.affiliateCommissionBlocked).length;
      const marginPercent = totalOrderRevenue > 0 ? (netRevenue / totalOrderRevenue) * 100 : 0;
      
      const isUnderperforming = !!(coupon.autoExpireEnabled && 
        netRevenue < (coupon.autoExpireThreshold || 0) &&
        coupon.timesUsed > 0);

      performances.push({
        couponId: coupon.id,
        code: coupon.code,
        description: coupon.description,
        type: coupon.type,
        value: coupon.value,
        active: coupon.active,
        timesUsed: coupon.timesUsed,
        totalOrderRevenue,
        totalDiscountGiven,
        netRevenue,
        averageOrderValue: redemptions.length > 0 ? totalOrderRevenue / redemptions.length : 0,
        affiliateOverlap,
        affiliateCommissionBlocked,
        marginPercent,
        isUnderperforming,
        autoExpireEnabled: coupon.autoExpireEnabled || false,
        autoExpiredAt: coupon.autoExpiredAt,
        createdAt: coupon.createdAt,
      });
    }

    return performances.sort((a, b) => b.netRevenue - a.netRevenue);
  }

  async getAnalyticsSummary(days: number = 30): Promise<CouponAnalyticsSummary> {
    const performances = await this.getCouponPerformance(days);

    const totalCoupons = performances.length;
    const activeCoupons = performances.filter(p => p.active).length;
    const totalRedemptions = performances.reduce((sum, p) => sum + p.timesUsed, 0);
    const totalDiscountCost = performances.reduce((sum, p) => sum + p.totalDiscountGiven, 0);
    const totalNetRevenue = performances.reduce((sum, p) => sum + p.netRevenue, 0);
    const affiliateOverlapCount = performances.reduce((sum, p) => sum + p.affiliateOverlap, 0);
    const underperformingCount = performances.filter(p => p.isUnderperforming).length;
    
    const totalOrderRevenue = performances.reduce((sum, p) => sum + p.totalOrderRevenue, 0);
    const averageMarginPercent = totalOrderRevenue > 0 
      ? (totalNetRevenue / totalOrderRevenue) * 100 
      : 100;

    return {
      totalCoupons,
      activeCoupons,
      totalRedemptions,
      totalDiscountCost,
      totalNetRevenue,
      affiliateOverlapCount,
      averageMarginPercent,
      underperformingCount,
    };
  }

  async validateStacking(
    couponCode: string,
    hasAffiliate: boolean,
    hasVipDiscount: boolean,
    orderSubtotal: number
  ): Promise<StackingValidationResult> {
    const coupon = await storage.getCouponByCode(couponCode);
    
    if (!coupon) {
      return { valid: false, blockAffiliateCommission: false, blockVipDiscount: false, message: "Invalid coupon code" };
    }

    if (!coupon.active) {
      return { valid: false, blockAffiliateCommission: false, blockVipDiscount: false, message: "Coupon is inactive" };
    }

    const blockAffiliateCommission = coupon.blockAffiliateCommission || false;
    const blockVipDiscount = coupon.blockVipDiscount || false;

    if (blockVipDiscount && hasVipDiscount) {
      return {
        valid: false,
        blockAffiliateCommission,
        blockVipDiscount,
        message: "This coupon cannot be combined with VIP discounts",
      };
    }

    let adjustedDiscount: number | undefined;
    const minMargin = coupon.minMarginPercent || 0;
    
    if (minMargin > 0) {
      let discountAmount = 0;
      if (coupon.type === "percentage") {
        discountAmount = Math.round(orderSubtotal * (coupon.value / 100));
      } else if (coupon.type === "fixed") {
        discountAmount = coupon.value;
      }
      
      if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
        discountAmount = coupon.maxDiscountAmount;
      }

      const resultingRevenue = orderSubtotal - discountAmount;
      const resultingMargin = (resultingRevenue / orderSubtotal) * 100;

      if (resultingMargin < minMargin) {
        const maxAllowedDiscount = orderSubtotal * ((100 - minMargin) / 100);
        adjustedDiscount = Math.floor(maxAllowedDiscount);
      }
    }

    return {
      valid: true,
      blockAffiliateCommission,
      blockVipDiscount,
      adjustedDiscount,
    };
  }

  async shouldBlockAffiliateCommission(orderId: string): Promise<boolean> {
    const redemption = await db
      .select()
      .from(couponRedemptions)
      .where(eq(couponRedemptions.orderId, orderId))
      .limit(1);

    if (redemption.length === 0) return false;

    const coupon = await db
      .select()
      .from(coupons)
      .where(eq(coupons.id, redemption[0].couponId))
      .limit(1);

    if (coupon.length === 0) return false;

    if (coupon[0].blockAffiliateCommission) return true;

    const minMargin = coupon[0].minMarginPercent || 0;
    if (minMargin > 0 && redemption[0].netRevenue !== null) {
      const orderTotal = redemption[0].orderTotal || 0;
      const marginPercent = orderTotal > 0 ? (redemption[0].netRevenue / orderTotal) * 100 : 0;
      if (marginPercent < minMargin) return true;
    }

    return false;
  }

  async recordRedemption(
    couponId: string,
    orderId: string,
    customerId: string,
    discountAmount: number,
    orderSubtotal: number,
    orderTotal: number,
    affiliateCode?: string,
    affiliateCommissionBlocked: boolean = false
  ): Promise<void> {
    const netRevenue = orderTotal - discountAmount;

    await db.insert(couponRedemptions).values({
      couponId,
      orderId,
      customerId,
      discountAmount,
      orderSubtotal,
      orderTotal,
      netRevenue,
      affiliateCode,
      affiliateCommissionBlocked,
    });

    await db
      .update(coupons)
      .set({ timesUsed: sql`${coupons.timesUsed} + 1` })
      .where(eq(coupons.id, couponId));
  }

  async autoExpireUnderperformingCoupons(): Promise<string[]> {
    const now = new Date();
    const expiredCouponCodes: string[] = [];

    const eligibleCoupons = await db
      .select()
      .from(coupons)
      .where(
        and(
          eq(coupons.active, true),
          eq(coupons.autoExpireEnabled, true),
          isNull(coupons.autoExpiredAt)
        )
      );

    for (const coupon of eligibleCoupons) {
      const evaluationDays = coupon.autoExpireAfterDays || 30;
      const createdAt = new Date(coupon.createdAt);
      const evaluationDate = new Date(createdAt);
      evaluationDate.setDate(evaluationDate.getDate() + evaluationDays);

      if (now < evaluationDate) continue;

      const startDate = new Date(createdAt);
      const redemptions = await db
        .select()
        .from(couponRedemptions)
        .where(
          and(
            eq(couponRedemptions.couponId, coupon.id),
            gte(couponRedemptions.redeemedAt, startDate)
          )
        );

      const netRevenue = redemptions.reduce((sum, r) => sum + (r.netRevenue || 0), 0);
      const threshold = coupon.autoExpireThreshold || 0;

      if (netRevenue < threshold) {
        await db
          .update(coupons)
          .set({ active: false, autoExpiredAt: now })
          .where(eq(coupons.id, coupon.id));
        
        expiredCouponCodes.push(coupon.code);
      }
    }

    return expiredCouponCodes;
  }

  async disableCoupon(couponId: string): Promise<void> {
    await db
      .update(coupons)
      .set({ active: false })
      .where(eq(coupons.id, couponId));
  }

  async enableCoupon(couponId: string): Promise<void> {
    await db
      .update(coupons)
      .set({ active: true, autoExpiredAt: null })
      .where(eq(coupons.id, couponId));
  }
}

export const couponAnalyticsService = new CouponAnalyticsService();
