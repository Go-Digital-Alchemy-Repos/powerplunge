import { db } from "../../db";
import { orders, orderItems, refunds, affiliateReferrals, affiliates, customers, products } from "@shared/schema";
import { sql, eq, and, gte, lte, desc, count, sum, avg, isNotNull } from "drizzle-orm";

export interface DateRange {
  start: Date;
  end: Date;
}

export interface RevenueFilters {
  dateRange?: DateRange;
  channel?: "all" | "affiliate" | "direct";
  productId?: string;
  couponCode?: string;
}

export interface RevenueMetrics {
  grossRevenue: number;
  netRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  refundTotal: number;
  refundRate: number;
  affiliateRevenue: number;
  affiliateRevenuePercent: number;
  topProductId: string | null;
  topProductName: string | null;
  topProductRevenue: number;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface ProductRevenue {
  productId: string;
  productName: string;
  revenue: number;
  unitsSold: number;
  orderCount: number;
}

export interface AffiliateRevenue {
  affiliateId: string;
  affiliateCode: string;
  customerName: string;
  revenue: number;
  orderCount: number;
  commission: number;
}

export interface CustomerLTV {
  customerId: string;
  customerName: string;
  email: string;
  totalSpent: number;
  orderCount: number;
  firstOrderDate: string;
  lastOrderDate: string;
}

// Simple in-memory cache for expensive queries
const cache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute cache

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && entry.expires > Date.now()) {
    return entry.data as T;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL });
}

function buildCacheKey(prefix: string, filters: RevenueFilters): string {
  return `${prefix}:${JSON.stringify(filters)}`;
}

export class RevenueAnalyticsService {
  
  async getMetrics(filters: RevenueFilters): Promise<RevenueMetrics> {
    const cacheKey = buildCacheKey("metrics", filters);
    const cached = getCached<RevenueMetrics>(cacheKey);
    if (cached) return cached;

    const { start, end } = this.getDateRange(filters);
    
    // Build base conditions for orders
    const conditions: any[] = [
      gte(orders.createdAt, start),
      lte(orders.createdAt, end),
    ];
    
    // Only count paid/shipped/delivered orders for revenue
    conditions.push(
      sql`${orders.status} IN ('paid', 'shipped', 'delivered')`
    );

    if (filters.channel === "affiliate") {
      conditions.push(isNotNull(orders.affiliateCode));
    } else if (filters.channel === "direct") {
      conditions.push(sql`${orders.affiliateCode} IS NULL`);
    }

    // Get gross revenue and order stats
    const [revenueStats] = await db
      .select({
        grossRevenue: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)::int`,
        totalOrders: sql<number>`COUNT(*)::int`,
        averageOrderValue: sql<number>`COALESCE(AVG(${orders.totalAmount}), 0)::int`,
      })
      .from(orders)
      .where(and(...conditions));

    // Get affiliate revenue
    const [affiliateStats] = await db
      .select({
        affiliateRevenue: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)::int`,
      })
      .from(orders)
      .where(and(
        ...conditions,
        isNotNull(orders.affiliateCode)
      ));

    // Get refunds in date range
    const [refundStats] = await db
      .select({
        refundTotal: sql<number>`COALESCE(SUM(${refunds.amount}), 0)::int`,
        refundCount: sql<number>`COUNT(*)::int`,
      })
      .from(refunds)
      .innerJoin(orders, eq(refunds.orderId, orders.id))
      .where(and(
        gte(refunds.createdAt, start),
        lte(refunds.createdAt, end),
        eq(refunds.status, "processed")
      ));

    // Get top product by revenue
    const topProducts = await db
      .select({
        productId: orderItems.productId,
        productName: orderItems.productName,
        revenue: sql<number>`SUM(${orderItems.unitPrice} * ${orderItems.quantity})::int`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(...conditions))
      .groupBy(orderItems.productId, orderItems.productName)
      .orderBy(desc(sql`SUM(${orderItems.unitPrice} * ${orderItems.quantity})`))
      .limit(1);

    const grossRevenue = revenueStats?.grossRevenue || 0;
    const refundTotal = refundStats?.refundTotal || 0;
    const netRevenue = grossRevenue - refundTotal;
    const totalOrders = revenueStats?.totalOrders || 0;
    const affiliateRevenue = affiliateStats?.affiliateRevenue || 0;

    const metrics: RevenueMetrics = {
      grossRevenue,
      netRevenue,
      totalOrders,
      averageOrderValue: revenueStats?.averageOrderValue || 0,
      refundTotal,
      refundRate: grossRevenue > 0 ? (refundTotal / grossRevenue) * 100 : 0,
      affiliateRevenue,
      affiliateRevenuePercent: grossRevenue > 0 ? (affiliateRevenue / grossRevenue) * 100 : 0,
      topProductId: topProducts[0]?.productId || null,
      topProductName: topProducts[0]?.productName || null,
      topProductRevenue: topProducts[0]?.revenue || 0,
    };

    setCache(cacheKey, metrics);
    return metrics;
  }

