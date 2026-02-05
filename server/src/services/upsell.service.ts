import { storage } from "../../storage";
import type { Product, UpsellEvent, PostPurchaseOffer } from "@shared/schema";

export class UpsellService {
  /**
   * Get upsell suggestions for products in cart
   * Returns related products that can be upsold/cross-sold
   */
  async getCartUpsells(cartProductIds: string[]): Promise<{
    frequentlyBoughtTogether: Product[];
    accessories: Product[];
  }> {
    const frequentlyBoughtTogether: Product[] = [];
    const accessories: Product[] = [];
    const seenIds = new Set(cartProductIds);

    for (const productId of cartProductIds) {
      // Get frequently bought together
      const fbtRelations = await storage.getProductRelationships(productId, "frequently_bought_together");
      for (const rel of fbtRelations) {
        if (!seenIds.has(rel.relatedProductId)) {
          const product = await storage.getProduct(rel.relatedProductId);
          if (product && product.active) {
            frequentlyBoughtTogether.push(product);
            seenIds.add(rel.relatedProductId);
          }
        }
      }

      // Get accessories
      const accessoryRelations = await storage.getProductRelationships(productId, "accessory");
      for (const rel of accessoryRelations) {
        if (!seenIds.has(rel.relatedProductId)) {
          const product = await storage.getProduct(rel.relatedProductId);
          if (product && product.active) {
            accessories.push(product);
            seenIds.add(rel.relatedProductId);
          }
        }
      }
    }

    return { frequentlyBoughtTogether, accessories };
  }

  /**
   * Create post-purchase upsell offer for an order
   */
  async createPostPurchaseOffer(
    orderId: string,
    productId: string,
    originalPrice: number,
    discountPercent: number = 10
  ): Promise<PostPurchaseOffer> {
    const discountedPrice = Math.round(originalPrice * (1 - discountPercent / 100));
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    return storage.createPostPurchaseOffer({
      orderId,
      productId,
      originalPrice,
      discountedPrice,
      status: "pending",
      expiresAt,
    });
  }

  /**
   * Get pending post-purchase offer for an order
   */
  async getPendingOffer(orderId: string): Promise<PostPurchaseOffer | undefined> {
    const offer = await storage.getPendingPostPurchaseOffer(orderId);
    if (offer && offer.expiresAt < new Date()) {
      // Expire the offer
      await storage.updatePostPurchaseOffer(offer.id, { status: "expired" });
      return undefined;
    }
    return offer;
  }

  /**
   * Accept a post-purchase offer - adds product to order
   */
  async acceptOffer(offerId: string): Promise<{ success: boolean; message: string }> {
    const offers = await storage.getPostPurchaseOffers("");
    const offer = offers.find(o => o.id === offerId);
    
    if (!offer) {
      return { success: false, message: "Offer not found" };
    }

    if (offer.status !== "pending") {
      return { success: false, message: "Offer is no longer available" };
    }

    if (offer.expiresAt < new Date()) {
      await storage.updatePostPurchaseOffer(offer.id, { status: "expired" });
      return { success: false, message: "Offer has expired" };
    }

    // Get the order and add the product
    const order = await storage.getOrder(offer.orderId);
    if (!order || order.status === "shipped" || order.status === "delivered") {
      return { success: false, message: "Order has already shipped" };
    }

    const product = await storage.getProduct(offer.productId);
    if (!product) {
      return { success: false, message: "Product not found" };
    }

    // Add item to order
    await storage.createOrderItem({
      orderId: offer.orderId,
      productId: offer.productId,
      productName: product.name,
      unitPrice: offer.discountedPrice,
      quantity: 1,
    });

    // Update order total
    await storage.updateOrder(offer.orderId, {
      totalAmount: order.totalAmount + offer.discountedPrice,
    });

    // Mark offer as accepted
    await storage.updatePostPurchaseOffer(offer.id, {
      status: "accepted",
      acceptedAt: new Date(),
    });

    // Get order items for tracking
    const orderItems = await storage.getOrderItems(offer.orderId);

    // Track conversion event
    await this.trackEvent({
      orderId: offer.orderId,
      productId: orderItems?.[0]?.productId || "",
      upsellProductId: offer.productId,
      upsellType: "post_purchase",
      eventType: "conversion",
      revenue: offer.discountedPrice,
    });

    return { success: true, message: "Product added to your order!" };
  }

