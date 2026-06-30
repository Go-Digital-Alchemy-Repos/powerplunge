import express from "express";
import { createServer, type Server } from "http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  storage: {
    getOrder: vi.fn(),
    updateOrder: vi.fn(),
  },
  stripeClient: {
    paymentIntents: {
      retrieve: vi.fn(),
    },
    tax: {
      transactions: {
        createFromCalculation: vi.fn(),
      },
    },
  },
  stripeService: {
    getClient: vi.fn(),
  },
  finalizationService: {
    finalizeStripePaymentIntent: vi.fn(),
  },
  enqueuePurchase: vi.fn(),
}));

vi.mock("../../../../storage", () => ({ storage: mocks.storage }));
vi.mock("../../../integrations/stripe/StripeService", () => ({ stripeService: mocks.stripeService }));
vi.mock("../../../services/order-finalization.service", () => ({
  createOrderFinalizationService: vi.fn(() => mocks.finalizationService),
}));
vi.mock("../../../integrations/meta/MetaConversionsService", () => ({
  metaConversionsService: {
    enqueuePurchase: mocks.enqueuePurchase,
  },
}));
vi.mock("../../../middleware/rate-limiter", () => ({
  checkoutLimiter: (_req: any, _res: any, next: any) => next(),
  paymentLimiter: (_req: any, _res: any, next: any) => next(),
}));
vi.mock("../../../auth/customerBetterAuth", () => ({
  getCustomerAuthContext: vi.fn(() => null),
}));
vi.mock("../../../../db", () => ({ db: {} }));

const router = (await import("../payments.routes")).default;

async function startApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", router);

  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Failed to listen");

  return {
    server,
    request: (path: string, init?: RequestInit) =>
      fetch(`http://127.0.0.1:${address.port}${path}`, init),
  };
}

let server: Server | undefined;

describe("public payment routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.stripeService.getClient.mockResolvedValue(mocks.stripeClient);
  });

  afterEach(async () => {
    if (!server) return;
    await new Promise<void>((resolve, reject) => {
      server!.close((error) => (error ? reject(error) : resolve()));
    });
    server = undefined;
  });

  it("keeps the already-paid confirm-payment Meta repair path after updating late tracking", async () => {
    const paidOrder = {
      id: "order-1",
      customerId: "customer-1",
      status: "paid",
      paymentStatus: "paid",
      totalAmount: 10000,
      stripePaymentIntentId: "pi_123",
    };
    const trackedOrder = {
      ...paidOrder,
      marketingConsentGranted: true,
      metaFbp: "fbp-1",
      customerUserAgent: "agent-1",
    };
    mocks.stripeClient.paymentIntents.retrieve.mockResolvedValue({
      id: "pi_123",
      status: "succeeded",
      amount: 10000,
      currency: "usd",
      metadata: { orderId: "order-1" },
    });
    mocks.storage.getOrder.mockResolvedValue(paidOrder);
    mocks.storage.updateOrder.mockResolvedValue(trackedOrder);
    mocks.finalizationService.finalizeStripePaymentIntent.mockResolvedValue({
      status: "skipped",
      orderId: "order-1",
      reason: "claim_not_won",
      order: paidOrder,
    });
    mocks.enqueuePurchase.mockResolvedValue({ success: true, queued: true });

    const app = await startApp();
    server = app.server;
    const response = await app.request("/api/confirm-payment", {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "agent-1" },
      body: JSON.stringify({
        orderId: "order-1",
        paymentIntentId: "pi_123",
        metaTracking: {
          marketingConsentGranted: true,
          fbp: "fbp-1",
        },
      }),
    });

    expect(response.status).toBe(200);
    expect(mocks.storage.updateOrder).toHaveBeenCalledWith("order-1", {
      marketingConsentGranted: true,
      metaFbp: "fbp-1",
      customerUserAgent: "agent-1",
    });
    expect(mocks.enqueuePurchase).toHaveBeenCalledWith("order-1");
  });
});