  async getRevenueTimeSeries(filters: RevenueFilters): Promise<TimeSeriesPoint[]> {
    const cacheKey = buildCacheKey("revenueSeries", filters);
    const cached = getCached<TimeSeriesPoint[]>(cacheKey);
    if (cached) return cached;

    const { start, end } = this.getDateRange(filters);
    
    const conditions: any[] = [
      gte(orders.createdAt, start),
      lte(orders.createdAt, end),
      sql`${orders.status} IN ('paid', 'shipped', 'delivered')`,
    ];

    if (filters.channel === "affiliate") {
      conditions.push(isNotNull(orders.affiliateCode));
    } else if (filters.channel === "direct") {
      conditions.push(sql`${orders.affiliateCode} IS NULL`);
    }

    const data = await db
      .select({
        date: sql<string>`DATE(${orders.createdAt})::text`,
        value: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)::int`,
      })
      .from(orders)
      .where(and(...conditions))
      .groupBy(sql`DATE(${orders.createdAt})`)
      .orderBy(sql`DATE(${orders.createdAt})`);

    setCache(cacheKey, data);
    return data;
  }

  async getOrdersTimeSeries(filters: RevenueFilters): Promise<TimeSeriesPoint[]> {
    const cacheKey = buildCacheKey("ordersSeries", filters);
    const cached = getCached<TimeSeriesPoint[]>(cacheKey);
    if (cached) return cached;

    const { start, end } = this.getDateRange(filters);
    
    const conditions: any[] = [
      gte(orders.createdAt, start),
      lte(orders.createdAt, end),
      sql`${orders.status} IN ('paid', 'shipped', 'delivered')`,
    ];

    const data = await db
      .select({
        date: sql<string>`DATE(${orders.createdAt})::text`,
        value: sql<number>`COUNT(*)::int`,
      })
      .from(orders)
      .where(and(...conditions))
      .groupBy(sql`DATE(${orders.createdAt})`)
      .orderBy(sql`DATE(${orders.createdAt})`);

    setCache(cacheKey, data);
    return data;
  }

  async getAOVTimeSeries(filters: RevenueFilters): Promise<TimeSeriesPoint[]> {
    const cacheKey = buildCacheKey("aovSeries", filters);
    const cached = getCached<TimeSeriesPoint[]>(cacheKey);
    if (cached) return cached;

    const { start, end } = this.getDateRange(filters);
    
    const data = await db
      .select({
        date: sql<string>`DATE(${orders.createdAt})::text`,
        value: sql<number>`COALESCE(AVG(${orders.totalAmount}), 0)::int`,
      })
      .from(orders)
      .where(and(
        gte(orders.createdAt, start),
        lte(orders.createdAt, end),
        sql`${orders.status} IN ('paid', 'shipped', 'delivered')`
      ))
      .groupBy(sql`DATE(${orders.createdAt})`)
      .orderBy(sql`DATE(${orders.createdAt})`);

    setCache(cacheKey, data);
    return data;
  }

  async getRefundsTimeSeries(filters: RevenueFilters): Promise<TimeSeriesPoint[]> {
    const cacheKey = buildCacheKey("refundsSeries", filters);
    const cached = getCached<TimeSeriesPoint[]>(cacheKey);
    if (cached) return cached;

    const { start, end } = this.getDateRange(filters);
    
    const data = await db
      .select({
        date: sql<string>`DATE(${refunds.createdAt})::text`,
        value: sql<number>`COALESCE(SUM(${refunds.amount}), 0)::int`,
      })
      .from(refunds)
      .where(and(
        gte(refunds.createdAt, start),
        lte(refunds.createdAt, end),
        eq(refunds.status, "processed")
      ))
      .groupBy(sql`DATE(${refunds.createdAt})`)
      .orderBy(sql`DATE(${refunds.createdAt})`);

    setCache(cacheKey, data);
    return data;
  }

  async getAffiliateVsDirectRevenue(filters: RevenueFilters): Promise<{ affiliate: number; direct: number }> {
    const cacheKey = buildCacheKey("affiliateVsDirect", filters);
    const cached = getCached<{ affiliate: number; direct: number }>(cacheKey);
    if (cached) return cached;

    const { start, end } = this.getDateRange(filters);
    
    const baseConditions = [
      gte(orders.createdAt, start),
      lte(orders.createdAt, end),
      sql`${orders.status} IN ('paid', 'shipped', 'delivered')`,
    ];

    const [affiliateResult] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)::int`,
      })
      .from(orders)
      .where(and(...baseConditions, isNotNull(orders.affiliateCode)));

