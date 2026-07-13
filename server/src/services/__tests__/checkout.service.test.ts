import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CheckoutTaxCalculationError,
  CheckoutUnknownProductError,
  createCheckoutService,
  type CheckoutServiceDependencies,
} from "../checkout.service";

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
  affiliateCode: "SAVE",
  status: "active",
  useCustomRates: false,
  customDiscountType: null,
  customDiscountValue: null,
};

function makeDependencies(): CheckoutServiceDependencies {
  return {
    storage: {
      getProduct: vi.fn().mockResolvedValue(product),
      getAffiliateSettings: vi.fn().mockResolvedValue({
        defaultDiscountType: "PERCENT",
        defaultDiscountValue: 10,
      }),
      getCouponByCode: vi.fn(),
      createOrder: vi.fn().mockResolvedValue({ id: "order-1" }),
      createOrderItem: vi.fn().mockResolvedValue({ id: "order-item-1" }),
      updateOrder: vi.fn().mockResolvedValue({ id: "order-1" }),
    },
    calculateTax: vi.fn().mockResolvedValue({ id: "taxcalc-1", taxAmountExclusive: 800 }),
    createPaymentIntent: vi.fn().mockResolvedValue({ id: "pi-1", clientSecret: "secret-1" }),
    now: vi.fn(() => new Date("2026-07-13T12:00:00Z")),
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  };
}

function paymentIntentCheckoutInput(overrides: Record<string, unknown> = {}) {
  return {
    ...quoteInput(),
    customerId: "customer-1",
    shipping: {
      name: "Taylor Test",
      company: "Plunge Co",
      address: "1 Test Way",
      line2: "Suite 2",
      city: "Raleigh",
      state: "NC",
      zipCode: "27601",
      country: "US",
    },
    billingSameAsShipping: true,
    billing: null,
    affiliateSessionId: null,
    attributionType: "direct",
    customerIp: "203.0.113.4",
    tracking: {
      marketingConsentGranted: true,
      fbp: "fbp-1",
      fbc: "fbc-1",
      eventSourceUrl: "https://example.test/checkout",
      userAgent: "test-agent",
    },
    ...overrides,
  };
}

function quoteInput(overrides: Record<string, unknown> = {}) {
  return {
    items: [{ productId: "product-1", quantity: 1 }],
    affiliate: null,
    isFriendsFamily: false,
    couponCode: undefined,
    taxAddress: {
      line1: "1 Test Way",
      city: "Raleigh",
      state: "NC",
      postalCode: "27601",
      country: "US",
    },
    ...overrides,
  };
}

describe("CheckoutService quote", () => {
  let deps: CheckoutServiceDependencies;

  beforeEach(() => {
    deps = makeDependencies();
  });

  it("resolves stored prices and computes the subtotal", async () => {
    const service = createCheckoutService(deps);
    const quote = await service.quote(quoteInput({ items: [{ productId: "product-1", quantity: 2 }] }));

    expect(quote.subtotalAmount).toBe(20_000);
    expect(quote.orderItems).toEqual([{
      productId: "product-1",
      productName: "Cold Plunge",
      quantity: 2,
      unitPrice: 10_000,
    }]);
  });

  it("applies a percentage affiliate discount", async () => {
    const quote = await createCheckoutService(deps).quote(quoteInput({ affiliate }));

    expect(quote.affiliateDiscountAmount).toBe(1_000);
    expect(quote.totalAmount).toBe(9_800);
  });

  it("applies a fixed affiliate discount per quantity and caps each line", async () => {
    vi.mocked(deps.storage.getProduct).mockResolvedValue({
      ...product,
      price: 500,
      affiliateUseGlobalSettings: false,
      affiliateDiscountType: "FIXED",
      affiliateDiscountValue: 600,
    } as any);
    const quote = await createCheckoutService(deps).quote(quoteInput({
      affiliate,
      items: [{ productId: "product-1", quantity: 2 }],
    }));

    expect(quote.affiliateDiscountAmount).toBe(1_000);
  });

  it("applies a percentage coupon", async () => {
    vi.mocked(deps.storage.getCouponByCode).mockResolvedValue({
      id: "coupon-1", code: "SAVE20", active: true, type: "percentage", value: 20, timesUsed: 0,
    } as any);
    const quote = await createCheckoutService(deps).quote(quoteInput({ couponCode: "save20" }));

    expect(quote.couponDiscountAmount).toBe(2_000);
    expect(quote.validatedCoupon?.code).toBe("SAVE20");
  });

  it("caps a percentage coupon at its maximum discount", async () => {
    vi.mocked(deps.storage.getCouponByCode).mockResolvedValue({
      id: "coupon-1", code: "HALF", active: true, type: "percentage", value: 50,
      maxDiscountAmount: 1_500, timesUsed: 0,
    } as any);
    const quote = await createCheckoutService(deps).quote(quoteInput({ couponCode: "HALF" }));

    expect(quote.couponDiscountAmount).toBe(1_500);
  });

  it("caps a fixed coupon at the subtotal", async () => {
    vi.mocked(deps.storage.getCouponByCode).mockResolvedValue({
      id: "coupon-1", code: "BIG", active: true, type: "fixed", value: 50_000, timesUsed: 0,
    } as any);
    const quote = await createCheckoutService(deps).quote(quoteInput({ couponCode: "BIG" }));

    expect(quote.couponDiscountAmount).toBe(10_000);
    expect(quote.totalAmount).toBe(800);
  });

  it("ignores an expired coupon", async () => {
    vi.mocked(deps.storage.getCouponByCode).mockResolvedValue({
      id: "coupon-1", code: "OLD", active: true, type: "percentage", value: 50,
      endDate: new Date("2026-07-12T12:00:00Z"), timesUsed: 0,
    } as any);
    const quote = await createCheckoutService(deps).quote(quoteInput({ couponCode: "OLD" }));

    expect(quote.couponDiscountAmount).toBe(0);
    expect(quote.validatedCoupon).toBeNull();
  });

  it("sends discounted line amounts to tax and returns tax totals", async () => {
    const quote = await createCheckoutService(deps).quote(quoteInput({ affiliate }));

    expect(deps.calculateTax).toHaveBeenCalledWith({
      currency: "usd",
      lineItems: [{ amount: 9_000, reference: "product-1", taxBehavior: "exclusive", taxCode: "txcd_99999999" }],
      customerAddress: {
        line1: "1 Test Way", city: "Raleigh", state: "NC", postalCode: "27601", country: "US",
      },
    });
    expect(quote.taxAmount).toBe(800);
    expect(quote.taxCalculationId).toBe("taxcalc-1");
  });

  it("raises a typed error when tax calculation fails", async () => {
    vi.mocked(deps.calculateTax).mockRejectedValue(new Error("tax unavailable"));

    await expect(createCheckoutService(deps).quote(quoteInput())).rejects.toBeInstanceOf(CheckoutTaxCalculationError);
  });

  it("raises a typed error for an unknown product", async () => {
    vi.mocked(deps.storage.getProduct).mockResolvedValue(undefined);

    await expect(createCheckoutService(deps).quote(quoteInput())).rejects.toEqual(
      new CheckoutUnknownProductError("product-1"),
    );
    expect(deps.calculateTax).not.toHaveBeenCalled();
  });
});

