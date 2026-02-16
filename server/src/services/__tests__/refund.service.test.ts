import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  normalizeStripeRefundStatus,
  computeRefundableAmount,
  computePaymentStatus,
  computeRefundSummary,
  isValidReasonCode,
} from "../refund.service";
import type { Order, Refund } from "@shared/schema";

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "order-1",
    customerId: "cust-1",
    status: "paid",
    totalAmount: 10000,
    subtotalAmount: 9000,
    taxAmount: 1000,
    stripeTaxCalculationId: null,
    stripePaymentIntentId: "pi_test_123",
    stripeSessionId: null,
    affiliateCode: null,
    affiliateDiscountAmount: null,
    couponDiscountAmount: null,
    couponCode: null,
    isManualOrder: false,
    notes: null,
    customerIp: null,
    shippingName: null,
    shippingCompany: null,
    shippingAddress: null,
    shippingLine2: null,
    shippingCity: null,
    shippingState: null,
    shippingZip: null,
    shippingCountry: "US",
    paymentStatus: "paid",
    billingSameAsShipping: true,
    billingName: null,
    billingCompany: null,
    billingAddress: null,
    billingLine2: null,
    billingCity: null,
    billingState: null,
    billingZip: null,
    billingCountry: "US",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeRefund(overrides: Partial<Refund> = {}): Refund {
  return {
    id: "ref-1",
    orderId: "order-1",
    amount: 5000,
    reason: "Customer request",
    reasonCode: "requested_by_customer",
    type: "partial",
    source: "stripe",
    stripeRefundId: "re_test_123",
    status: "processed",
    processedBy: null,
    createdAt: new Date(),
    processedAt: new Date(),
    ...overrides,
  };
}

describe("normalizeStripeRefundStatus", () => {
  it("maps succeeded to processed", () => {
    expect(normalizeStripeRefundStatus("succeeded")).toBe("processed");
  });

  it("maps pending to pending", () => {
    expect(normalizeStripeRefundStatus("pending")).toBe("pending");
  });

  it("maps requires_action to pending", () => {
    expect(normalizeStripeRefundStatus("requires_action")).toBe("pending");
  });

  it("maps failed to failed", () => {
    expect(normalizeStripeRefundStatus("failed")).toBe("failed");
  });

  it("maps canceled to failed", () => {
    expect(normalizeStripeRefundStatus("canceled")).toBe("failed");
  });

  it("defaults unknown to pending", () => {
    expect(normalizeStripeRefundStatus("some_unknown_status")).toBe("pending");
  });
});

describe("isValidReasonCode", () => {
  it("accepts valid codes", () => {
    expect(isValidReasonCode("duplicate")).toBe(true);
    expect(isValidReasonCode("fraudulent")).toBe(true);
    expect(isValidReasonCode("requested_by_customer")).toBe(true);
    expect(isValidReasonCode("other")).toBe(true);
  });

  it("rejects invalid codes", () => {
    expect(isValidReasonCode("invalid")).toBe(false);
    expect(isValidReasonCode("")).toBe(false);
  });
});

describe("computeRefundableAmount", () => {
  it("returns full amount when no refunds exist", () => {
    const order = makeOrder({ totalAmount: 10000 });
    expect(computeRefundableAmount(order, [])).toBe(10000);
  });

  it("subtracts processed refunds from total", () => {
    const order = makeOrder({ totalAmount: 10000 });
    const refunds = [makeRefund({ amount: 3000, status: "processed" })];
    expect(computeRefundableAmount(order, refunds)).toBe(7000);
  });

  it("subtracts pending refunds from total", () => {
    const order = makeOrder({ totalAmount: 10000 });
    const refunds = [makeRefund({ amount: 4000, status: "pending" })];
    expect(computeRefundableAmount(order, refunds)).toBe(6000);
  });

  it("ignores rejected and failed refunds", () => {
    const order = makeOrder({ totalAmount: 10000 });
    const refunds = [
      makeRefund({ amount: 3000, status: "rejected" }),
      makeRefund({ amount: 2000, status: "failed" }),
    ];
    expect(computeRefundableAmount(order, refunds)).toBe(10000);
  });

  it("does not go below zero", () => {
    const order = makeOrder({ totalAmount: 10000 });
    const refunds = [makeRefund({ amount: 15000, status: "processed" })];
    expect(computeRefundableAmount(order, refunds)).toBe(0);
  });

  it("combines pending and processed for calculation", () => {
    const order = makeOrder({ totalAmount: 10000 });
    const refunds = [
      makeRefund({ id: "r1", amount: 3000, status: "processed" }),
      makeRefund({ id: "r2", amount: 4000, status: "pending" }),
    ];
    expect(computeRefundableAmount(order, refunds)).toBe(3000);
  });
});

