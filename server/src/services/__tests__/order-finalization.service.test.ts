import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrderFinalizationService, type OrderFinalizationDependencies } from "../order-finalization.service";

function makePendingOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "order-1",
    customerId: "customer-1",
    status: "pending",
    paymentStatus: "unpaid",
    totalAmount: 10000,
    subtotalAmount: 9000,
    taxAmount: 1000,
    stripeTaxCalculationId: "taxcalc-1",
    stripePaymentIntentId: null,
    affiliateCode: "AFFILIATE",
    affiliateIsFriendsFamily: false,
    couponDiscountAmount: 1500,
    createdAt: new Date("2026-06-30T12:00:00Z"),
    updatedAt: new Date("2026-06-30T12:00:00Z"),
    ...overrides,
  };
}

function makeDependencies(): OrderFinalizationDependencies {
  return {
    storage: {
      getOrder: vi.fn(),
      getOrderByStripeSession: vi.fn(),
      markOrderPaidIfPending: vi.fn(),
      createCouponRedemption: vi.fn(),
      incrementCouponUsage: vi.fn(),
    },
    createTaxTransaction: vi.fn(),
    recordAffiliateCommission: vi.fn(),
    enqueueMetaPurchase: vi.fn(),
    sendOrderNotification: vi.fn(),
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  };
}

function makePaidCheckoutSession(overrides: Record<string, unknown> = {}) {
  return {
    id: "cs_test_123",
    status: "complete",
    payment_status: "paid",
    client_reference_id: "order-1",
    amount_subtotal: 9000,
    amount_total: 9750,
    currency: "usd",
    total_details: {
      amount_tax: 750,
    },
    payment_intent: "pi_123",
    metadata: {
      orderId: "order-1",
    },
    ...overrides,
  };
}