  /**
   * Track upsell event (impression, click, conversion)
   */
  async trackEvent(data: {
    orderId?: string;
    customerId?: string;
    productId: string;
    upsellProductId: string;
    upsellType: string;
    eventType: string;
    revenue?: number;
  }): Promise<UpsellEvent> {
    return storage.createUpsellEvent({
      orderId: data.orderId || null,
      customerId: data.customerId || null,
      productId: data.productId,
      upsellProductId: data.upsellProductId,
      upsellType: data.upsellType,
      eventType: data.eventType,
      revenue: data.revenue || 0,
    });
  }

  /**
   * Get upsell analytics
   */
  async getAnalytics(startDate?: Date, endDate?: Date): Promise<{
    totalImpressions: number;
    totalClicks: number;
    totalConversions: number;
    totalRevenue: number;
    conversionRate: number;
    revenueUplift: number;
    byType: Record<string, { impressions: number; clicks: number; conversions: number; revenue: number }>;
    byProduct: Array<{ productId: string; productName: string; conversions: number; revenue: number; attachRate: number }>;
  }> {
    const events = await storage.getUpsellEvents(startDate, endDate);
    
    const impressions = events.filter(e => e.eventType === "impression");
    const clicks = events.filter(e => e.eventType === "click");
    const conversions = events.filter(e => e.eventType === "conversion");
    
    const totalImpressions = impressions.length;
    const totalClicks = clicks.length;
    const totalConversions = conversions.length;
    const totalRevenue = conversions.reduce((sum, e) => sum + (e.revenue || 0), 0);
    const conversionRate = totalImpressions > 0 ? (totalConversions / totalImpressions) * 100 : 0;

    // Group by type
    const byType: Record<string, { impressions: number; clicks: number; conversions: number; revenue: number }> = {};
    for (const event of events) {
      if (!byType[event.upsellType]) {
        byType[event.upsellType] = { impressions: 0, clicks: 0, conversions: 0, revenue: 0 };
      }
      if (event.eventType === "impression") byType[event.upsellType].impressions++;
      if (event.eventType === "click") byType[event.upsellType].clicks++;
      if (event.eventType === "conversion") {
        byType[event.upsellType].conversions++;
        byType[event.upsellType].revenue += event.revenue || 0;
      }
    }

    // Group by product
    const productStats: Record<string, { conversions: number; revenue: number; impressions: number }> = {};
    for (const event of events) {
      const pid = event.upsellProductId;
      if (!productStats[pid]) {
        productStats[pid] = { conversions: 0, revenue: 0, impressions: 0 };
      }
      if (event.eventType === "impression") productStats[pid].impressions++;
      if (event.eventType === "conversion") {
        productStats[pid].conversions++;
        productStats[pid].revenue += event.revenue || 0;
      }
    }

    const byProduct = await Promise.all(
      Object.entries(productStats).map(async ([productId, stats]) => {
        const product = await storage.getProduct(productId);
        return {
          productId,
          productName: product?.name || "Unknown",
          conversions: stats.conversions,
          revenue: stats.revenue,
          attachRate: stats.impressions > 0 ? (stats.conversions / stats.impressions) * 100 : 0,
        };
      })
    );

    // Sort by revenue
    byProduct.sort((a, b) => b.revenue - a.revenue);

    return {
      totalImpressions,
      totalClicks,
      totalConversions,
      totalRevenue,
      conversionRate,
      revenueUplift: totalRevenue, // This would need baseline comparison for true uplift
      byType,
      byProduct: byProduct.slice(0, 10),
    };
  }
}

export const upsellService = new UpsellService();