describe("CheckoutService createPaymentIntentCheckout", () => {
  it("creates and links a pending order from the quoted checkout", async () => {
    const deps = makeDependencies();

    const result = await createCheckoutService(deps).createPaymentIntentCheckout(
      paymentIntentCheckoutInput({
        affiliate,
        affiliateSessionId: "affiliate-session-1",
        attributionType: "coupon",
      }),
    );

    expect(deps.storage.createOrder).toHaveBeenCalledWith(expect.objectContaining({
      customerId: "customer-1",
      status: "pending",
      subtotalAmount: 10_000,
      taxAmount: 800,
      totalAmount: 9_800,
      affiliateCode: "SAVE",
      affiliateIsFriendsFamily: false,
      affiliateDiscountAmount: 1_000,
      customerIp: "203.0.113.4",
      marketingConsentGranted: true,
      metaFbp: "fbp-1",
    }));
    expect(deps.storage.createOrderItem).toHaveBeenCalledWith({
      orderId: "order-1",
      productId: "product-1",
      productName: "Cold Plunge",
      quantity: 1,
      unitPrice: 10_000,
    });
    expect(deps.createPaymentIntent).toHaveBeenCalledWith(expect.objectContaining({
      amount: 9_800,
      metadata: expect.objectContaining({
        orderId: "order-1",
        affiliateCode: "SAVE",
        affiliateSessionId: "affiliate-session-1",
        attributionType: "coupon",
      }),
    }));
    expect(deps.storage.updateOrder).toHaveBeenCalledWith("order-1", {
      stripePaymentIntentId: "pi-1",
    });
    expect(result).toEqual({
      clientSecret: "secret-1",
      orderId: "order-1",
      subtotalAmount: 10_000,
      affiliateDiscountAmount: 1_000,
      couponDiscountAmount: 0,
      taxAmount: 800,
      totalAmount: 9_800,
    });
  });

  it("preserves partial writes when PaymentIntent creation fails", async () => {
    const deps = makeDependencies();
    const paymentError = new Error("payment unavailable");
    vi.mocked(deps.createPaymentIntent).mockRejectedValue(paymentError);

    await expect(
      createCheckoutService(deps).createPaymentIntentCheckout(paymentIntentCheckoutInput()),
    ).rejects.toBe(paymentError);

    expect(deps.storage.createOrder).toHaveBeenCalled();
    expect(deps.storage.createOrderItem).toHaveBeenCalled();
    expect(deps.storage.updateOrder).not.toHaveBeenCalled();
  });

  it("passes a zero-total checkout through to PaymentIntent creation", async () => {
    const deps = makeDependencies();
    vi.mocked(deps.calculateTax).mockResolvedValue({ id: "taxcalc-zero", taxAmountExclusive: 0 });

    const result = await createCheckoutService(deps).createPaymentIntentCheckout(
      paymentIntentCheckoutInput({ items: [] }),
    );

    expect(deps.storage.createOrder).toHaveBeenCalledWith(expect.objectContaining({
      subtotalAmount: 0,
      taxAmount: null,
      totalAmount: 0,
    }));
    expect(deps.storage.createOrderItem).not.toHaveBeenCalled();
    expect(deps.createPaymentIntent).toHaveBeenCalledWith(expect.objectContaining({ amount: 0 }));
    expect(deps.storage.updateOrder).toHaveBeenCalledWith("order-1", {
      stripePaymentIntentId: "pi-1",
    });
    expect(result.totalAmount).toBe(0);
  });
});