    const [directResult] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)::int`,
      })
      .from(orders)
      .where(and(...baseConditions, sql`${orders.affiliateCode} IS NULL`));

    const result = {
      affiliate: affiliateResult?.total || 0,
      direct: directResult?.total || 0,
    };

    setCache(cacheKey, result);
    return result;
  }

  async getTopProductsByRevenue(filters: RevenueFilters, limit: number = 10): Promise<ProductRevenue[]> {
    const cacheKey = buildCacheKey(`topProducts:${limit}`, filters);
    const cached = getCached<ProductRevenue[]>(cacheKey);
    if (cached) return cached;

    const { start, end } = this.getDateRange(filters);
    
    const conditions: any[] = [
      gte(orders.createdAt, start),
      lte(orders.createdAt, end),
      sql`${orders.status} IN ('paid', 'shipped', 'delivered')`,
    ];

    if (filters.productId) {
      conditions.push(eq(orderItems.productId, filters.productId));
    }

    const data = await db
      .select({
        productId: orderItems.productId,
        productName: orderItems.productName,
        revenue: sql<number>`SUM(${orderItems.unitPrice} * ${orderItems.quantity})::int`,
        unitsSold: sql<number>`SUM(${orderItems.quantity})::int`,
        orderCount: sql<number>`COUNT(DISTINCT ${orders.id})::int`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(...conditions))
      .groupBy(orderItems.productId, orderItems.productName)
      .orderBy(desc(sql`SUM(${orderItems.unitPrice} * ${orderItems.quantity})`))
      .limit(limit);

    setCache(cacheKey, data);
    return data;
  }

  async getTopAffiliatesByRevenue(filters: RevenueFilters, limit: number = 10): Promise<AffiliateRevenue[]> {
    const cacheKey = buildCacheKey(`topAffiliates:${limit}`, filters);
    const cached = getCached<AffiliateRevenue[]>(cacheKey);
    if (cached) return cached;

    const { start, end } = this.getDateRange(filters);
    
    const data = await db
      .select({
        affiliateId: affiliates.id,
        affiliateCode: affiliates.affiliateCode,
        customerName: customers.name,
        revenue: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)::int`,
        orderCount: sql<number>`COUNT(DISTINCT ${orders.id})::int`,
        commission: sql<number>`COALESCE(SUM(${affiliateReferrals.commissionAmount}), 0)::int`,
      })
      .from(affiliateReferrals)
      .innerJoin(affiliates, eq(affiliateReferrals.affiliateId, affiliates.id))
      .innerJoin(customers, eq(affiliates.customerId, customers.id))
      .innerJoin(orders, eq(affiliateReferrals.orderId, orders.id))
      .where(and(
        gte(orders.createdAt, start),
        lte(orders.createdAt, end),
        sql`${orders.status} IN ('paid', 'shipped', 'delivered')`
      ))
      .groupBy(affiliates.id, affiliates.affiliateCode, customers.name)
      .orderBy(desc(sql`SUM(${orders.totalAmount})`))
      .limit(limit);

    setCache(cacheKey, data);
    return data;
  }

  async getTopCustomersByLTV(filters: RevenueFilters, limit: number = 10): Promise<CustomerLTV[]> {
    const cacheKey = buildCacheKey(`topCustomers:${limit}`, filters);
    const cached = getCached<CustomerLTV[]>(cacheKey);
    if (cached) return cached;

    const { start, end } = this.getDateRange(filters);
    
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
      .from(customers)
      .innerJoin(orders, eq(orders.customerId, customers.id))
      .where(and(
        gte(orders.createdAt, start),
        lte(orders.createdAt, end),
        sql`${orders.status} IN ('paid', 'shipped', 'delivered')`
      ))
      .groupBy(customers.id, customers.name, customers.email)
      .orderBy(desc(sql`SUM(${orders.totalAmount})`))
      .limit(limit);

    setCache(cacheKey, data);
    return data;
  }

  async getAvailableProducts(): Promise<{ id: string; name: string }[]> {
    return db
      .select({ id: products.id, name: products.name })
      .from(products)
      .where(eq(products.active, true))
      .orderBy(products.name);
  }

  private getDateRange(filters: RevenueFilters): DateRange {
    if (filters.dateRange) {
      return filters.dateRange;
    }
    // Default to last 30 days
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { start, end };
  }
}

export const revenueAnalyticsService = new RevenueAnalyticsService();