describe("OrderFinalizationService", () => {
  let deps: OrderFinalizationDependencies;
  let service: OrderFinalizationService;

  beforeEach(() => {
    deps = makeDependencies();
    service = new OrderFinalizationService(deps);
  });

  it("finalizes a pending Stripe PaymentIntent order and runs paid obligations once in order", async () => {
    const pendingOrder = makePendingOrder();
    const paidOrder = makePendingOrder({
      status: "paid",
      paymentStatus: "paid",
      stripePaymentIntentId: "pi_123",
    });
    vi.mocked(deps.storage.getOrder).mockResolvedValue(pendingOrder as any);
    vi.mocked(deps.storage.markOrderPaidIfPending).mockResolvedValue(paidOrder as any);

    const result = await service.finalizeStripePaymentIntent({
      paymentIntent: {
        id: "pi_123",
        amount: 10000,
        currency: "usd",
        metadata: {
          orderId: "order-1",
          couponId: "coupon-1",
          couponDiscountAmount: "1500",
          couponBlocksAffiliate: "true",
          affiliateSessionId: "session-1",
          attributionType: "coupon",
          isFriendsFamily: "true",
        },
      },
    });

    expect(result).toEqual({ status: "finalized", orderId: "order-1", order: paidOrder });
    expect(deps.storage.markOrderPaidIfPending).toHaveBeenCalledWith("order-1", {
      stripePaymentIntentId: "pi_123",
    });
    expect(deps.createTaxTransaction).toHaveBeenCalledWith("taxcalc-1", "order-1");
    expect(deps.storage.createCouponRedemption).toHaveBeenCalledWith({
      couponId: "coupon-1",
      orderId: "order-1",
      customerId: "customer-1",
      discountAmount: 1500,
      orderSubtotal: 9000,
      orderTotal: 10000,
      netRevenue: 8500,
      affiliateCode: "AFFILIATE",
      affiliateCommissionBlocked: true,
    });
    expect(deps.storage.incrementCouponUsage).toHaveBeenCalledWith("coupon-1");
    expect(deps.recordAffiliateCommission).toHaveBeenCalledWith("order-1", {
      sessionId: "session-1",
      attributionType: "coupon",
      isFriendsFamily: true,
    });
    expect(deps.enqueueMetaPurchase).toHaveBeenCalledWith("order-1");
    expect(deps.sendOrderNotification).toHaveBeenCalledWith("order-1");

    const taxOrder = vi.mocked(deps.createTaxTransaction).mock.invocationCallOrder[0];
    const couponOrder = vi.mocked(deps.storage.createCouponRedemption).mock.invocationCallOrder[0];
    const commissionOrder = vi.mocked(deps.recordAffiliateCommission).mock.invocationCallOrder[0];
    const metaOrder = vi.mocked(deps.enqueueMetaPurchase).mock.invocationCallOrder[0];
    const notificationOrder = vi.mocked(deps.sendOrderNotification).mock.invocationCallOrder[0];
    expect(taxOrder).toBeLessThan(couponOrder);
    expect(couponOrder).toBeLessThan(commissionOrder);
    expect(commissionOrder).toBeLessThan(metaOrder);
    expect(metaOrder).toBeLessThan(notificationOrder);
  });

  it("finalizes a Stripe PaymentIntent with uppercase USD currency", async () => {
    const pendingOrder = makePendingOrder();
    const paidOrder = makePendingOrder({
      status: "paid",
      paymentStatus: "paid",
      stripePaymentIntentId: "pi_123",
    });
    vi.mocked(deps.storage.getOrder).mockResolvedValue(pendingOrder as any);
    vi.mocked(deps.storage.markOrderPaidIfPending).mockResolvedValue(paidOrder as any);

    const result = await service.finalizeStripePaymentIntent({
      paymentIntent: {
        id: "pi_123",
        amount: 10000,
        currency: "USD",
        metadata: { orderId: "order-1" },
      },
    });

    expect(result).toEqual({ status: "finalized", orderId: "order-1", order: paidOrder });
    expect(deps.storage.markOrderPaidIfPending).toHaveBeenCalledWith("order-1", {
      stripePaymentIntentId: "pi_123",
    });
  });

  it("does not run paid obligations when the pending-to-paid claim is not won", async () => {
    const alreadyPaidOrder = makePendingOrder({
      status: "paid",
      paymentStatus: "paid",
      stripePaymentIntentId: "pi_123",
    });
    vi.mocked(deps.storage.getOrder).mockResolvedValue(alreadyPaidOrder as any);
    vi.mocked(deps.storage.markOrderPaidIfPending).mockResolvedValue(undefined);

    const result = await service.finalizeStripePaymentIntent({
      paymentIntent: {
        id: "pi_123",
        amount: 10000,
        currency: "usd",
        metadata: {
          orderId: "order-1",
          couponId: "coupon-1",
          couponDiscountAmount: "1500",
        },
      },
    });

    expect(result).toEqual({
      status: "skipped",
      orderId: "order-1",
      reason: "claim_not_won",
      order: alreadyPaidOrder,
    });
    expect(deps.createTaxTransaction).not.toHaveBeenCalled();
    expect(deps.storage.createCouponRedemption).not.toHaveBeenCalled();
    expect(deps.storage.incrementCouponUsage).not.toHaveBeenCalled();
    expect(deps.recordAffiliateCommission).not.toHaveBeenCalled();
    expect(deps.enqueueMetaPurchase).not.toHaveBeenCalled();
    expect(deps.sendOrderNotification).not.toHaveBeenCalled();
  });

  it("does not claim or side-effect when PaymentIntent proof does not match the order", async () => {
    const pendingOrder = makePendingOrder();
    vi.mocked(deps.storage.getOrder).mockResolvedValue(pendingOrder as any);

    const result = await service.finalizeStripePaymentIntent({
      paymentIntent: {
        id: "pi_123",
        amount: 10001,
        currency: "usd",
        metadata: { orderId: "order-1" },
      },
    });

    expect(result).toEqual({
      status: "skipped",
      orderId: "order-1",
      reason: "amount_mismatch",
      order: pendingOrder,
    });
    expect(deps.storage.markOrderPaidIfPending).not.toHaveBeenCalled();
    expect(deps.createTaxTransaction).not.toHaveBeenCalled();
    expect(deps.storage.createCouponRedemption).not.toHaveBeenCalled();
    expect(deps.recordAffiliateCommission).not.toHaveBeenCalled();
    expect(deps.enqueueMetaPurchase).not.toHaveBeenCalled();
    expect(deps.sendOrderNotification).not.toHaveBeenCalled();
  });

  it("does not claim or side-effect when PaymentIntent currency is missing", async () => {
    const pendingOrder = makePendingOrder();
    vi.mocked(deps.storage.getOrder).mockResolvedValue(pendingOrder as any);

    const result = await service.finalizeStripePaymentIntent({
      paymentIntent: {
        id: "pi_123",
        amount: 10000,
        metadata: { orderId: "order-1" },
      },
    });

    expect(result).toEqual({
      status: "skipped",
      orderId: "order-1",
      reason: "currency_mismatch",
      order: pendingOrder,
    });
    expect(deps.storage.markOrderPaidIfPending).not.toHaveBeenCalled();
    expect(deps.createTaxTransaction).not.toHaveBeenCalled();
    expect(deps.storage.createCouponRedemption).not.toHaveBeenCalled();
    expect(deps.recordAffiliateCommission).not.toHaveBeenCalled();
    expect(deps.enqueueMetaPurchase).not.toHaveBeenCalled();
    expect(deps.sendOrderNotification).not.toHaveBeenCalled();
  });

  it("does not finalize Checkout-created PaymentIntents without Checkout Session proof", async () => {
    const pendingOrder = makePendingOrder();
    vi.mocked(deps.storage.getOrder).mockResolvedValue(pendingOrder as any);

    const result = await service.finalizeStripePaymentIntent({
      paymentIntent: {
        id: "pi_123",
        amount: 10000,
        currency: "usd",
        metadata: {
          orderId: "order-1",
          paymentFlow: "checkout_session",
        },
      },
    });

    expect(result).toEqual({
      status: "skipped",
      orderId: "order-1",
      reason: "checkout_session_payment_intent",
      order: pendingOrder,
    });
    expect(deps.storage.markOrderPaidIfPending).not.toHaveBeenCalled();
    expect(deps.createTaxTransaction).not.toHaveBeenCalled();
    expect(deps.storage.createCouponRedemption).not.toHaveBeenCalled();
    expect(deps.recordAffiliateCommission).not.toHaveBeenCalled();
    expect(deps.enqueueMetaPurchase).not.toHaveBeenCalled();
    expect(deps.sendOrderNotification).not.toHaveBeenCalled();
  });


  it("finalizes a paid Checkout Session from Stripe totals and runs paid obligations once", async () => {
    const pendingOrder = makePendingOrder({
      totalAmount: 9000,
      subtotalAmount: 10000,
      taxAmount: null,
      stripeSessionId: "cs_test_123",
      stripePaymentIntentId: null,
      affiliateDiscountAmount: 1000,
    });
    const paidOrder = makePendingOrder({
      ...pendingOrder,
      status: "paid",
      paymentStatus: "paid",
      totalAmount: 9750,
      taxAmount: 750,
      stripePaymentIntentId: "pi_123",
    });
    vi.mocked(deps.storage.getOrderByStripeSession).mockResolvedValue(pendingOrder as any);
    vi.mocked(deps.storage.markOrderPaidIfPending).mockResolvedValue(paidOrder as any);

    const result = await service.finalizeStripeCheckoutSession({
      session: {
        id: "cs_test_123",
        status: "complete",
        payment_status: "paid",
        client_reference_id: "order-1",
        amount_subtotal: 9000,
        amount_total: 9750,
        currency: "usd",
        total_details: {
          amount_tax: 750,
        },
        payment_intent: {
          id: "pi_123",
          metadata: {
            orderId: "order-1",
            couponId: "coupon-1",
            couponDiscountAmount: "1500",
            couponBlocksAffiliate: "true",
            affiliateSessionId: "session-1",
            attributionType: "coupon",
            isFriendsFamily: "true",
          },
        },
        metadata: {
          orderId: "order-1",
        },
      },
    });

    expect(result).toEqual({ status: "finalized", orderId: "order-1", order: paidOrder });
    expect(deps.storage.markOrderPaidIfPending).toHaveBeenCalledWith("order-1", {
      stripePaymentIntentId: "pi_123",
      stripeSessionId: "cs_test_123",
      totalAmount: 9750,
      taxAmount: 750,
    });
    expect(deps.createTaxTransaction).toHaveBeenCalledWith("taxcalc-1", "order-1");
    expect(deps.storage.createCouponRedemption).toHaveBeenCalledOnce();
    expect(deps.recordAffiliateCommission).toHaveBeenCalledWith("order-1", {
      sessionId: "session-1",
      attributionType: "coupon",
      isFriendsFamily: true,
    });
    expect(deps.enqueueMetaPurchase).toHaveBeenCalledWith("order-1");
    expect(deps.sendOrderNotification).toHaveBeenCalledWith("order-1");
  });

  it("finalizes a legacy paid Checkout Session found by Stripe session id when new identity fields are absent", async () => {
    const pendingOrder = makePendingOrder({
      totalAmount: 9000,
      subtotalAmount: 10000,
      taxAmount: null,
      stripeSessionId: "cs_legacy_123",
      stripePaymentIntentId: null,
      affiliateDiscountAmount: 1000,
    });
    const paidOrder = makePendingOrder({
      ...pendingOrder,
      status: "paid",
      paymentStatus: "paid",
      totalAmount: 9750,
      taxAmount: 750,
      stripePaymentIntentId: "pi_123",
    });
    vi.mocked(deps.storage.getOrderByStripeSession).mockResolvedValue(pendingOrder as any);
    vi.mocked(deps.storage.markOrderPaidIfPending).mockResolvedValue(paidOrder as any);

    const result = await service.finalizeStripeCheckoutSession({
      session: makePaidCheckoutSession({
        id: "cs_legacy_123",
        client_reference_id: null,
        metadata: {},
        payment_intent: "pi_123",
      }),
    });

    expect(result).toEqual({ status: "finalized", orderId: "order-1", order: paidOrder });
    expect(deps.storage.markOrderPaidIfPending).toHaveBeenCalledWith("order-1", {
      stripePaymentIntentId: "pi_123",
      stripeSessionId: "cs_legacy_123",
      totalAmount: 9750,
      taxAmount: 750,
    });
  });


  it("does not claim or side-effect when Checkout Session automatic tax is incomplete", async () => {
    const pendingOrder = makePendingOrder({
      totalAmount: 9000,
      subtotalAmount: 10000,
      taxAmount: null,
      stripeSessionId: "cs_test_123",
      stripePaymentIntentId: null,
      affiliateDiscountAmount: 1000,
    });
    vi.mocked(deps.storage.getOrderByStripeSession).mockResolvedValue(pendingOrder as any);

    const result = await service.finalizeStripeCheckoutSession({
      session: {
        id: "cs_test_123",
        status: "complete",
        payment_status: "paid",
        client_reference_id: "order-1",
        amount_subtotal: 9000,
        amount_total: 9750,
        currency: "usd",
        automatic_tax: {
          enabled: true,
          status: "failed",
        },
        total_details: {
          amount_tax: 750,
        },
        payment_intent: "pi_123",
        metadata: {
          orderId: "order-1",
        },
      },
    });

    expect(result).toEqual({
      status: "skipped",
      orderId: "order-1",
      reason: "automatic_tax_incomplete",
      order: pendingOrder,
    });
    expect(deps.storage.markOrderPaidIfPending).not.toHaveBeenCalled();
    expect(deps.createTaxTransaction).not.toHaveBeenCalled();
    expect(deps.storage.createCouponRedemption).not.toHaveBeenCalled();
    expect(deps.recordAffiliateCommission).not.toHaveBeenCalled();
    expect(deps.enqueueMetaPurchase).not.toHaveBeenCalled();
    expect(deps.sendOrderNotification).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: "not paid",
      session: makePaidCheckoutSession({ payment_status: "unpaid" }),
      expected: { status: "skipped", reason: "checkout_session_not_paid" },
    },
    {
      name: "mismatched order identity",
      session: makePaidCheckoutSession({ client_reference_id: "order-other" }),
      expected: {
        status: "skipped",
        orderId: "order-1",
        reason: "order_identity_mismatch",
      },
    },
    {
      name: "mismatched subtotal",
      session: makePaidCheckoutSession({ amount_subtotal: 8999 }),
      expected: {
        status: "skipped",
        orderId: "order-1",
        reason: "amount_mismatch",
      },
    },
    {
      name: "mismatched currency",
      session: makePaidCheckoutSession({ currency: "eur" }),
      expected: {
        status: "skipped",
        orderId: "order-1",
        reason: "currency_mismatch",
      },
    },
  ])("does not claim or side-effect when Checkout Session proof is $name", async ({ session, expected }) => {
    const pendingOrder = makePendingOrder({
      totalAmount: 9000,
      subtotalAmount: 10000,
      taxAmount: null,
      stripeSessionId: "cs_test_123",
      stripePaymentIntentId: null,
      affiliateDiscountAmount: 1000,
    });
    vi.mocked(deps.storage.getOrderByStripeSession).mockResolvedValue(pendingOrder as any);

    const result = await service.finalizeStripeCheckoutSession({ session: session as any });

    expect(result).toEqual(expected.orderId ? { ...expected, order: pendingOrder } : expected);
    expect(deps.storage.markOrderPaidIfPending).not.toHaveBeenCalled();
    expect(deps.createTaxTransaction).not.toHaveBeenCalled();
    expect(deps.storage.createCouponRedemption).not.toHaveBeenCalled();
    expect(deps.recordAffiliateCommission).not.toHaveBeenCalled();
    expect(deps.enqueueMetaPurchase).not.toHaveBeenCalled();
    expect(deps.sendOrderNotification).not.toHaveBeenCalled();
  });

  it("does not run Checkout Session paid obligations when the pending-to-paid claim is not won", async () => {
    const alreadyPaidOrder = makePendingOrder({
      status: "paid",
      paymentStatus: "paid",
      totalAmount: 9000,
      subtotalAmount: 10000,
      taxAmount: null,
      stripeSessionId: "cs_test_123",
      stripePaymentIntentId: "pi_123",
      affiliateDiscountAmount: 1000,
    });
    vi.mocked(deps.storage.getOrderByStripeSession).mockResolvedValue(alreadyPaidOrder as any);
    vi.mocked(deps.storage.markOrderPaidIfPending).mockResolvedValue(undefined);

    const result = await service.finalizeStripeCheckoutSession({
      session: makePaidCheckoutSession(),
    });

    expect(result).toEqual({
      status: "skipped",
      orderId: "order-1",
      reason: "claim_not_won",
      order: alreadyPaidOrder,
    });
    expect(deps.createTaxTransaction).not.toHaveBeenCalled();
    expect(deps.storage.createCouponRedemption).not.toHaveBeenCalled();
    expect(deps.recordAffiliateCommission).not.toHaveBeenCalled();
    expect(deps.enqueueMetaPurchase).not.toHaveBeenCalled();
    expect(deps.sendOrderNotification).not.toHaveBeenCalled();
  });
});
