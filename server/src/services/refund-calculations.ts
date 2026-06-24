import type { Order, Refund } from "@shared/schema";

export type PaymentStatus = "unpaid" | "paid" | "refund_pending" | "partially_refunded" | "refunded" | "refund_failed";

const VALID_REASON_CODES = ["duplicate", "fraudulent", "requested_by_customer", "product_not_received", "product_unacceptable", "other"] as const;
export type ReasonCode = typeof VALID_REASON_CODES[number];

export function getValidReasonCodes(): readonly ReasonCode[] {
  return VALID_REASON_CODES;
}

export function isValidReasonCode(code: string): code is ReasonCode {
  return VALID_REASON_CODES.includes(code as ReasonCode);
}

export function normalizeStripeRefundStatus(stripeStatus: string): "pending" | "processed" | "rejected" | "failed" {
  switch (stripeStatus) {
    case "succeeded":
      return "processed";
    case "pending":
    case "requires_action":
      return "pending";
    case "failed":
    case "canceled":
    case "cancelled":
      return "failed";
    default:
      return "pending";
  }
}

export function computeRefundableAmount(order: Order, refunds: Refund[]): number {
  const activeRefunds = refunds.filter(r => r.status === "processed" || r.status === "pending");
  const refundedOrPending = activeRefunds.reduce((sum, r) => sum + r.amount, 0);
  return Math.max(0, order.totalAmount - refundedOrPending);
}

export function computePaymentStatus(order: Order, orderRefunds: Refund[]): PaymentStatus {
  const paidStatuses = ["paid", "shipped", "delivered"];
  const orderIsPaid = paidStatuses.includes(order.status)
    || order.paymentStatus === "paid"
    || order.paymentStatus === "partially_refunded"
    || order.paymentStatus === "refunded"
    || !!order.stripePaymentIntentId;

  if (!orderIsPaid) {
    return "unpaid";
  }

  if (orderRefunds.length === 0) {
    return "paid";
  }

  const hasFailed = orderRefunds.some(r => r.status === "failed" || r.status === "rejected");
  const hasPending = orderRefunds.some(r => r.status === "pending");
  const processedAmount = orderRefunds.filter(r => r.status === "processed").reduce((sum, r) => sum + r.amount, 0);

  if (processedAmount >= order.totalAmount) {
    return "refunded";
  }

  if (processedAmount > 0 && processedAmount < order.totalAmount) {
    if (hasPending) return "refund_pending";
    return "partially_refunded";
  }

  if (hasPending) {
    return "refund_pending";
  }

  if (hasFailed && processedAmount === 0) {
    return "refund_failed";
  }

  return "paid";
}

export interface RefundSummary {
  paymentStatus: PaymentStatus;
  refundedAmount: number;
  refundCount: number;
  latestRefundStatus: string | null;
}

export function computeRefundSummary(order: Order, orderRefunds: Refund[]): RefundSummary {
  const paymentStatus = computePaymentStatus(order, orderRefunds);
  const refundedAmount = orderRefunds.filter(r => r.status === "processed").reduce((sum, r) => sum + r.amount, 0);
  const refundCount = orderRefunds.length;
  const latestRefund = orderRefunds.length > 0
    ? orderRefunds.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
    : null;

  return {
    paymentStatus,
    refundedAmount,
    refundCount,
    latestRefundStatus: latestRefund?.status || null,
  };
}
