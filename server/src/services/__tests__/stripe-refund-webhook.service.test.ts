import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createStripeRefundWebhookService,
  type StripeRefundWebhookDependencies,
} from "../stripe-refund-webhook.service";

function makeDependencies(): StripeRefundWebhookDependencies {
  const refundOperations = {
    normalizeStripeRefundStatus: vi.fn(
      (status: string) => status === "succeeded" ? "processed" as const : "pending" as const,
    ),
    updateOrderPaymentStatus: vi.fn(),
  };

  return {
    storage: {
      getOrderByPaymentIntentId: vi.fn(),
      getRefundByStripeRefundId: vi.fn(),
      createRefund: vi.fn(),
      updateRefund: vi.fn(),
      createAuditLog: vi.fn(),
    },
    getStripeClient: vi.fn().mockResolvedValue({}),
    loadRefundOperations: vi.fn().mockResolvedValue(refundOperations),
    enqueueRefundProcessed: vi.fn(),
    log: {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  };
}

function makeCharge(overrides: Record<string, unknown> = {}) {
  return {
    payment_intent: "pi_123",
    refunds: {
      data: [{ id: "re_123", amount: 2500, reason: "requested_by_customer", status: "pending" }],
    },
    ...overrides,
  };
}

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "order-1",
    totalAmount: 5000,
    ...overrides,
  };
}

function makeRefundUpdate(overrides: Record<string, unknown> = {}) {
  return {
    id: "re_123",
    status: "succeeded",
    ...overrides,
  };
}

