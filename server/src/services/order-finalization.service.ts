import type { Order, InsertOrder, InsertCouponRedemption } from "@shared/schema";
import type { IStorage } from "../../storage";

type PaymentIntentMetadata = Record<string, string | undefined>;

export interface StripePaymentIntentForFinalization {
  id: string;
  amount: number;
  currency?: string | null;
  metadata?: PaymentIntentMetadata | null;
}

export interface FinalizeStripePaymentIntentInput {
  paymentIntent: StripePaymentIntentForFinalization;
  orderUpdate?: Partial<InsertOrder>;
}

export type OrderFinalizationResult =
  | { status: "finalized"; orderId: string; order: Order }
  | { status: "skipped"; orderId?: string; reason: string; order?: Order };

export interface OrderFinalizationDependencies {
  storage: Pick<IStorage, "getOrder" | "markOrderPaidIfPending" | "createCouponRedemption" | "incrementCouponUsage">;
  createTaxTransaction: (calculationId: string, reference: string) => Promise<void>;
  recordAffiliateCommission: (
    orderId: string,
    options: { sessionId?: string; attributionType?: string; isFriendsFamily?: boolean },
  ) => Promise<unknown>;
  enqueueMetaPurchase: (orderId: string) => Promise<unknown>;
  sendOrderNotification: (orderId: string) => Promise<void>;
  log: Pick<Console, "info" | "warn" | "error">;
}

function parsePositiveInteger(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export class OrderFinalizationService {
  constructor(private readonly deps: OrderFinalizationDependencies) {}

  async finalizeStripePaymentIntent(input: FinalizeStripePaymentIntentInput): Promise<OrderFinalizationResult> {
    const { paymentIntent } = input;
    const orderId = paymentIntent.metadata?.orderId;
    if (!orderId) {
      return { status: "skipped", reason: "missing_order_id" };
    }

    const existingOrder = await this.deps.storage.getOrder(orderId);
    if (!existingOrder) {
      return { status: "skipped", orderId, reason: "order_not_found" };
    }

    if (paymentIntent.amount !== existingOrder.totalAmount) {
      this.deps.log.error("PaymentIntent amount mismatch for order finalization", {
        orderId,
        paymentAmount: paymentIntent.amount,
        orderAmount: existingOrder.totalAmount,
      });
      return { status: "skipped", orderId, reason: "amount_mismatch", order: existingOrder };
    }

    if (paymentIntent.currency?.toLowerCase() !== "usd") {
      this.deps.log.error("PaymentIntent currency mismatch for order finalization", {
        orderId,
        paymentCurrency: paymentIntent.currency,
      });
      return { status: "skipped", orderId, reason: "currency_mismatch", order: existingOrder };
    }

    const paidOrder = await this.deps.storage.markOrderPaidIfPending(orderId, {
      ...input.orderUpdate,
      stripePaymentIntentId: paymentIntent.id,
    });

    if (!paidOrder) {
      return { status: "skipped", orderId, reason: "claim_not_won", order: existingOrder };
    }

    await this.createStripeTaxTransaction(paidOrder);
    await this.recordCouponRedemption(paidOrder, paymentIntent.metadata || {});
    await this.recordAffiliateCommission(paidOrder, paymentIntent.metadata || {});
    await this.enqueueMetaPurchase(paidOrder.id);
    await this.deps.sendOrderNotification(paidOrder.id);

    return { status: "finalized", orderId, order: paidOrder };
  }

  private async createStripeTaxTransaction(order: Order): Promise<void> {
    if (!order.stripeTaxCalculationId) return;
    try {
      await this.deps.createTaxTransaction(order.stripeTaxCalculationId, order.id);
      this.deps.log.info(`[TAX] Created tax transaction for order ${order.id}`);
    } catch (error: any) {
      this.deps.log.error(`[TAX] Failed to create tax transaction for order ${order.id}:`, error?.message || error);
    }
  }

  private async recordCouponRedemption(order: Order, metadata: PaymentIntentMetadata): Promise<void> {
    const couponId = metadata.couponId;
    const discountAmount = parsePositiveInteger(metadata.couponDiscountAmount);
    if (!couponId || !discountAmount) return;

    try {
      const redemption: InsertCouponRedemption = {
        couponId,
        orderId: order.id,
        customerId: order.customerId,
        discountAmount,
        orderSubtotal: order.subtotalAmount || order.totalAmount,
        orderTotal: order.totalAmount,
        netRevenue: order.totalAmount - discountAmount,
        affiliateCode: order.affiliateCode || null,
        affiliateCommissionBlocked: metadata.couponBlocksAffiliate === "true",
      };
      await this.deps.storage.createCouponRedemption(redemption);
      await this.deps.storage.incrementCouponUsage(couponId);
      this.deps.log.info(`[ORDER_FINALIZATION] Recorded coupon redemption for order ${order.id}, coupon ${couponId}`);
    } catch (error: any) {
      this.deps.log.error("[ORDER_FINALIZATION] Failed to record coupon redemption:", error?.message || error);
    }
  }

  private async recordAffiliateCommission(order: Order, metadata: PaymentIntentMetadata): Promise<void> {
    if (!order.affiliateCode) return;

    const result = await this.deps.recordAffiliateCommission(order.id, {
      sessionId: metadata.affiliateSessionId || undefined,
      attributionType: metadata.attributionType || undefined,
      isFriendsFamily: metadata.isFriendsFamily === "true",
    });
    if ((result as any)?.success && (result as any)?.commissionAmount) {
      this.deps.log.info(`[ORDER_FINALIZATION] Recorded commission for order ${order.id}`);
    }
  }

  private async enqueueMetaPurchase(orderId: string): Promise<void> {
    try {
      await this.deps.enqueueMetaPurchase(orderId);
    } catch (error: any) {
      this.deps.log.error("[META] Failed to enqueue purchase event:", error?.message || error);
    }
  }
}

export function createOrderFinalizationService(params: {
  sendOrderNotification: (orderId: string) => Promise<void>;
  createTaxTransaction?: (calculationId: string, reference: string) => Promise<void>;
}): OrderFinalizationService {
  const storageDependency: OrderFinalizationDependencies["storage"] = {
    getOrder: async (...args) => (await import("../../storage")).storage.getOrder(...args),
    markOrderPaidIfPending: async (...args) => (await import("../../storage")).storage.markOrderPaidIfPending(...args),
    createCouponRedemption: async (...args) => (await import("../../storage")).storage.createCouponRedemption(...args),
    incrementCouponUsage: async (...args) => (await import("../../storage")).storage.incrementCouponUsage(...args),
  };

  return new OrderFinalizationService({
    storage: storageDependency,
    createTaxTransaction: params.createTaxTransaction || (async (calculationId, reference) => {
      const { stripeService } = await import("../integrations/stripe/StripeService");
      const stripeClient = await stripeService.getClient();
      if (!stripeClient) throw new Error("Stripe is not configured");
      await stripeClient.tax.transactions.createFromCalculation({
        calculation: calculationId,
        reference,
      });
    }),
    recordAffiliateCommission: async (orderId, options) => {
      const { affiliateCommissionService } = await import("./affiliate-commission.service");
      return affiliateCommissionService.recordCommission(orderId, options);
    },
    enqueueMetaPurchase: async (orderId) => {
      const { metaConversionsService } = await import("../integrations/meta/MetaConversionsService");
      return metaConversionsService.enqueuePurchase(orderId);
    },
    sendOrderNotification: params.sendOrderNotification,
    log: console,
  });
}