describe("computePaymentStatus", () => {
  it("returns unpaid for pending order with no payment intent", () => {
    const order = makeOrder({ status: "pending", stripePaymentIntentId: null, paymentStatus: "unpaid" });
    expect(computePaymentStatus(order, [])).toBe("unpaid");
  });

  it("returns paid for paid order with no refunds", () => {
    const order = makeOrder({ status: "paid" });
    expect(computePaymentStatus(order, [])).toBe("paid");
  });

  it("returns refunded when processed refunds cover full amount", () => {
    const order = makeOrder({ totalAmount: 10000 });
    const refunds = [makeRefund({ amount: 10000, status: "processed" })];
    expect(computePaymentStatus(order, refunds)).toBe("refunded");
  });

  it("returns partially_refunded when processed amount is partial", () => {
    const order = makeOrder({ totalAmount: 10000 });
    const refunds = [makeRefund({ amount: 5000, status: "processed" })];
    expect(computePaymentStatus(order, refunds)).toBe("partially_refunded");
  });

  it("returns refund_pending when there are pending refunds", () => {
    const order = makeOrder({ totalAmount: 10000 });
    const refunds = [makeRefund({ amount: 5000, status: "pending" })];
    expect(computePaymentStatus(order, refunds)).toBe("refund_pending");
  });

  it("returns refund_failed when all refunds are failed and none processed", () => {
    const order = makeOrder({ totalAmount: 10000 });
    const refunds = [makeRefund({ amount: 5000, status: "failed" })];
    expect(computePaymentStatus(order, refunds)).toBe("refund_failed");
  });

  it("returns refund_pending when there are partial processed and pending", () => {
    const order = makeOrder({ totalAmount: 10000 });
    const refunds = [
      makeRefund({ id: "r1", amount: 3000, status: "processed" }),
      makeRefund({ id: "r2", amount: 4000, status: "pending" }),
    ];
    expect(computePaymentStatus(order, refunds)).toBe("refund_pending");
  });
});

describe("computeRefundSummary", () => {
  it("returns correct summary for order with processed refund", () => {
    const order = makeOrder({ totalAmount: 10000 });
    const refunds = [makeRefund({ amount: 3000, status: "processed" })];
    const summary = computeRefundSummary(order, refunds);

    expect(summary.paymentStatus).toBe("partially_refunded");
    expect(summary.refundedAmount).toBe(3000);
    expect(summary.refundCount).toBe(1);
    expect(summary.latestRefundStatus).toBe("processed");
  });

  it("returns correct summary with no refunds", () => {
    const order = makeOrder({ totalAmount: 10000 });
    const summary = computeRefundSummary(order, []);

    expect(summary.paymentStatus).toBe("paid");
    expect(summary.refundedAmount).toBe(0);
    expect(summary.refundCount).toBe(0);
    expect(summary.latestRefundStatus).toBeNull();
  });

  it("returns correct summary for fully refunded order", () => {
    const order = makeOrder({ totalAmount: 10000 });
    const refunds = [makeRefund({ amount: 10000, status: "processed" })];
    const summary = computeRefundSummary(order, refunds);

    expect(summary.paymentStatus).toBe("refunded");
    expect(summary.refundedAmount).toBe(10000);
    expect(summary.refundCount).toBe(1);
  });
});
