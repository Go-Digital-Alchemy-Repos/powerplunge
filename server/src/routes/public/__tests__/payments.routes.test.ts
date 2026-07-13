import express from "express";
import { createServer, type Server } from "http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  storage: {
    getOrder: vi.fn(),
    updateOrder: vi.fn(),
    getAffiliateByCode: vi.fn(),
    getAffiliate: vi.fn(),
    getAffiliateSettings: vi.fn(),
    getCustomer: vi.fn(),
    getCustomerByEmail: vi.fn(),
    createCustomer: vi.fn(),
    updateCustomer: vi.fn(),
    getProduct: vi.fn(),
    createOrder: vi.fn(),
    createOrderItem: vi.fn(),
    getAffiliateReferralByOrderId: vi.fn(),
    createAffiliateReferral: vi.fn(),
    updateAffiliate: vi.fn(),
  },
  stripeClient: {
    paymentIntents: {
      retrieve: vi.fn(),
    },
    checkout: {
      sessions: {
        create: vi.fn(),
      },
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
  sendOrderNotification: vi.fn(),
}));

vi.mock("../../../../storage", () => ({ storage: mocks.storage }));
vi.mock("../../../integrations/stripe/StripeService", () => ({ stripeService: mocks.stripeService }));
vi.mock("../../../services/order-finalization.service", () => ({
  createOrderFinalizationService: vi.fn(() => mocks.finalizationService),
}));
vi.mock("../../../services/order-notification.service", () => ({
  sendOrderNotification: mocks.sendOrderNotification,
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
  getCustomerAuthContext: vi.fn(() => Promise.resolve(null)),
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

async function confirmPayment(body: { orderId: string; paymentIntentId: string }) {
  const app = await startApp();
  server = app.server;
  return app.request("/api/confirm-payment", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("public payment routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.stripeService.getClient.mockResolvedValue(mocks.stripeClient);
    mocks.storage.getAffiliateByCode.mockResolvedValue(undefined);
    mocks.storage.getAffiliate.mockResolvedValue(undefined);
    mocks.storage.getAffiliateSettings.mockResolvedValue({
      defaultDiscountType: "PERCENT",
      defaultDiscountValue: 0,
      commissionRate: 10,
    });
    mocks.storage.getCustomerByEmail.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    if (!server) return;
    await new Promise<void>((resolve, reject) => {
      server!.close((error) => (error ? reject(error) : resolve()));
    });
    server = undefined;
  });

  it("returns not found when confirm-payment names an unknown order", async () => {
    mocks.stripeClient.paymentIntents.retrieve.mockResolvedValue({
      id: "pi_unknown",
      status: "succeeded",
      amount: 10000,
      currency: "usd",
      metadata: { orderId: "order-missing" },
    });
    mocks.storage.getOrder.mockResolvedValue(undefined);
    mocks.finalizationService.finalizeStripePaymentIntent.mockResolvedValue({
      status: "skipped",
      orderId: "order-missing",
      reason: "order_not_found",
    });

    const response = await confirmPayment({
      orderId: "order-missing",
      paymentIntentId: "pi_unknown",
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ message: "Order not found" });
    expect(mocks.storage.updateOrder).not.toHaveBeenCalled();
    expect(mocks.enqueuePurchase).not.toHaveBeenCalled();
  });

  it("rejects a confirm-payment amount that differs from the order total", async () => {
    mocks.stripeClient.paymentIntents.retrieve.mockResolvedValue({
      id: "pi_wrong_amount",
      status: "succeeded",
      amount: 9999,
      currency: "usd",
      metadata: { orderId: "order-1" },
    });
    const order = { id: "order-1", status: "pending", paymentStatus: "unpaid", totalAmount: 10000 };
    mocks.storage.getOrder.mockResolvedValue(order);
    mocks.finalizationService.finalizeStripePaymentIntent.mockResolvedValue({
      status: "skipped",
      orderId: "order-1",
      reason: "amount_mismatch",
      order,
    });

    const response = await confirmPayment({ orderId: "order-1", paymentIntentId: "pi_wrong_amount" });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: "Payment amount mismatch" });
    expect(mocks.storage.updateOrder).not.toHaveBeenCalled();
    expect(mocks.enqueuePurchase).not.toHaveBeenCalled();
  });

  it("rejects a confirm-payment currency other than usd", async () => {
    mocks.stripeClient.paymentIntents.retrieve.mockResolvedValue({
      id: "pi_wrong_currency",
      status: "succeeded",
      amount: 10000,
      currency: "eur",
      metadata: { orderId: "order-1" },
    });
    const order = { id: "order-1", status: "pending", paymentStatus: "unpaid", totalAmount: 10000 };
    mocks.storage.getOrder.mockResolvedValue(order);
    mocks.finalizationService.finalizeStripePaymentIntent.mockResolvedValue({
      status: "skipped",
      orderId: "order-1",
      reason: "currency_mismatch",
      order,
    });

    const response = await confirmPayment({ orderId: "order-1", paymentIntentId: "pi_wrong_currency" });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: "Invalid currency" });
    expect(mocks.storage.updateOrder).not.toHaveBeenCalled();
    expect(mocks.enqueuePurchase).not.toHaveBeenCalled();
  });

  it("accepts uppercase USD through the normal confirm-payment finalization path", async () => {
    const paidOrder = {
      id: "order-1",
      status: "paid",
      paymentStatus: "paid",
      totalAmount: 10000,
    };
    mocks.stripeClient.paymentIntents.retrieve.mockResolvedValue({
      id: "pi_uppercase_currency",
      status: "succeeded",
      amount: 10000,
      currency: "USD",
      metadata: { orderId: "order-1" },
    });
    mocks.finalizationService.finalizeStripePaymentIntent.mockResolvedValue({
      status: "finalized",
      orderId: "order-1",
      order: paidOrder,
    });

    const response = await confirmPayment({ orderId: "order-1", paymentIntentId: "pi_uppercase_currency" });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, orderId: "order-1" });
    expect(mocks.finalizationService.finalizeStripePaymentIntent).toHaveBeenCalledWith({
      paymentIntent: {
        id: "pi_uppercase_currency",
        amount: 10000,
        currency: "USD",
        metadata: { orderId: "order-1" },
      },
      orderUpdate: {},
    });
    expect(mocks.enqueuePurchase).not.toHaveBeenCalled();
  });

  it("rejects confirm-payment when the request order differs from Stripe metadata", async () => {
    mocks.stripeClient.paymentIntents.retrieve.mockResolvedValue({
      id: "pi_wrong_order",
      status: "succeeded",
      amount: 10000,
      currency: "usd",
      metadata: { orderId: "order-2" },
    });

    const response = await confirmPayment({ orderId: "order-1", paymentIntentId: "pi_wrong_order" });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: "Invalid payment verification" });
    expect(mocks.storage.updateOrder).not.toHaveBeenCalled();
    expect(mocks.enqueuePurchase).not.toHaveBeenCalled();
  });

  it("rejects confirm-payment when Stripe has not completed the payment", async () => {
    mocks.stripeClient.paymentIntents.retrieve.mockResolvedValue({
      id: "pi_processing",
      status: "processing",
      amount: 10000,
      currency: "usd",
      metadata: { orderId: "order-1" },
    });

    const response = await confirmPayment({ orderId: "order-1", paymentIntentId: "pi_processing" });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: "Payment not completed" });
    expect(mocks.storage.updateOrder).not.toHaveBeenCalled();
    expect(mocks.enqueuePurchase).not.toHaveBeenCalled();
  });

  it("allows a checkout-session payment intent with a mismatched amount to fall through", async () => {
    mocks.stripeClient.paymentIntents.retrieve.mockResolvedValue({
      id: "pi_checkout_wrong_amount",
      status: "succeeded",
      amount: 9999,
      currency: "usd",
      metadata: { orderId: "order-1", paymentFlow: "checkout_session" },
    });
    const order = { id: "order-1", status: "pending", paymentStatus: "unpaid", totalAmount: 10000 };
    mocks.storage.getOrder.mockResolvedValue(order);
    mocks.finalizationService.finalizeStripePaymentIntent.mockResolvedValue({
      status: "skipped",
      orderId: "order-1",
      reason: "checkout_session_payment_intent",
      order,
    });

    const response = await confirmPayment({
      orderId: "order-1",
      paymentIntentId: "pi_checkout_wrong_amount",
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, orderId: "order-1" });
    expect(mocks.finalizationService.finalizeStripePaymentIntent).toHaveBeenCalledWith({
      paymentIntent: {
        id: "pi_checkout_wrong_amount",
        amount: 9999,
        currency: "usd",
        metadata: { orderId: "order-1", paymentFlow: "checkout_session" },
      },
      orderUpdate: {},
    });
    expect(mocks.storage.updateOrder).not.toHaveBeenCalled();
    expect(mocks.enqueuePurchase).not.toHaveBeenCalled();
  });

  it("allows a checkout-session payment intent with a mismatched currency to fall through", async () => {
    mocks.stripeClient.paymentIntents.retrieve.mockResolvedValue({
      id: "pi_checkout_wrong_currency",
      status: "succeeded",
      amount: 10000,
      currency: "eur",
      metadata: { orderId: "order-1", paymentFlow: "checkout_session" },
    });
    const order = { id: "order-1", status: "pending", paymentStatus: "unpaid", totalAmount: 10000 };
    mocks.finalizationService.finalizeStripePaymentIntent.mockResolvedValue({
      status: "skipped",
      orderId: "order-1",
      reason: "checkout_session_payment_intent",
      order,
    });

    const response = await confirmPayment({
      orderId: "order-1",
      paymentIntentId: "pi_checkout_wrong_currency",
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, orderId: "order-1" });
    expect(mocks.finalizationService.finalizeStripePaymentIntent).toHaveBeenCalledWith({
      paymentIntent: {
        id: "pi_checkout_wrong_currency",
        amount: 10000,
        currency: "eur",
        metadata: { orderId: "order-1", paymentFlow: "checkout_session" },
      },
      orderUpdate: {},
    });
    expect(mocks.storage.updateOrder).not.toHaveBeenCalled();
    expect(mocks.enqueuePurchase).not.toHaveBeenCalled();
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

  it("creates Checkout Sessions with durable local order identity", async () => {
    const customer = {
      id: "customer-1",
      email: "buyer@example.com",
      name: "Buyer Example",
      phone: "555-555-5555",
      address: "1 Test Way",
      city: "Raleigh",
      state: "NC",
      zipCode: "27601",
      userId: null,
    };
    const order = {
      id: "order-1",
      customerId: "customer-1",
      status: "pending",
      paymentStatus: "unpaid",
      subtotalAmount: 2500,
      totalAmount: 2500,
      stripeSessionId: null,
      affiliateCode: null,
      affiliateIsFriendsFamily: false,
      affiliateDiscountAmount: null,
    };
    mocks.storage.createCustomer.mockResolvedValue(customer);
    mocks.storage.getProduct.mockResolvedValue({
      id: "product-1",
      name: "Cold Plunge",
      price: 2500,
      affiliateEnabled: true,
      affiliateUseGlobalSettings: true,
      affiliateDiscountType: null,
      affiliateDiscountValue: null,
    });
    mocks.storage.createOrder.mockResolvedValue(order);
    mocks.storage.createOrderItem.mockResolvedValue({ id: "item-1", orderId: "order-1" });
    mocks.stripeClient.checkout.sessions.create.mockResolvedValue({
      id: "cs_test_123",
      url: "https://checkout.stripe.test/cs_test_123",
    });

    const app = await startApp();
    server = app.server;
    const response = await app.request("/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        items: [{ productId: "product-1", quantity: 1 }],
        customer: {
          email: "buyer@example.com",
          name: "Buyer Example",
          phone: "555-555-5555",
          address: "1 Test Way",
          city: "Raleigh",
          state: "NC",
          zipCode: "27601",
        },
      }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      checkoutUrl: "https://checkout.stripe.test/cs_test_123",
      orderId: "order-1",
    });
    expect(mocks.storage.createOrder).toHaveBeenCalledWith(expect.objectContaining({
      customerId: "customer-1",
      status: "pending",
      subtotalAmount: 2500,
      totalAmount: 2500,
      stripeSessionId: null,
    }));
    const createOrderCallOrder = mocks.storage.createOrder.mock.invocationCallOrder[0];
    const createSessionCallOrder = mocks.stripeClient.checkout.sessions.create.mock.invocationCallOrder[0];
    expect(createOrderCallOrder).toBeLessThan(createSessionCallOrder);
    expect(mocks.stripeClient.checkout.sessions.create).toHaveBeenCalledWith(expect.objectContaining({
      client_reference_id: "order-1",
      metadata: expect.objectContaining({
        orderId: "order-1",
        customerId: "customer-1",
      }),
      payment_intent_data: expect.objectContaining({
        metadata: expect.objectContaining({
          orderId: "order-1",
          customerId: "customer-1",
        }),
      }),
    }));
    expect(mocks.storage.updateOrder).toHaveBeenCalledWith("order-1", {
      stripeSessionId: "cs_test_123",
    });
  });

  it("discounts Checkout Session line items to the local affiliate-discounted subtotal", async () => {
    const customer = {
      id: "customer-1",
      email: "buyer@example.com",
      name: "Buyer Example",
      phone: "555-555-5555",
      address: "1 Test Way",
      city: "Raleigh",
      state: "NC",
      zipCode: "27601",
      userId: null,
    };
    const affiliate = {
      id: "affiliate-1",
      affiliateCode: "SAVE10",
      customerId: "affiliate-customer-1",
      status: "active",
      useCustomRates: false,
      customDiscountType: null,
      customDiscountValue: null,
      ffEnabled: false,
    };
    mocks.storage.getAffiliateByCode.mockResolvedValue(affiliate);
    mocks.storage.getAffiliateSettings.mockResolvedValue({
      defaultDiscountType: "PERCENT",
      defaultDiscountValue: 10,
      commissionRate: 10,
    });
    mocks.storage.getCustomer.mockResolvedValue({
      id: "affiliate-customer-1",
      email: "affiliate@example.com",
      isDisabled: false,
    });
    mocks.storage.createCustomer.mockResolvedValue(customer);
    mocks.storage.getProduct
      .mockResolvedValueOnce({
        id: "product-1",
        name: "Cold Plunge",
        price: 1000,
        affiliateEnabled: true,
        affiliateUseGlobalSettings: true,
        affiliateDiscountType: null,
        affiliateDiscountValue: null,
      })
      .mockResolvedValueOnce({
        id: "product-2",
        name: "Recovery Mat",
        price: 500,
        affiliateEnabled: true,
        affiliateUseGlobalSettings: true,
        affiliateDiscountType: null,
        affiliateDiscountValue: null,
      });
    mocks.storage.createOrder.mockResolvedValue({
      id: "order-1",
      customerId: "customer-1",
      status: "pending",
      paymentStatus: "unpaid",
      subtotalAmount: 1500,
      totalAmount: 1350,
      stripeSessionId: null,
      affiliateCode: "SAVE10",
      affiliateIsFriendsFamily: false,
      affiliateDiscountAmount: 150,
    });
    mocks.storage.createOrderItem.mockResolvedValue({ id: "item-1", orderId: "order-1" });
    mocks.stripeClient.checkout.sessions.create.mockResolvedValue({
      id: "cs_test_123",
      url: "https://checkout.stripe.test/cs_test_123",
    });

    const app = await startApp();
    server = app.server;
    const response = await app.request("/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        affiliateCode: "SAVE10",
        items: [
          { productId: "product-1", quantity: 1 },
          { productId: "product-2", quantity: 1 },
        ],
        customer: {
          email: "buyer@example.com",
          name: "Buyer Example",
          phone: "555-555-5555",
          address: "1 Test Way",
          city: "Raleigh",
          state: "NC",
          zipCode: "27601",
        },
      }),
    });

    expect(response.status).toBe(200);
    expect(mocks.storage.createOrder).toHaveBeenCalledWith(expect.objectContaining({
      subtotalAmount: 1500,
      totalAmount: 1350,
      affiliateDiscountAmount: 150,
    }));
    const sessionInput = mocks.stripeClient.checkout.sessions.create.mock.calls[0][0];
    const stripeSubtotal = sessionInput.line_items.reduce(
      (sum: number, item: any) => sum + item.price_data.unit_amount * item.quantity,
      0,
    );
    expect(stripeSubtotal).toBe(1350);
    expect(sessionInput.line_items.map((item: any) => item.price_data.unit_amount)).toEqual([900, 450]);
  });

  it("does not allocate affiliate discounts to ineligible Checkout line items", async () => {
    const customer = {
      id: "customer-1",
      email: "buyer@example.com",
      name: "Buyer Example",
      phone: "555-555-5555",
      address: "1 Test Way",
      city: "Raleigh",
      state: "NC",
      zipCode: "27601",
      userId: null,
    };
    mocks.storage.getAffiliateByCode.mockResolvedValue({
      id: "affiliate-1",
      affiliateCode: "SAVE10",
      customerId: "affiliate-customer-1",
      status: "active",
      useCustomRates: false,
      customDiscountType: null,
      customDiscountValue: null,
      ffEnabled: false,
    });
    mocks.storage.getAffiliateSettings.mockResolvedValue({
      defaultDiscountType: "PERCENT",
      defaultDiscountValue: 10,
      commissionRate: 10,
    });
    mocks.storage.getCustomer.mockResolvedValue({
      id: "affiliate-customer-1",
      email: "affiliate@example.com",
      isDisabled: false,
    });
    mocks.storage.createCustomer.mockResolvedValue(customer);
    mocks.storage.getProduct
      .mockResolvedValueOnce({
        id: "product-1",
        name: "Eligible",
        price: 1000,
        affiliateEnabled: true,
        affiliateUseGlobalSettings: true,
        affiliateDiscountType: null,
        affiliateDiscountValue: null,
      })
      .mockResolvedValueOnce({
        id: "product-2",
        name: "Ineligible",
        price: 500,
        affiliateEnabled: false,
        affiliateUseGlobalSettings: true,
        affiliateDiscountType: null,
        affiliateDiscountValue: null,
      });
    mocks.storage.createOrder.mockResolvedValue({
      id: "order-1",
      customerId: "customer-1",
      status: "pending",
      paymentStatus: "unpaid",
      subtotalAmount: 1500,
      totalAmount: 1400,
      stripeSessionId: null,
      affiliateCode: "SAVE10",
      affiliateIsFriendsFamily: false,
      affiliateDiscountAmount: 100,
    });
    mocks.storage.createOrderItem.mockResolvedValue({ id: "item-1", orderId: "order-1" });
    mocks.stripeClient.checkout.sessions.create.mockResolvedValue({
      id: "cs_test_123",
      url: "https://checkout.stripe.test/cs_test_123",
    });

    const app = await startApp();
    server = app.server;
    const response = await app.request("/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        affiliateCode: "SAVE10",
        items: [
          { productId: "product-1", quantity: 1 },
          { productId: "product-2", quantity: 1 },
        ],
        customer: {
          email: "buyer@example.com",
          name: "Buyer Example",
          phone: "555-555-5555",
          address: "1 Test Way",
          city: "Raleigh",
          state: "NC",
          zipCode: "27601",
        },
      }),
    });

    expect(response.status).toBe(200);
    const sessionInput = mocks.stripeClient.checkout.sessions.create.mock.calls[0][0];
    expect(sessionInput.line_items.map((item: any) => ({
      name: item.price_data.product_data.name,
      amount: item.price_data.unit_amount,
    }))).toEqual([
      { name: "Eligible", amount: 900 },
      { name: "Ineligible", amount: 500 },
    ]);
  });

  it("rejects Checkout Sessions when discounts reduce the payable subtotal to zero", async () => {
    mocks.storage.getAffiliateByCode.mockResolvedValue({
      id: "affiliate-1",
      affiliateCode: "FREE",
      customerId: "affiliate-customer-1",
      status: "active",
      useCustomRates: true,
      customDiscountType: "PERCENT",
      customDiscountValue: 100,
      ffEnabled: false,
    });
    mocks.storage.getCustomer.mockResolvedValue({
      id: "affiliate-customer-1",
      email: "affiliate@example.com",
      isDisabled: false,
    });
    mocks.storage.createCustomer.mockResolvedValue({
      id: "customer-1",
      email: "buyer@example.com",
      name: "Buyer Example",
      phone: "555-555-5555",
      address: "1 Test Way",
      city: "Raleigh",
      state: "NC",
      zipCode: "27601",
      userId: null,
    });
    mocks.storage.getProduct.mockResolvedValue({
      id: "product-1",
      name: "Cold Plunge",
      price: 1000,
      affiliateEnabled: true,
      affiliateUseGlobalSettings: true,
      affiliateDiscountType: null,
      affiliateDiscountValue: null,
    });

    const app = await startApp();
    server = app.server;
    const response = await app.request("/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        affiliateCode: "FREE",
        items: [{ productId: "product-1", quantity: 1 }],
        customer: {
          email: "buyer@example.com",
          name: "Buyer Example",
          phone: "555-555-5555",
          address: "1 Test Way",
          city: "Raleigh",
          state: "NC",
          zipCode: "27601",
        },
      }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: "Checkout total must be greater than zero" });
    expect(mocks.stripeService.getClient).not.toHaveBeenCalled();
    expect(mocks.stripeClient.checkout.sessions.create).not.toHaveBeenCalled();
    expect(mocks.storage.createOrder).not.toHaveBeenCalled();
  });

  it("creates a pending manual-payment order with affiliate balances when Stripe is unavailable", async () => {
    const affiliate = {
      id: "affiliate-1",
      affiliateCode: "SAVE10",
      customerId: "affiliate-customer-1",
      status: "active",
      useCustomRates: false,
      customDiscountType: null,
      customDiscountValue: null,
      ffEnabled: false,
      totalReferrals: 2,
      pendingBalance: 300,
      totalEarnings: 500,
    };
    mocks.stripeService.getClient.mockResolvedValue(null);
    mocks.storage.getAffiliateByCode.mockResolvedValue(affiliate);
    mocks.storage.getAffiliateSettings.mockResolvedValue({
      defaultDiscountType: "PERCENT",
      defaultDiscountValue: 10,
      commissionRate: 12,
    });
    mocks.storage.getCustomer.mockResolvedValue({
      id: "affiliate-customer-1",
      email: "affiliate@example.com",
      isDisabled: false,
    });
    mocks.storage.createCustomer.mockResolvedValue({ id: "customer-1", email: "buyer@example.com" });
    mocks.storage.getProduct.mockResolvedValue({
      id: "product-1",
      name: "Cold Plunge",
      price: 2500,
      affiliateEnabled: true,
      affiliateUseGlobalSettings: true,
      affiliateDiscountType: null,
      affiliateDiscountValue: null,
    });
    mocks.storage.createOrder.mockResolvedValue({ id: "order-1" });
    mocks.storage.createOrderItem.mockResolvedValue({ id: "item-1" });
    mocks.storage.getAffiliateReferralByOrderId.mockResolvedValue(undefined);

    const app = await startApp();
    server = app.server;
    const response = await app.request("/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        affiliateCode: "SAVE10",
        items: [{ productId: "product-1", quantity: 1 }],
        customer: {
          email: "buyer@example.com", name: "Buyer Example", phone: "555-555-5555",
          address: "1 Test Way", city: "Raleigh", state: "NC", zipCode: "27601",
        },
      }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      orderId: "order-1",
      message: "Order created - Stripe not configured for payment processing",
    });
    expect(mocks.storage.createOrder).toHaveBeenCalledWith(expect.objectContaining({
      customerId: "customer-1",
      status: "pending",
      subtotalAmount: 2500,
      totalAmount: 2250,
      notes: "Stripe not configured - manual payment required",
      affiliateCode: "SAVE10",
      affiliateDiscountAmount: 250,
    }));
    expect(mocks.storage.createAffiliateReferral).toHaveBeenCalledWith({
      affiliateId: "affiliate-1",
      orderId: "order-1",
      orderAmount: 2500,
      commissionAmount: 300,
      commissionRate: 12,
      status: "pending",
    });
    expect(mocks.storage.updateAffiliate).toHaveBeenCalledWith("affiliate-1", {
      totalReferrals: 3,
      pendingBalance: 600,
      totalEarnings: 800,
    });
    expect(mocks.sendOrderNotification).toHaveBeenCalledWith("order-1");
  });

  it("persists affiliate attribution for a successful Checkout Session without creating a referral", async () => {
    const affiliate = {
      id: "affiliate-1", affiliateCode: "SAVE10", customerId: "affiliate-customer-1",
      status: "active", useCustomRates: false, customDiscountType: null,
      customDiscountValue: null, ffEnabled: false,
    };
    mocks.storage.getAffiliateByCode.mockResolvedValue(affiliate);
    mocks.storage.getCustomer.mockResolvedValue({
      id: "affiliate-customer-1", email: "affiliate@example.com", isDisabled: false,
    });
    mocks.storage.createCustomer.mockResolvedValue({ id: "customer-1", email: "buyer@example.com" });
    mocks.storage.getProduct.mockResolvedValue({
      id: "product-1", name: "Cold Plunge", price: 2500, affiliateEnabled: true,
      affiliateUseGlobalSettings: true, affiliateDiscountType: null, affiliateDiscountValue: null,
    });
    mocks.storage.createOrder.mockResolvedValue({ id: "order-1" });
    mocks.storage.createOrderItem.mockResolvedValue({ id: "item-1" });
    mocks.stripeClient.checkout.sessions.create.mockResolvedValue({
      id: "cs_test_123", url: "https://checkout.stripe.test/cs_test_123",
    });

    const app = await startApp();
    server = app.server;
    const response = await app.request("/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        affiliateCode: "SAVE10",
        items: [{ productId: "product-1", quantity: 1 }],
        customer: {
          email: "buyer@example.com", name: "Buyer Example", phone: "555-555-5555",
          address: "1 Test Way", city: "Raleigh", state: "NC", zipCode: "27601",
        },
      }),
    });

    expect(response.status).toBe(200);
    expect(mocks.storage.createOrder).toHaveBeenCalledWith(expect.objectContaining({
      affiliateCode: "SAVE10",
      affiliateIsFriendsFamily: false,
      affiliateDiscountAmount: null,
    }));
    expect(mocks.storage.updateOrder).toHaveBeenCalledWith("order-1", { stripeSessionId: "cs_test_123" });
    expect(mocks.storage.createAffiliateReferral).not.toHaveBeenCalled();
    expect(mocks.storage.updateAffiliate).not.toHaveBeenCalled();
  });

  it("preserves local order identity and the pre-tax Session subtotal contract", async () => {
    mocks.storage.createCustomer.mockResolvedValue({ id: "customer-1", email: "buyer@example.com" });
    mocks.storage.getProduct.mockResolvedValue({
      id: "product-1", name: "Cold Plunge", price: 2500, affiliateEnabled: true,
      affiliateUseGlobalSettings: true, affiliateDiscountType: null, affiliateDiscountValue: null,
    });
    mocks.storage.createOrder.mockResolvedValue({ id: "order-1" });
    mocks.storage.createOrderItem.mockResolvedValue({ id: "item-1" });
    mocks.stripeClient.checkout.sessions.create.mockResolvedValue({
      id: "cs_test_123", url: "https://checkout.stripe.test/cs_test_123",
    });

    const app = await startApp();
    server = app.server;
    await app.request("/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        items: [{ productId: "product-1", quantity: 1 }],
        customer: {
          email: "buyer@example.com", name: "Buyer Example", phone: "555-555-5555",
          address: "1 Test Way", city: "Raleigh", state: "NC", zipCode: "27601",
        },
      }),
    });

    const sessionInput = mocks.stripeClient.checkout.sessions.create.mock.calls[0][0];
    const sessionSubtotal = sessionInput.line_items.reduce(
      (sum: number, item: any) => sum + item.price_data.unit_amount * item.quantity,
      0,
    );
    expect(mocks.storage.createOrder).toHaveBeenCalledWith(expect.objectContaining({
      subtotalAmount: 2500,
      totalAmount: sessionSubtotal,
    }));
    expect(sessionInput.client_reference_id).toBe("order-1");
    expect(sessionInput.line_items).toEqual([expect.objectContaining({
      price_data: expect.objectContaining({ unit_amount: 2500 }),
      quantity: 1,
    })]);
    expect(sessionInput.metadata).toEqual(expect.objectContaining({
      orderId: "order-1",
      customerId: "customer-1",
      affiliateDiscountAmount: "0",
      paymentFlow: "checkout_session",
    }));
    expect(sessionInput.payment_intent_data.metadata).toEqual(sessionInput.metadata);
  });
});
