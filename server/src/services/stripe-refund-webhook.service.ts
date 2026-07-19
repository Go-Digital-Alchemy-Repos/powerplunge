import type { IStorage } from "../../storage";

type NormalizedRefundStatus = "pending" | "processed" | "rejected" | "failed";

export interface StripeRefundOperations {
  normalizeStripeRefundStatus: (status: string) => NormalizedRefundStatus;
  updateOrderPaymentStatus: (orderId: string) => Promise<void>;
}

export interface StripeChargeRefund {
  id: string;
  amount: number;
  reason?: string | null;
  status?: string | null;
}

export interface StripeChargeWithRefunds {
  id: string;
  payment_intent?: string | null;
  refunds?: {
    data: StripeChargeRefund[];
    has_more?: boolean;
  } | null;
}

export interface SynchronizeStripeChargeRefundsInput {
  charge: StripeChargeWithRefunds;
}

export interface StripeRefundUpdate {
  id: string;
  status?: string | null;
}

export interface SynchronizeStripeRefundStatusInput {
  refund: StripeRefundUpdate;
  eventId: string;
}

export interface StripeRefundWebhookDependencies {
  storage: Pick<
    IStorage,
    | "getOrderByPaymentIntentId"
    | "getRefundByStripeRefundId"
    | "createRefund"
    | "updateRefund"
    | "createAuditLog"
  >;
  getStripeClient: () => Promise<unknown | null>;
  listRefundsForCharge: (chargeId: string) => Promise<StripeChargeRefund[]>;
  loadRefundOperations: () => Promise<StripeRefundOperations>;
  enqueueRefundProcessed: (refundId: string) => Promise<unknown>;
  log: Pick<Console, "log" | "warn" | "error">;
}

export class StripeRefundWebhookService {
  constructor(private readonly deps: StripeRefundWebhookDependencies) {}

  async synchronizeStripeChargeRefunds(
    input: SynchronizeStripeChargeRefundsInput,
  ): Promise<void> {
    const { charge } = input;
    const paymentIntentId = charge.payment_intent;
    if (!paymentIntentId) return;

    try {
      const refundOperations = await this.deps.loadRefundOperations();
      const order = await this.deps.storage.getOrderByPaymentIntentId(paymentIntentId);
      if (!order) {
        this.deps.log.warn(
          `[WEBHOOK] charge.refunded: No order found for payment_intent ${paymentIntentId}`,
        );
        return;
      }

      const stripeClient = await this.deps.getStripeClient();
      if (!stripeClient || !charge.refunds?.data) return;

      const stripeRefunds = charge.refunds.has_more
        ? await this.deps.listRefundsForCharge(charge.id)
        : charge.refunds.data;

      for (const stripeRefund of stripeRefunds) {
        const existingRefund = await this.deps.storage.getRefundByStripeRefundId(stripeRefund.id);
        const normalizedStatus = refundOperations.normalizeStripeRefundStatus(
          stripeRefund.status || "pending",
        );

        if (existingRefund) {
          if (existingRefund.status !== normalizedStatus) {
            await this.deps.storage.updateRefund(existingRefund.id, {
              status: normalizedStatus,
              processedAt: normalizedStatus === "processed"
                ? new Date()
                : existingRefund.processedAt,
            });
            this.deps.log.log(
              `[WEBHOOK] Updated refund ${existingRefund.id} status to ${normalizedStatus} (charge.refunded)`,
            );
            if (normalizedStatus === "processed") {
              await this.enqueueProcessedRefund(
                existingRefund.id,
                "[META] Failed to enqueue processed refund (charge.refunded/update):",
              );
            }
          }
        } else {
          const createdRefund = await this.deps.storage.createRefund({
            orderId: order.id,
            amount: stripeRefund.amount,
            reason: stripeRefund.reason || "Refund via Stripe",
            reasonCode: stripeRefund.reason || "other",
            type: stripeRefund.amount >= order.totalAmount ? "full" : "partial",
            source: "stripe",
            stripeRefundId: stripeRefund.id,
            status: normalizedStatus,
            processedAt: normalizedStatus === "processed" ? new Date() : undefined,
          });
          this.deps.log.log(
            `[WEBHOOK] Created refund record for Stripe refund ${stripeRefund.id} on order ${order.id}`,
          );
          if (normalizedStatus === "processed") {
            await this.enqueueProcessedRefund(
              createdRefund.id,
              "[META] Failed to enqueue processed refund (charge.refunded/create):",
            );
          }
        }
      }

      await refundOperations.updateOrderPaymentStatus(order.id);
    } catch (refundErr: any) {
      this.deps.log.error("[WEBHOOK] Error processing charge.refunded:", refundErr.message);
      throw refundErr;
    }
  }