describe("StripeRefundWebhookService", () => {
  let deps: StripeRefundWebhookDependencies;

  beforeEach(() => {
    deps = makeDependencies();
    vi.mocked(deps.storage.getOrderByPaymentIntentId).mockResolvedValue(makeOrder() as any);
    vi.mocked(deps.storage.getRefundByStripeRefundId).mockResolvedValue(undefined);
    vi.mocked(deps.storage.createRefund).mockResolvedValue({ id: "refund-created" } as any);
  });

  it("creates a local refund from a Stripe charge refund", async () => {
    await createStripeRefundWebhookService(deps).synchronizeStripeChargeRefunds({
      charge: makeCharge(),
    });

    expect(deps.storage.createRefund).toHaveBeenCalledWith({
      orderId: "order-1",
      amount: 2500,
      reason: "requested_by_customer",
      reasonCode: "requested_by_customer",
      type: "partial",
      source: "stripe",
      stripeRefundId: "re_123",
      status: "pending",
      processedAt: undefined,
    });
    const refundOperations = await deps.loadRefundOperations();
    expect(refundOperations.updateOrderPaymentStatus).toHaveBeenCalledWith("order-1");
  });

  it("updates an existing refund without creating a duplicate", async () => {
    const existingRefund = {
      id: "refund-existing",
      status: "pending",
      processedAt: null,
    };
    vi.mocked(deps.storage.getRefundByStripeRefundId).mockResolvedValue(existingRefund as any);

    await createStripeRefundWebhookService(deps).synchronizeStripeChargeRefunds({
      charge: makeCharge({
        refunds: { data: [{ id: "re_123", amount: 2500, status: "succeeded" }] },
      }),
    });

    expect(deps.storage.updateRefund).toHaveBeenCalledWith("refund-existing", {
      status: "processed",
      processedAt: expect.any(Date),
    });
    expect(deps.storage.createRefund).not.toHaveBeenCalled();
  });

  it("warns and stops when the payment intent has no local order", async () => {
    vi.mocked(deps.storage.getOrderByPaymentIntentId).mockResolvedValue(undefined);

    await createStripeRefundWebhookService(deps).synchronizeStripeChargeRefunds({
      charge: makeCharge(),
    });

    expect(deps.log.warn).toHaveBeenCalledWith(
      "[WEBHOOK] charge.refunded: No order found for payment_intent pi_123",
    );
    expect(deps.storage.createRefund).not.toHaveBeenCalled();
  });

  it("swallows synchronization seam errors", async () => {
    vi.mocked(deps.storage.getOrderByPaymentIntentId).mockRejectedValue(new Error("refund storage unavailable"));

    await expect(
      createStripeRefundWebhookService(deps).synchronizeStripeChargeRefunds({ charge: makeCharge() }),
    ).resolves.toBeUndefined();
    expect(deps.log.error).toHaveBeenCalledWith(
      "[WEBHOOK] Error processing charge.refunded:",
      "refund storage unavailable",
    );
  });

  it("attempts Meta enqueue when a processed refund is created", async () => {
    await createStripeRefundWebhookService(deps).synchronizeStripeChargeRefunds({
      charge: makeCharge({
        refunds: { data: [{ id: "re_processed", amount: 5000, status: "succeeded" }] },
      }),
    });

    expect(deps.enqueueRefundProcessed).toHaveBeenCalledWith("refund-created");
  });

  it("attempts Meta enqueue when an existing refund becomes processed", async () => {
    vi.mocked(deps.storage.getRefundByStripeRefundId).mockResolvedValue({
      id: "refund-existing",
      status: "pending",
      processedAt: null,
    } as any);

    await createStripeRefundWebhookService(deps).synchronizeStripeChargeRefunds({
      charge: makeCharge({
        refunds: { data: [{ id: "re_processed", amount: 5000, status: "succeeded" }] },
      }),
    });

    expect(deps.enqueueRefundProcessed).toHaveBeenCalledWith("refund-existing");
  });

  it("processes every refund in the charge before updating the order payment status", async () => {
    await createStripeRefundWebhookService(deps).synchronizeStripeChargeRefunds({
      charge: makeCharge({
        refunds: {
          data: [
            { id: "re_first", amount: 1000, status: "pending" },
            { id: "re_second", amount: 2000, status: "pending" },
          ],
        },
      }),
    });

    expect(deps.storage.createRefund).toHaveBeenCalledTimes(2);
    const refundOperations = await deps.loadRefundOperations();
    expect(refundOperations.updateOrderPaymentStatus).toHaveBeenCalledWith("order-1");
  });

  it("swallows a charge refund Meta failure and completes the refund sync", async () => {
    vi.mocked(deps.enqueueRefundProcessed).mockRejectedValue(new Error("Meta unavailable"));

    await expect(
      createStripeRefundWebhookService(deps).synchronizeStripeChargeRefunds({
        charge: makeCharge({
          refunds: { data: [{ id: "re_processed", amount: 5000, status: "succeeded" }] },
        }),
      }),
    ).resolves.toBeUndefined();

    const refundOperations = await deps.loadRefundOperations();
    expect(refundOperations.updateOrderPaymentStatus).toHaveBeenCalledWith("order-1");
    expect(deps.log.error).toHaveBeenCalledWith(
      "[META] Failed to enqueue processed refund (charge.refunded/create):",
      "Meta unavailable",
    );
  });

  it("keeps earlier charge refund writes when a later write fails", async () => {
    vi.mocked(deps.storage.createRefund)
      .mockResolvedValueOnce({ id: "refund-first" } as any)
      .mockRejectedValueOnce(new Error("refund write unavailable"));

    await expect(
      createStripeRefundWebhookService(deps).synchronizeStripeChargeRefunds({
        charge: makeCharge({
          refunds: {
            data: [
              { id: "re_first", amount: 1000, status: "pending" },
              { id: "re_second", amount: 2000, status: "pending" },
              { id: "re_third", amount: 3000, status: "pending" },
            ],
          },
        }),
      }),
    ).resolves.toBeUndefined();

    expect(deps.storage.createRefund).toHaveBeenCalledTimes(2);
    expect(deps.storage.createRefund).toHaveBeenCalledWith(expect.objectContaining({
      stripeRefundId: "re_first",
    }));
    expect(deps.storage.createRefund).not.toHaveBeenCalledWith(expect.objectContaining({
      stripeRefundId: "re_third",
    }));
    const refundOperations = await deps.loadRefundOperations();
    expect(refundOperations.updateOrderPaymentStatus).not.toHaveBeenCalled();
    expect(deps.log.error).toHaveBeenCalledWith(
      "[WEBHOOK] Error processing charge.refunded:",
      "refund write unavailable",
    );
  });

  it("synchronizes a changed Stripe refund status", async () => {
    vi.mocked(deps.storage.getRefundByStripeRefundId).mockResolvedValue({
      id: "refund-existing",
      orderId: "order-1",
      status: "pending",
      processedAt: null,
    } as any);

    await createStripeRefundWebhookService(deps).synchronizeStripeRefundStatus({
      refund: makeRefundUpdate(),
      eventId: "evt_123",
    });

    expect(deps.storage.updateRefund).toHaveBeenCalledWith("refund-existing", {
      status: "processed",
      processedAt: expect.any(Date),
    });
    const refundOperations = await deps.loadRefundOperations();
    expect(refundOperations.updateOrderPaymentStatus).toHaveBeenCalledWith("order-1");
    expect(deps.storage.createAuditLog).toHaveBeenCalledWith({
      actor: "stripe_webhook",
      action: "refund.status_synced",
      entityType: "refund",
      entityId: "refund-existing",
      metadata: {
        orderId: "order-1",
        stripeRefundId: "re_123",
        previousStatus: "pending",
        newStatus: "processed",
        stripeStatus: "succeeded",
        eventId: "evt_123",
      },
    });
  });

  it("does nothing when the Stripe refund status is unchanged", async () => {
    vi.mocked(deps.storage.getRefundByStripeRefundId).mockResolvedValue({
      id: "refund-existing",
      orderId: "order-1",
      status: "pending",
      processedAt: null,
    } as any);

    await createStripeRefundWebhookService(deps).synchronizeStripeRefundStatus({
      refund: makeRefundUpdate({ status: "pending" }),
      eventId: "evt_123",
    });

    expect(deps.storage.updateRefund).not.toHaveBeenCalled();
    expect(deps.storage.createAuditLog).not.toHaveBeenCalled();
    expect(deps.enqueueRefundProcessed).not.toHaveBeenCalled();
    const refundOperations = await deps.loadRefundOperations();
    expect(refundOperations.updateOrderPaymentStatus).not.toHaveBeenCalled();
    expect(deps.log.log).not.toHaveBeenCalled();
  });

  it("attempts Meta enqueue when a refund update becomes processed", async () => {
    vi.mocked(deps.storage.getRefundByStripeRefundId).mockResolvedValue({
      id: "refund-existing",
      orderId: "order-1",
      status: "pending",
      processedAt: null,
    } as any);

    await createStripeRefundWebhookService(deps).synchronizeStripeRefundStatus({
      refund: makeRefundUpdate(),
      eventId: "evt_123",
    });

    expect(deps.enqueueRefundProcessed).toHaveBeenCalledWith("refund-existing");
  });

  it("swallows a refund update Meta failure and completes the status sync", async () => {
    vi.mocked(deps.storage.getRefundByStripeRefundId).mockResolvedValue({
      id: "refund-existing",
      orderId: "order-1",
      status: "pending",
      processedAt: null,
    } as any);
    vi.mocked(deps.enqueueRefundProcessed).mockRejectedValue(new Error("Meta unavailable"));

    await expect(
      createStripeRefundWebhookService(deps).synchronizeStripeRefundStatus({
        refund: makeRefundUpdate(),
        eventId: "evt_123",
      }),
    ).resolves.toBeUndefined();

    const refundOperations = await deps.loadRefundOperations();
    expect(refundOperations.updateOrderPaymentStatus).toHaveBeenCalledWith("order-1");
    expect(deps.storage.createAuditLog).toHaveBeenCalled();
    expect(deps.log.error).toHaveBeenCalledWith(
      "[META] Failed to enqueue processed refund (refund.updated):",
      "Meta unavailable",
    );
  });

  it("warns when a Stripe refund update has no local refund", async () => {
    vi.mocked(deps.storage.getRefundByStripeRefundId).mockResolvedValue(undefined);

    await createStripeRefundWebhookService(deps).synchronizeStripeRefundStatus({
      refund: makeRefundUpdate(),
      eventId: "evt_123",
    });

    expect(deps.log.warn).toHaveBeenCalledWith(
      "[WEBHOOK] refund.updated: No local refund found for Stripe refund re_123",
    );
    expect(deps.storage.updateRefund).not.toHaveBeenCalled();
  });

  it("swallows refund status synchronization seam errors", async () => {
    vi.mocked(deps.storage.getRefundByStripeRefundId).mockRejectedValue(
      new Error("refund storage unavailable"),
    );

    await expect(
      createStripeRefundWebhookService(deps).synchronizeStripeRefundStatus({
        refund: makeRefundUpdate(),
        eventId: "evt_123",
      }),
    ).resolves.toBeUndefined();
    expect(deps.log.error).toHaveBeenCalledWith(
      "[WEBHOOK] Error processing refund.updated:",
      "refund storage unavailable",
    );
  });
});
