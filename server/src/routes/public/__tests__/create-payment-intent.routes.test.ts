import express from "express";
import { createServer, type Server } from "http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  storage: {
    getAffiliateByCode: vi.fn(),
    getAffiliate: vi.fn(),
    getAffiliateSettings: vi.fn(),
    getCustomer: vi.fn(),
    getCustomerByEmail: vi.fn(),
    createCustomer: vi.fn(),
    updateCustomer: vi.fn(),
    getProduct: vi.fn(),
    getCouponByCode: vi.fn(),
    createOrder: vi.fn(),
    createOrderItem: vi.fn(),
    updateOrder: vi.fn(),
  },
  stripeClient: {
    paymentIntents: {
      create: vi.fn(),
    },
    tax: {
      calculations: {
        create: vi.fn(),
      },
    },
  },
  stripeService: {
    getClient: vi.fn(),
  },
  getCustomerAuthContext: vi.fn(),
}));

vi.mock("../../../../storage", () => ({ storage: mocks.storage }));
vi.mock("../../../integrations/stripe/StripeService", () => ({ stripeService: mocks.stripeService }));
vi.mock("../../../services/order-finalization.service", () => ({
  createOrderFinalizationService: vi.fn(),
}));
vi.mock("../../../integrations/meta/MetaConversionsService", () => ({
  metaConversionsService: { enqueuePurchase: vi.fn() },
}));
vi.mock("../../../middleware/rate-limiter", () => ({
  checkoutLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  paymentLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
vi.mock("../../../auth/customerBetterAuth", () => ({
  getCustomerAuthContext: mocks.getCustomerAuthContext,
}));
vi.mock("../../../../db", () => ({ db: {} }));

const router = (await import("../payments.routes")).default;

const customerInput = {
  email: "buyer@example.com",
  name: "Buyer Example",
  phone: "555-555-5555",
  address: "1 Test Way",
  city: "Raleigh",
  state: "NC",
  zipCode: "27601",
};

const customer = { id: "customer-1", ...customerInput, userId: null };
const product = {
  id: "product-1",
  name: "Cold Plunge",
  price: 10_000,
  affiliateEnabled: true,
  affiliateUseGlobalSettings: true,
  affiliateDiscountType: null,
  affiliateDiscountValue: null,
};
const affiliate = {
  id: "affiliate-1",
  affiliateCode: "SAVE10",
  customerId: "affiliate-customer-1",
  status: "active",
  useCustomRates: false,
  customDiscountType: null,
  customDiscountValue: null,
  ffEnabled: true,
};

let server: Server | undefined;

async function startApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    const match = req.headers.cookie?.match(/(?:^|;\s*)affiliate=([^;]+)/);
    req.cookies = match ? { affiliate: decodeURIComponent(match[1]) } : {};
    next();
  });
  app.use("/api", router);

  const nextServer = createServer(app);
  await new Promise<void>((resolve) => nextServer.listen(0, resolve));
  const address = nextServer.address();
  if (!address || typeof address === "string") throw new Error("Failed to listen");
  server = nextServer;

  return (body: unknown, headers: Record<string, string> = {}) =>
    fetch(`http://127.0.0.1:${address.port}/api/create-payment-intent`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
}

function requestBody(overrides: Record<string, unknown> = {}) {
  return {
    items: [{ productId: product.id, quantity: 1 }],
    customer: customerInput,
    ...overrides,
  };
}

function activeCoupon(overrides: Record<string, unknown> = {}) {
  return {
    id: "coupon-1",
    code: "SAVE20",
    active: true,
    type: "percentage",
    value: 20,
    timesUsed: 0,
    ...overrides,
  };
}

describe("POST /create-payment-intent", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.stripeService.getClient.mockResolvedValue(mocks.stripeClient);
    mocks.getCustomerAuthContext.mockResolvedValue(null);
    mocks.storage.getAffiliateByCode.mockResolvedValue(undefined);
    mocks.storage.getAffiliate.mockResolvedValue(undefined);
    mocks.storage.getAffiliateSettings.mockResolvedValue({
      defaultDiscountType: "PERCENT",
      defaultDiscountValue: 10,
      commissionRate: 10,
      ffEnabled: false,
    });
    mocks.storage.getCustomerByEmail.mockResolvedValue(undefined);
    mocks.storage.createCustomer.mockResolvedValue(customer);
    mocks.storage.updateCustomer.mockImplementation(async (_id, value) => ({ ...customer, ...value }));
    mocks.storage.getProduct.mockResolvedValue(product);
    mocks.storage.getCouponByCode.mockResolvedValue(undefined);
    mocks.storage.createOrder.mockImplementation(async (value) => ({ id: "order-1", ...value }));
    mocks.storage.createOrderItem.mockResolvedValue({ id: "item-1", orderId: "order-1" });
    mocks.storage.updateOrder.mockResolvedValue(undefined);
    mocks.stripeClient.tax.calculations.create.mockResolvedValue({
      id: "taxcalc-1",
      tax_amount_exclusive: 800,
    });
    mocks.stripeClient.paymentIntents.create.mockResolvedValue({
      id: "pi_1",
      client_secret: "pi_1_secret_test",
    });
  });

  afterEach(async () => {
    if (!server) return;
    await new Promise<void>((resolve, reject) => {
      server!.close((error) => (error ? reject(error) : resolve()));
    });
    server = undefined;
  });

  it("creates a pending guest order and links its priced total to Stripe", async () => {
    const request = await startApp();
    const response = await request(requestBody());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      clientSecret: "pi_1_secret_test",
      orderId: "order-1",
      subtotal: 10_000,
      affiliateDiscount: 0,
      couponDiscount: 0,
      taxAmount: 800,
      total: 10_800,
    });
    expect(mocks.storage.createOrder).toHaveBeenCalledWith(expect.objectContaining({
      customerId: "customer-1",
      status: "pending",
      subtotalAmount: 10_000,
      affiliateDiscountAmount: null,
      couponDiscountAmount: null,
      taxAmount: 800,
      totalAmount: 10_800,
      stripeTaxCalculationId: "taxcalc-1",
    }));
    expect(mocks.storage.createOrderItem).toHaveBeenCalledWith(expect.objectContaining({
      orderId: "order-1",
      productId: "product-1",
      quantity: 1,
      unitPrice: 10_000,
    }));
    expect(mocks.stripeClient.paymentIntents.create).toHaveBeenCalledWith(expect.objectContaining({
      amount: 10_800,
      currency: "usd",
      metadata: expect.objectContaining({ orderId: "order-1", customerId: "customer-1" }),
    }));
    expect(mocks.storage.updateOrder).toHaveBeenCalledWith("order-1", {
      stripePaymentIntentId: "pi_1",
    });
  });

  it("returns exact field errors for invalid customer values", async () => {
    const request = await startApp();
    const response = await request(requestBody({
      customer: { ...customerInput, email: "bad", phone: "x", address: "", state: "nope", zipCode: "2" },
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ errors: [
      { field: "email", code: "invalid_format", message: "Please enter a valid email address" },
      { field: "phone", code: "invalid_format", message: "Please enter a valid phone number" },
      { field: "line1", code: "required", message: "Street address is required (min 3 characters)" },
      { field: "state", code: "invalid", message: "Please select a valid US state" },
      { field: "postalCode", code: "invalid_format", message: "Valid ZIP code required (e.g. 12345)" },
    ] });
    expect(mocks.storage.createOrder).not.toHaveBeenCalled();
  });

  it("preserves customer validation precedence when the cart is also invalid", async () => {
    const request = await startApp();
    const response = await request(requestBody({
      items: [],
      customer: { ...customerInput, email: "bad", phone: "x", address: "", state: "nope", zipCode: "2" },
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ errors: [
      { field: "email", code: "invalid_format", message: "Please enter a valid email address" },
      { field: "phone", code: "invalid_format", message: "Please enter a valid phone number" },
      { field: "line1", code: "required", message: "Street address is required (min 3 characters)" },
      { field: "state", code: "invalid", message: "Please select a valid US state" },
      { field: "postalCode", code: "invalid_format", message: "Valid ZIP code required (e.g. 12345)" },
    ] });
    expect(mocks.stripeService.getClient).not.toHaveBeenCalled();
    expect(mocks.storage.createCustomer).not.toHaveBeenCalled();
    expect(mocks.storage.updateCustomer).not.toHaveBeenCalled();
  });

  it("rejects a malformed item container at the route boundary", async () => {
    const request = await startApp();
    const response = await request(requestBody({ items: {} }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: "Cart is empty" });
    expect(mocks.stripeService.getClient).not.toHaveBeenCalled();
    expect(mocks.storage.createCustomer).not.toHaveBeenCalled();
    expect(mocks.storage.updateCustomer).not.toHaveBeenCalled();
    expect(mocks.stripeClient.tax.calculations.create).not.toHaveBeenCalled();
    expect(mocks.storage.createOrder).not.toHaveBeenCalled();
    expect(mocks.stripeClient.paymentIntents.create).not.toHaveBeenCalled();
  });

  it("returns the exact response when Stripe is unconfigured", async () => {
    mocks.stripeService.getClient.mockResolvedValue(null);
    const request = await startApp();
    const response = await request(requestBody());

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: "Stripe is not configured" });
    expect(mocks.storage.createCustomer).not.toHaveBeenCalled();
  });

  it("persists cookie affiliate attribution and its session metadata", async () => {
    mocks.storage.getAffiliate.mockResolvedValue(affiliate);
    mocks.storage.getCustomer.mockResolvedValue({ id: affiliate.customerId, email: "owner@example.com" });
    const cookie = Buffer.from(JSON.stringify({
      affiliateId: affiliate.id,
      sessionId: "affiliate-session-1",
      expiresAt: Date.now() + 60_000,
    })).toString("base64");
    const request = await startApp();
    const response = await request(requestBody(), { cookie: `affiliate=${encodeURIComponent(cookie)}` });

    expect(response.status).toBe(200);
    expect(mocks.storage.createOrder).toHaveBeenCalledWith(expect.objectContaining({
      affiliateCode: "SAVE10",
      affiliateDiscountAmount: 1_000,
      totalAmount: 9_800,
    }));
    expect(mocks.stripeClient.paymentIntents.create).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        affiliateSessionId: "affiliate-session-1",
        attributionType: "cookie",
      }),
    }));
  });

  it("applies an explicit affiliate code to pricing and persistence", async () => {
    mocks.storage.getAffiliateByCode.mockResolvedValue(affiliate);
    mocks.storage.getCustomer.mockResolvedValue({ id: affiliate.customerId, email: "owner@example.com" });
    const request = await startApp();
    const response = await request(requestBody({ affiliateCode: "save10" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expect.objectContaining({
      affiliateDiscount: 1_000,
      taxAmount: 800,
      total: 9_800,
    }));
    expect(mocks.storage.createOrder).toHaveBeenCalledWith(expect.objectContaining({
      affiliateCode: "SAVE10",
      affiliateIsFriendsFamily: false,
      affiliateDiscountAmount: 1_000,
      totalAmount: 9_800,
    }));
    expect(mocks.stripeClient.tax.calculations.create).toHaveBeenCalledWith(expect.objectContaining({
      line_items: [expect.objectContaining({ amount: 9_000, reference: "product-1" })],
    }));
  });

  it("applies the enabled friends-and-family discount path", async () => {
    mocks.storage.getAffiliateByCode
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(affiliate);
    mocks.storage.getAffiliateSettings.mockResolvedValue({
      defaultDiscountType: "PERCENT",
      defaultDiscountValue: 10,
      ffEnabled: true,
      ffDiscountType: "PERCENT",
      ffDiscountValue: 25,
      ffMaxUses: 0,
    });
    mocks.storage.getCustomer.mockResolvedValue({ id: affiliate.customerId, email: "owner@example.com" });
    const request = await startApp();
    const response = await request(requestBody({ affiliateCode: "FFSAVE10" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expect.objectContaining({ affiliateDiscount: 2_500, total: 8_300 }));
    expect(mocks.storage.createOrder).toHaveBeenCalledWith(expect.objectContaining({
      affiliateCode: "SAVE10",
      affiliateIsFriendsFamily: true,
      affiliateDiscountAmount: 2_500,
    }));
  });

  it("neutralizes self-referral pricing and persisted attribution", async () => {
    mocks.storage.getAffiliateByCode.mockResolvedValue(affiliate);
    mocks.storage.getCustomer.mockResolvedValue({ id: affiliate.customerId, email: "BUYER@EXAMPLE.COM" });
    const request = await startApp();
    const response = await request(requestBody({ affiliateCode: "SAVE10" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expect.objectContaining({ affiliateDiscount: 0, total: 10_800 }));
    expect(mocks.storage.createOrder).toHaveBeenCalledWith(expect.objectContaining({
      affiliateCode: undefined,
      affiliateDiscountAmount: null,
    }));
  });

  it("applies a valid percentage coupon", async () => {
    mocks.storage.getProduct.mockResolvedValue({ ...product, price: 9_999 });
    mocks.storage.getCouponByCode.mockResolvedValue(activeCoupon({ value: 15 }));
    const request = await startApp();
    const response = await request(requestBody({ couponCode: "save20" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expect.objectContaining({
      subtotal: 9_999,
      couponDiscount: 1_500,
      total: 9_299,
    }));
    expect(mocks.storage.getCouponByCode).toHaveBeenCalledWith("SAVE20");
    expect(mocks.storage.createOrder).toHaveBeenCalledWith(expect.objectContaining({
      couponCode: "SAVE20",
      couponDiscountAmount: 1_500,
      totalAmount: 9_299,
    }));
    expect(mocks.stripeClient.tax.calculations.create).toHaveBeenCalledWith(expect.objectContaining({
      line_items: [expect.objectContaining({ amount: 8_499, reference: "product-1" })],
    }));
    expect(mocks.stripeClient.paymentIntents.create).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({ couponDiscountAmount: "1500" }),
    }));
  });

  it("caps a fixed coupon at the subtotal", async () => {
    mocks.storage.getCouponByCode.mockResolvedValue(activeCoupon({
      id: "coupon-fixed",
      code: "FIXED",
      type: "fixed",
      value: 12_000,
    }));
    mocks.stripeClient.tax.calculations.create.mockResolvedValue({ id: "taxcalc-zero", tax_amount_exclusive: 0 });
    const request = await startApp();
    const response = await request(requestBody({ couponCode: "fixed" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expect.objectContaining({ couponDiscount: 10_000, total: 0 }));
    expect(mocks.storage.createOrder).toHaveBeenCalledWith(expect.objectContaining({
      couponCode: "FIXED",
      couponDiscountAmount: 10_000,
      totalAmount: 0,
    }));
    expect(mocks.stripeClient.tax.calculations.create).toHaveBeenCalledWith(expect.objectContaining({
      line_items: [expect.objectContaining({ amount: 0, reference: "product-1" })],
    }));
  });

  it("ignores an expired coupon", async () => {
    mocks.storage.getCouponByCode.mockResolvedValue(activeCoupon({
      endDate: new Date("2000-01-01T00:00:00.000Z"),
    }));
    const request = await startApp();
    const response = await request(requestBody({ couponCode: "SAVE20" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expect.objectContaining({ couponDiscount: 0, total: 10_800 }));
    expect(mocks.storage.createOrder).toHaveBeenCalledWith(expect.objectContaining({
      couponCode: null,
      couponDiscountAmount: null,
    }));
  });

  it("includes successful Stripe Tax output in persisted and Stripe totals", async () => {
    mocks.stripeClient.tax.calculations.create.mockResolvedValue({ id: "taxcalc-2", tax_amount_exclusive: 725 });
    const request = await startApp();
    const response = await request(requestBody());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expect.objectContaining({ taxAmount: 725, total: 10_725 }));
    expect(mocks.stripeClient.tax.calculations.create).toHaveBeenCalledWith(expect.objectContaining({
      currency: "usd",
      line_items: [expect.objectContaining({ amount: 10_000, reference: "product-1" })],
    }));
    expect(mocks.stripeClient.paymentIntents.create).toHaveBeenCalledWith(expect.objectContaining({ amount: 10_725 }));
  });

  it("returns the exact 422 contract when Stripe Tax fails", async () => {
    mocks.stripeClient.tax.calculations.create.mockRejectedValue(new Error("tax unavailable"));
    const request = await startApp();
    const response = await request(requestBody());

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      message: "Unable to calculate tax. Please verify your shipping state and ZIP code.",
      field: "address",
    });
    expect(mocks.storage.createOrder).not.toHaveBeenCalled();
    expect(mocks.stripeClient.paymentIntents.create).not.toHaveBeenCalled();
  });

  it("rejects an empty cart before persisting or creating a PaymentIntent", async () => {
    const request = await startApp();
    const response = await request(requestBody({ items: [] }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: "Cart is empty" });
    expect(mocks.stripeService.getClient).not.toHaveBeenCalled();
    expect(mocks.storage.createCustomer).not.toHaveBeenCalled();
    expect(mocks.storage.updateCustomer).not.toHaveBeenCalled();
    expect(mocks.stripeClient.tax.calculations.create).not.toHaveBeenCalled();
    expect(mocks.storage.createOrder).not.toHaveBeenCalled();
    expect(mocks.stripeClient.paymentIntents.create).not.toHaveBeenCalled();
  });

  it("rejects a zero item quantity before persisting or creating a PaymentIntent", async () => {
    const request = await startApp();
    const response = await request(requestBody({ items: [{ productId: product.id, quantity: 0 }] }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: "Invalid item quantity" });
    expect(mocks.stripeService.getClient).not.toHaveBeenCalled();
    expect(mocks.storage.createCustomer).not.toHaveBeenCalled();
    expect(mocks.storage.updateCustomer).not.toHaveBeenCalled();
    expect(mocks.stripeClient.tax.calculations.create).not.toHaveBeenCalled();
    expect(mocks.storage.createOrder).not.toHaveBeenCalled();
    expect(mocks.stripeClient.paymentIntents.create).not.toHaveBeenCalled();
  });

  it.each([
    { name: "missing items", items: undefined, message: "Cart is empty" },
    { name: "empty string", items: "", message: "Cart is empty" },
    { name: "null", items: null, message: "Cart is empty" },
    { name: "plain object", items: {}, message: "Cart is empty" },
    { name: "element without quantity", items: [{}], message: "Invalid item quantity" },
    {
      name: "string quantity",
      items: [{ productId: product.id, quantity: "2" }],
      message: "Invalid item quantity",
    },
  ])("rejects $name before any external access", async ({ items, message }) => {
    const request = await startApp();
    const response = await request(requestBody({ items }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message });
    expect(mocks.stripeService.getClient).not.toHaveBeenCalled();
    expect(mocks.storage.createCustomer).not.toHaveBeenCalled();
    expect(mocks.storage.updateCustomer).not.toHaveBeenCalled();
    expect(mocks.stripeClient.tax.calculations.create).not.toHaveBeenCalled();
    expect(mocks.storage.createOrder).not.toHaveBeenCalled();
    expect(mocks.stripeClient.paymentIntents.create).not.toHaveBeenCalled();
  });

  it("assigns an authenticated checkout to the session customer without creating a duplicate", async () => {
    const sessionCustomer = { ...customer, id: "session-customer-1", isDisabled: false };
    const checkoutEmailCustomer = { ...customer, id: "checkout-email-customer-1" };
    mocks.getCustomerAuthContext.mockResolvedValue({ customer: sessionCustomer });
    mocks.storage.getCustomerByEmail.mockResolvedValue(checkoutEmailCustomer);
    mocks.storage.updateCustomer.mockResolvedValue(checkoutEmailCustomer);
    mocks.storage.getCustomer.mockResolvedValue(sessionCustomer);
    const request = await startApp();
    const response = await request(requestBody());

    expect(response.status).toBe(200);
    expect(mocks.storage.createCustomer).not.toHaveBeenCalled();
    expect(mocks.storage.getCustomer).toHaveBeenCalledWith("session-customer-1");
    expect(mocks.storage.createOrder).toHaveBeenCalledWith(expect.objectContaining({
      customerId: "session-customer-1",
    }));
    expect(mocks.stripeClient.paymentIntents.create).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({ customerId: "session-customer-1" }),
    }));
  });
});
