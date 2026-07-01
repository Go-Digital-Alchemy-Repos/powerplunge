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
});
