import express from "express";
import { createServer, type Server } from "http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentEvent: undefined as any,
  storage: {
    getProcessedWebhookEvent: vi.fn(),
    createProcessedWebhookEvent: vi.fn(),
    getOrderByStripeSession: vi.fn(),
    updateOrder: vi.fn(),
  },
  stripeService: {
    getDbOnlyWebhookSecret: vi.fn(),
    constructWebhookEvent: vi.fn(),
  },
  finalizationService: {
    finalizeStripePaymentIntent: vi.fn(),
    finalizeStripeCheckoutSession: vi.fn(),
  },
  recordCommission: vi.fn(),
  enqueuePurchase: vi.fn(),
  sendOrderNotification: vi.fn(),
  alertWebhookFailure: vi.fn(),
}));

vi.mock("../../../../storage", () => ({ storage: mocks.storage }));
vi.mock("../../../integrations/stripe/StripeService", () => ({ stripeService: mocks.stripeService }));
vi.mock("../../../services/order-finalization.service", () => ({
  createOrderFinalizationService: vi.fn(() => mocks.finalizationService),
}));
vi.mock("../../../services/affiliate-commission.service", () => ({
  affiliateCommissionService: {
    recordCommission: mocks.recordCommission,
  },
}));
vi.mock("../../../integrations/meta/MetaConversionsService", () => ({
  metaConversionsService: {
    enqueuePurchase: mocks.enqueuePurchase,
  },
}));
vi.mock("../../../services/error-alerting.service", () => ({
  errorAlertingService: {
    alertWebhookFailure: mocks.alertWebhookFailure,
  },
}));
vi.mock("../../public/payments.routes", () => ({
  sendOrderNotification: mocks.sendOrderNotification,
}));

const router = (await import("../stripe.routes")).default;

async function startApp() {
  const app = express();
  app.use(express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }));
  app.use("/webhooks", router);

  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Failed to listen");

  return {
    server,
    request: (path: string, init?: RequestInit) => fetch(`http://127.0.0.1:${address.port}${path}`, init),
  };
}

let server: Server | undefined;

describe("Stripe webhook routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentEvent = undefined;
    mocks.stripeService.getDbOnlyWebhookSecret.mockResolvedValue({
      secret: "whsec_test",
      source: "database",
      mode: "test",
    });
    mocks.stripeService.constructWebhookEvent.mockImplementation(async () => mocks.currentEvent);
    mocks.storage.getProcessedWebhookEvent.mockResolvedValue(undefined);
    mocks.storage.createProcessedWebhookEvent.mockResolvedValue(undefined);
    mocks.recordCommission.mockResolvedValue({ success: true, commissionAmount: 1000 });
    mocks.enqueuePurchase.mockResolvedValue({ success: true, queued: true });
    mocks.sendOrderNotification.mockResolvedValue(undefined);
    mocks.finalizationService.finalizeStripePaymentIntent.mockResolvedValue({
      status: "finalized",
      orderId: "order-1",
      order: { id: "order-1", status: "paid", paymentStatus: "paid" },
    });
    mocks.finalizationService.finalizeStripeCheckoutSession.mockResolvedValue({
      status: "finalized",
      orderId: "order-1",
      order: { id: "order-1", status: "paid", paymentStatus: "paid" },
    });
  });

  afterEach(async () => {
    if (!server) return;
    await new Promise<void>((resolve, reject) => {
      server!.close((error) => (error ? reject(error) : resolve()));
    });
    server = undefined;
  });

  it("finalizes checkout.session.completed orders through the order finalization service", async () => {
    mocks.currentEvent = {
      id: "evt_checkout_completed",
      type: "checkout.session.completed",
      livemode: false,
      data: {
        object: {
          id: "cs_test_123",
          payment_intent: "pi_123",
          amount_total: 10000,
          currency: "usd",
          metadata: {
            affiliateSessionId: "session-1",
            attributionType: "coupon",
            isFriendsFamily: "true",
          },
        },
      },
    };

    const app = await startApp();
    server = app.server;
    const response = await app.request("/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "sig_test", "content-type": "application/json" },
      body: "{}",
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
    expect(mocks.storage.getOrderByStripeSession).not.toHaveBeenCalled();
    expect(mocks.finalizationService.finalizeStripeCheckoutSession).toHaveBeenCalledWith({
      session: mocks.currentEvent.data.object,
    });
    expect(mocks.finalizationService.finalizeStripePaymentIntent).not.toHaveBeenCalled();
    expect(mocks.storage.updateOrder).not.toHaveBeenCalled();
    expect(mocks.recordCommission).not.toHaveBeenCalled();
    expect(mocks.enqueuePurchase).not.toHaveBeenCalled();
    expect(mocks.sendOrderNotification).not.toHaveBeenCalled();
  });

  it("leaves late checkout.session.completed paid obligations behind the finalization claim", async () => {
    const paidOrder = {
      id: "order-1",
      status: "paid",
      paymentStatus: "paid",
      totalAmount: 10000,
      affiliateCode: "AFFILIATE",
    };
    mocks.finalizationService.finalizeStripeCheckoutSession.mockResolvedValue({
      status: "skipped",
      orderId: "order-1",
      reason: "claim_not_won",
      order: paidOrder,
    });
    mocks.currentEvent = {
      id: "evt_checkout_completed_late",
      type: "checkout.session.completed",
      livemode: false,
      data: {
        object: {
          id: "cs_test_123",
          payment_intent: "pi_123",
          amount_total: 10000,
          currency: "usd",
          metadata: {
            affiliateSessionId: "session-1",
            attributionType: "coupon",
            isFriendsFamily: "true",
          },
        },
      },
    };

    const app = await startApp();
    server = app.server;
    const response = await app.request("/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "sig_test", "content-type": "application/json" },
      body: "{}",
    });

    expect(response.status).toBe(200);
    expect(mocks.finalizationService.finalizeStripeCheckoutSession).toHaveBeenCalledOnce();
    expect(mocks.finalizationService.finalizeStripePaymentIntent).not.toHaveBeenCalled();
    expect(mocks.storage.updateOrder).not.toHaveBeenCalled();
    expect(mocks.recordCommission).not.toHaveBeenCalled();
    expect(mocks.enqueuePurchase).not.toHaveBeenCalled();
    expect(mocks.sendOrderNotification).not.toHaveBeenCalled();
  });

  it("passes Stripe-added tax Checkout Sessions to Checkout Session finalization", async () => {
    mocks.currentEvent = {
      id: "evt_checkout_completed_taxed",
      type: "checkout.session.completed",
      livemode: false,
      data: {
        object: {
          id: "cs_test_taxed",
          payment_intent: "pi_taxed",
          amount_total: 10825,
          currency: "usd",
          automatic_tax: { enabled: true, status: "complete" },
          metadata: {
            attributionType: "direct",
          },
        },
      },
    };

    const app = await startApp();
    server = app.server;
    const response = await app.request("/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "sig_test", "content-type": "application/json" },
      body: "{}",
    });

    expect(response.status).toBe(200);
    expect(mocks.finalizationService.finalizeStripeCheckoutSession).toHaveBeenCalledWith({
      session: mocks.currentEvent.data.object,
    });
    expect(mocks.finalizationService.finalizeStripePaymentIntent).not.toHaveBeenCalled();
  });
});