  async synchronizeStripeRefundStatus(
    input: SynchronizeStripeRefundStatusInput,
  ): Promise<void> {
    const { refund: stripeRefund, eventId } = input;

    try {
      const refundOperations = await this.deps.loadRefundOperations();
      const existingRefund = await this.deps.storage.getRefundByStripeRefundId(stripeRefund.id);
      if (!existingRefund) {
        this.deps.log.warn(
          `[WEBHOOK] refund.updated: No local refund found for Stripe refund ${stripeRefund.id}`,
        );
        return;
      }

      const normalizedStatus = refundOperations.normalizeStripeRefundStatus(
        stripeRefund.status || "pending",
      );
      if (existingRefund.status === normalizedStatus) return;

      await this.deps.storage.updateRefund(existingRefund.id, {
        status: normalizedStatus,
        processedAt: normalizedStatus === "processed"
          ? new Date()
          : existingRefund.processedAt,
      });

      if (normalizedStatus === "processed") {
        await this.enqueueProcessedRefund(
          existingRefund.id,
          "[META] Failed to enqueue processed refund (refund.updated):",
        );
      }

      await refundOperations.updateOrderPaymentStatus(existingRefund.orderId);

      await this.deps.storage.createAuditLog({
        actor: "stripe_webhook",
        action: "refund.status_synced",
        entityType: "refund",
        entityId: existingRefund.id,
        metadata: {
          orderId: existingRefund.orderId,
          stripeRefundId: stripeRefund.id,
          previousStatus: existingRefund.status,
          newStatus: normalizedStatus,
          stripeStatus: stripeRefund.status,
          eventId,
        },
      });

      this.deps.log.log(
        `[WEBHOOK] Synced refund ${existingRefund.id} status: ${existingRefund.status} -> ${normalizedStatus}`,
      );
    } catch (refundErr: any) {
      this.deps.log.error("[WEBHOOK] Error processing refund.updated:", refundErr.message);
      throw refundErr;
    }
  }

  private async enqueueProcessedRefund(refundId: string, errorMessage: string): Promise<void> {
    try {
      await this.deps.enqueueRefundProcessed(refundId);
    } catch (metaErr: any) {
      this.deps.log.error(errorMessage, metaErr.message || metaErr);
    }
  }
}

export function createStripeRefundWebhookService(
  dependencies: Partial<StripeRefundWebhookDependencies> = {},
): StripeRefundWebhookService {
  const storageDependency: StripeRefundWebhookDependencies["storage"] = {
    getOrderByPaymentIntentId: async (...args) =>
      (await import("../../storage")).storage.getOrderByPaymentIntentId(...args),
    getRefundByStripeRefundId: async (...args) =>
      (await import("../../storage")).storage.getRefundByStripeRefundId(...args),
    createRefund: async (...args) => (await import("../../storage")).storage.createRefund(...args),
    updateRefund: async (...args) => (await import("../../storage")).storage.updateRefund(...args),
    createAuditLog: async (...args) =>
      (await import("../../storage")).storage.createAuditLog(...args),
  };

  return new StripeRefundWebhookService({
    storage: dependencies.storage ?? storageDependency,
    getStripeClient: dependencies.getStripeClient ?? (async () => {
      const { stripeService } = await import("../integrations/stripe/StripeService");
      return stripeService.getClient();
    }),
    listRefundsForCharge: dependencies.listRefundsForCharge ?? (async (chargeId) => {
      const { stripeService } = await import("../integrations/stripe/StripeService");
      return stripeService.listRefundsForCharge(chargeId);
    }),
    loadRefundOperations: dependencies.loadRefundOperations ?? (async () => {
      const { normalizeStripeRefundStatus, updateOrderPaymentStatus } = await import(
        "./refund.service"
      );
      return { normalizeStripeRefundStatus, updateOrderPaymentStatus };
    }),
    enqueueRefundProcessed: dependencies.enqueueRefundProcessed ?? (async (refundId) => {
      const { metaConversionsService } = await import("../integrations/meta/MetaConversionsService");
      return metaConversionsService.enqueueRefundProcessed(refundId);
    }),
    log: dependencies.log ?? console,
  });
}
