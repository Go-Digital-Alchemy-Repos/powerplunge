import type { Order, InsertOrder, InsertCouponRedemption } from "@shared/schema";
import type { IStorage } from "../../storage";
import { sendOrderNotification as defaultSendOrderNotification } from "./order-notification.service";

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

export interface StripeCheckoutSessionForFinalization {
  id: string;
  status?: string | null;
  payment_status?: string | null;
  client_reference_id?: string | null;
  amount_subtotal?: number | null;
  amount_total?: number | null;
  currency?: string | null;
  total_details?: {
    amount_tax?: number | null;
  } | null;
  automatic_tax?: {
    enabled?: boolean | null;
    status?: string | null;
  } | null;
  metadata?: PaymentIntentMetadata | null;
  payment_intent?: string | StripePaymentIntentForFinalization | null;
}

export interface FinalizeStripeCheckoutSessionInput {
  session: StripeCheckoutSessionForFinalization;
  orderUpdate?: Partial<InsertOrder>;
}

export type OrderFinalizationResult =
  | { status: "finalized"; orderId: string; order: Order }
  | { status: "skipped"; orderId?: string; reason: string; order?: Order };

export interface OrderFinalizationDependencies {
  storage: Pick<IStorage, "getOrder" | "getOrderByStripeSession" | "markOrderPaidIfPending" | "createCouponRedemption" | "incrementCouponUsage">;
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

    if (paymentIntent.metadata?.paymentFlow === "checkout_session") {
      return { status: "skipped", orderId, reason: "checkout_session_payment_intent", order: existingOrder };
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

    await this.runPaidObligations(paidOrder, paymentIntent.metadata || {});

    return { status: "finalized", orderId: existingOrder.id, order: paidOrder };
  }

  async finalizeStripeCheckoutSession(input: FinalizeStripeCheckoutSessionInput): Promise<OrderFinalizationResult> {
    const { session } = input;
    if (session.payment_status !== "paid" || session.status !== "complete") {
      return { status: "skipped", reason: "checkout_session_not_paid" };
    }

    const existingOrder = await this.deps.storage.getOrderByStripeSession(session.id);
    if (!existingOrder) {
      return { status: "skipped", reason: "order_not_found" };
    }

    const paymentIntent = typeof session.payment_intent === "object" ? session.payment_intent : undefined;
    const paymentIntentId = typeof session.payment_intent === "string"
      ? session.payment_intent
      : paymentIntent?.id;
    if (!paymentIntentId) {
      return { status: "skipped", orderId: existingOrder.id, reason: "missing_payment_intent", order: existingOrder };
    }

    const sessionOrderId = session.metadata?.orderId;
    const paymentIntentOrderId = paymentIntent?.metadata?.orderId;
    if (
      (session.client_reference_id && session.client_reference_id !== existingOrder.id) ||
      (sessionOrderId && sessionOrderId !== existingOrder.id) ||
      (paymentIntentOrderId && paymentIntentOrderId !== existingOrder.id)
    ) {
      this.deps.log.error("Checkout Session order identity mismatch for order finalization", {
        orderId: existingOrder.id,
        clientReferenceId: session.client_reference_id,
        sessionOrderId,
        paymentIntentOrderId,
      });
      return { status: "skipped", orderId: existingOrder.id, reason: "order_identity_mismatch", order: existingOrder };
    }

    if (session.amount_subtotal !== existingOrder.totalAmount) {
      this.deps.log.error("Checkout Session subtotal mismatch for order finalization", {
        orderId: existingOrder.id,
        sessionAmountSubtotal: session.amount_subtotal,
        orderAmount: existingOrder.totalAmount,
      });
      return { status: "skipped", orderId: existingOrder.id, reason: "amount_mismatch", order: existingOrder };
    }

    if (typeof session.amount_total !== "number") {
      return { status: "skipped", orderId: existingOrder.id, reason: "missing_amount_total", order: existingOrder };
    }

    if (session.currency?.toLowerCase() !== "usd") {
      this.deps.log.error("Checkout Session currency mismatch for order finalization", {
        orderId: existingOrder.id,
        sessionCurrency: session.currency,
      });
      return { status: "skipped", orderId: existingOrder.id, reason: "currency_mismatch", order: existingOrder };
    }

    if (session.automatic_tax?.enabled && session.automatic_tax.status !== "complete") {
      this.deps.log.error("Checkout Session automatic tax incomplete for order finalization", {
        orderId: existingOrder.id,
        automaticTaxStatus: session.automatic_tax.status,
      });
      return { status: "skipped", orderId: existingOrder.id, reason: "automatic_tax_incomplete", order: existingOrder };
    }

    const metadata = {
      ...(session.metadata || {}),
      ...(paymentIntent?.metadata || {}),
      orderId: existingOrder.id,
    };
    const paidOrder = await this.deps.storage.markOrderPaidIfPending(existingOrder.id, {
      ...input.orderUpdate,
      stripePaymentIntentId: paymentIntentId,
      stripeSessionId: session.id,
      totalAmount: session.amount_total,
      taxAmount: session.total_details?.amount_tax ?? null,
    });

    if (!paidOrder) {
      return { status: "skipped", orderId: existingOrder.id, reason: "claim_not_won", order: existingOrder };
    }

    await this.runPaidObligations(paidOrder, metadata);

    return { status: "finalized", orderId: existingOrder.id, order: paidOrder };
  }

  private async runPaidObligations(order: Order, metadata: PaymentIntentMetadata): Promise<void> {
    await this.createStripeTaxTransaction(order);
    await this.recordCouponRedemption(order, metadata);
    await this.recordAffiliateCommission(order, metadata);
    await this.enqueueMetaPurchase(order.id);
    await this.deps.sendOrderNotification(order.id);
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
  sendOrderNotification?: (orderId: string) => Promise<void>;
  createTaxTransaction?: (calculationId: string, reference: string) => Promise<void>;
} = {}): OrderFinalizationService {
  const storageDependency: OrderFinalizationDependencies["storage"] = {
    getOrder: async (...args) => (await import("../../storage")).storage.getOrder(...args),
    getOrderByStripeSession: async (...args) => (await import("../../storage")).storage.getOrderByStripeSession(...args),
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
    sendOrderNotification: params.sendOrderNotification ?? defaultSendOrderNotification,
    log: console,
  });
}
