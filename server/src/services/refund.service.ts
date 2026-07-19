import { storage } from "../../storage";
import { stripeService } from "../integrations/stripe/StripeService";
import type { Refund } from "@shared/schema";
import {
  computePaymentStatus,
  computeRefundableAmount,
  computeRefundSummary,
  getValidReasonCodes,
  isValidReasonCode,
  normalizeStripeRefundStatus,
} from "./refund-calculations";
export {
  computePaymentStatus,
  computeRefundableAmount,
  computeRefundSummary,
  getValidReasonCodes,
  isValidReasonCode,
  normalizeStripeRefundStatus,
};
export type { PaymentStatus, ReasonCode, RefundSummary } from "./refund-calculations";

export async function updateOrderPaymentStatus(orderId: string): Promise<void> {
  const order = await storage.getOrder(orderId);
  if (!order) return;

  const orderRefunds = await storage.getRefundsByOrderId(orderId);
  const newStatus = computePaymentStatus(order, orderRefunds);

  if (order.paymentStatus !== newStatus) {
    await storage.updateOrder(orderId, { paymentStatus: newStatus } as any);
  }
}

export interface CreateRefundParams {
  orderId: string;
  amount: number;
  reason?: string;
  reasonCode?: string;
  type?: "full" | "partial";
  adminEmail?: string;
}

export async function createStripeRefund(params: CreateRefundParams): Promise<Refund> {
  const { orderId, amount, reason, reasonCode, type = "full", adminEmail = "admin" } = params;

  const order = await storage.getOrder(orderId);
  if (!order) {
    throw new RefundError("Order not found", "ORDER_NOT_FOUND", 404);
  }

  if (!order.stripePaymentIntentId) {
    throw new RefundError("Order was not paid via Stripe. Use manual refund for non-Stripe orders.", "NOT_STRIPE_PAID", 400);
  }

  const paidStatuses = ["paid", "shipped", "delivered"];
  if (!paidStatuses.includes(order.status) && order.paymentStatus !== "paid" && order.paymentStatus !== "partially_refunded") {
    throw new RefundError("Order has not been paid and cannot be refunded", "ORDER_NOT_PAID", 400);
  }

  if (amount <= 0) {
    throw new RefundError("Refund amount must be greater than zero", "INVALID_AMOUNT", 400);
  }

  if (reasonCode && !isValidReasonCode(reasonCode)) {
    throw new RefundError(`Invalid reason code. Must be one of: ${getValidReasonCodes().join(", ")}`, "INVALID_REASON_CODE", 400);
  }

  const existingRefunds = await storage.getRefundsByOrderId(orderId);
  const refundableAmount = computeRefundableAmount(order, existingRefunds);

  if (amount > refundableAmount) {
    throw new RefundError(
      `Refund amount ($${(amount / 100).toFixed(2)}) exceeds refundable amount ($${(refundableAmount / 100).toFixed(2)})`,
      "EXCEEDS_REFUNDABLE",
      400
    );
  }

  const client = await stripeService.getClient();
  if (!client) {
    throw new RefundError("Stripe is not configured", "STRIPE_NOT_CONFIGURED", 500);
  }

  const idempotencyKey = `refund_${orderId}_${amount}_${existingRefunds.length}`;

  let stripeRefund;
  try {
    stripeRefund = await client.refunds.create(
      {
        payment_intent: order.stripePaymentIntentId,
        amount,
        reason: reasonCode === "duplicate" ? "duplicate" : reasonCode === "fraudulent" ? "fraudulent" : "requested_by_customer",
        metadata: {
          orderId,
          internalReason: reason || "",
          reasonCode: reasonCode || "other",
        },
      },
      { idempotencyKey }
    );
  } catch (err: any) {
    console.error(`[REFUND] Stripe refund creation failed for order ${orderId}:`, err.message);
    throw new RefundError(
      `Stripe refund failed: ${err.message}`,
      "STRIPE_REFUND_FAILED",
      500
    );
  }

  const normalizedStatus = normalizeStripeRefundStatus(stripeRefund.status || "pending");

  const refund = await storage.createRefund({
    orderId,
    amount,
    reason: reason || null,
    reasonCode: reasonCode || "other",
    type,
    source: "stripe",
    stripeRefundId: stripeRefund.id,
    status: normalizedStatus,
    processedAt: normalizedStatus === "processed" ? new Date() : undefined,
  });

  await storage.createAuditLog({
    actor: adminEmail,
    action: "refund.created",
    entityType: "refund",
    entityId: refund.id,
    metadata: {
      orderId,
      amount,
      reason,
      reasonCode,
      type,
      stripeRefundId: stripeRefund.id,
      stripeRefundStatus: stripeRefund.status,
      normalizedStatus,
    },
  });

  if (refund.status === "processed") {
    try {
      const { metaConversionsService } = await import("../integrations/meta/MetaConversionsService");
      await metaConversionsService.enqueueRefundProcessed(refund.id);
    } catch (metaErr: any) {
      console.error("[META] Failed to enqueue processed refund (createStripeRefund):", metaErr.message || metaErr);
    }
  }

  await updateOrderPaymentStatus(orderId);

  return refund;
}

export async function createManualRefund(params: CreateRefundParams): Promise<Refund> {
  const { orderId, amount, reason, reasonCode, type = "full", adminEmail = "admin" } = params;

  const order = await storage.getOrder(orderId);
  if (!order) {
    throw new RefundError("Order not found", "ORDER_NOT_FOUND", 404);
  }

  if (amount <= 0) {
    throw new RefundError("Refund amount must be greater than zero", "INVALID_AMOUNT", 400);
  }

  if (reasonCode && !isValidReasonCode(reasonCode)) {
    throw new RefundError(`Invalid reason code. Must be one of: ${getValidReasonCodes().join(", ")}`, "INVALID_REASON_CODE", 400);
  }

  const existingRefunds = await storage.getRefundsByOrderId(orderId);
  const refundableAmount = computeRefundableAmount(order, existingRefunds);

  if (amount > refundableAmount) {
    throw new RefundError(
      `Refund amount ($${(amount / 100).toFixed(2)}) exceeds refundable amount ($${(refundableAmount / 100).toFixed(2)})`,
      "EXCEEDS_REFUNDABLE",
      400
    );
  }

  const refund = await storage.createRefund({
    orderId,
    amount,
    reason: reason || null,
    reasonCode: reasonCode || "other",
    type,
    source: "manual",
    status: "pending",
  });

  await storage.createAuditLog({
    actor: adminEmail,
    action: "refund.created",
    entityType: "refund",
    entityId: refund.id,
    metadata: {
      orderId,
      amount,
      reason,
      reasonCode,
      type,
      source: "manual",
    },
  });

  await updateOrderPaymentStatus(orderId);

  return refund;
}

export class RefundError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = "RefundError";
    this.code = code;
    this.statusCode = statusCode;
  }
}
