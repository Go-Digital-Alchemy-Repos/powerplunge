import type { Affiliate, AffiliateSettings, Coupon, Product } from "@shared/schema";
import type { IStorage } from "../../storage";

const DEFAULT_STRIPE_TAX_CODE = "txcd_99999999";
const TAXABLE_STATES_WARN_ON_ZERO = ["NC"];

export interface CheckoutOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface CheckoutTaxAddress {
  line1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface CheckoutTaxCalculationInput {
  currency: "usd";
  lineItems: Array<{
    amount: number;
    reference: string;
    taxBehavior: "exclusive";
    taxCode: string;
  }>;
  customerAddress: CheckoutTaxAddress;
}

export interface CheckoutTaxCalculationResult {
  id: string | null;
  taxAmountExclusive: number;
}

export interface CheckoutQuoteInput {
  items: Array<{ productId: string; quantity: number }>;
  affiliate: Affiliate | null | undefined;
  isFriendsFamily: boolean;
  couponCode?: string;
  taxAddress: CheckoutTaxAddress;
}

export interface CheckoutQuoteResult {
  orderItems: CheckoutOrderItem[];
  resolvedProducts: Product[];
  subtotalAmount: number;
  affiliateDiscountAmount: number;
  couponDiscountAmount: number;
  discountedSubtotal: number;
  taxAmount: number;
  taxCalculationId: string | null;
  totalAmount: number;
  validatedCoupon: Coupon | null;
}

export interface CreatePaymentIntentCheckoutInput extends CheckoutQuoteInput {
  customerId: string;
  shipping: {
    name: string;
    company: string | null;
    address: string;
    line2: string | null;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  billingSameAsShipping: boolean;
  billing: {
    name: string;
    company: string | null;
    address: string;
    line2: string | null;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  } | null;
  affiliateSessionId: string | null;
  attributionType: "coupon" | "cookie" | "direct";
  customerIp: string | null;
  tracking: {
    marketingConsentGranted: boolean;
    fbp: string | null;
    fbc: string | null;
    eventSourceUrl: string | null;
    userAgent: string | null;
  };
}

export interface CreatePaymentIntentInput {
  amount: number;
  currency: "usd";
  automaticPaymentMethods: { enabled: true };
  metadata: Record<string, string>;
}

export interface CreatePaymentIntentResult {
  id: string;
  clientSecret: string | null;
}

export interface CreatePaymentIntentCheckoutResult {
  clientSecret: string | null;
  orderId: string;
  subtotalAmount: number;
  affiliateDiscountAmount: number;
  couponDiscountAmount: number;
  taxAmount: number;
  totalAmount: number;
}

export interface CreateCheckoutSessionInput {
  items: Array<{ productId: string; quantity: number }>;
  customerId: string;
  customerEmail: string;
  affiliate: Affiliate | null | undefined;
  isFriendsFamily: boolean;
  affiliateSessionId: string | null;
  attributionType: "coupon" | "cookie" | "direct";
  baseUrl: string;
}

export interface CheckoutSessionCreateInput {
  lineItems: Array<{
    productName: string;
    unitAmount: number;
    quantity: number;
  }>;
  successUrl: string;
  cancelUrl: string;
  customerEmail: string;
  clientReferenceId: string;
  automaticTax: { enabled: true };
  allowedShippingCountries: ["US"];
  metadata: Record<string, string>;
  paymentIntentMetadata: Record<string, string>;
}

export interface CheckoutSessionCreateResult {
  id: string;
  url: string | null;
}

export type CreateCheckoutSessionResult =
  | {
    status: "session_created";
    orderId: string;
    sessionId: string;
    checkoutUrl: string | null;
  }
  | {
    status: "manual_fallback";
    orderId: string;
    message: "Order created - Stripe not configured for payment processing";
  };

export interface CheckoutServiceDependencies {
  storage: Pick<IStorage,
    | "getProduct"
    | "getAffiliateSettings"
    | "getCouponByCode"
    | "createOrder"
    | "createOrderItem"
    | "updateOrder"
    | "getAffiliateReferralByOrderId"
    | "createAffiliateReferral"
    | "updateAffiliate"
  >;
  calculateTax: (input: CheckoutTaxCalculationInput) => Promise<CheckoutTaxCalculationResult>;
  createPaymentIntent: (input: CreatePaymentIntentInput) => Promise<CreatePaymentIntentResult>;
  getCheckoutSessionCreator: () => Promise<
    ((input: CheckoutSessionCreateInput) => Promise<CheckoutSessionCreateResult>) | null
  >;
  sendOrderNotification: (orderId: string) => Promise<void>;
  now: () => Date;
  log: Pick<Console, "info" | "warn" | "error">;
}

export class CheckoutUnknownProductError extends Error {
  constructor(public readonly productId: string) {
    super(`Product ${productId} not found`);
    this.name = "CheckoutUnknownProductError";
  }
}

export class CheckoutTaxCalculationError extends Error {
  constructor(public readonly cause: unknown) {
    super("Unable to calculate tax. Please verify your shipping state and ZIP code.");
    this.name = "CheckoutTaxCalculationError";
  }
}

export class CheckoutZeroPayableError extends Error {
  constructor() {
    super("Checkout total must be greater than zero");
    this.name = "CheckoutZeroPayableError";
  }
}

type DiscountedCheckoutOrderItem = CheckoutOrderItem & { discountAmount?: number };

function allocateDiscountAcrossUnits(unitPrices: number[], discountAmount: number): number[] {
  const subtotal = unitPrices.reduce((sum, unitPrice) => sum + unitPrice, 0);
  const cappedDiscount = Math.min(Math.max(0, discountAmount), subtotal);
  const allocations = unitPrices.map((unitPrice, index) => {
    const exactShare = subtotal > 0 ? (cappedDiscount * unitPrice) / subtotal : 0;
    const floorShare = Math.floor(exactShare);
    return { index, floorShare, remainder: exactShare - floorShare, unitPrice };
  });

  let remaining = cappedDiscount - allocations.reduce((sum, allocation) => sum + allocation.floorShare, 0);
  for (const allocation of [...allocations].sort((a, b) => {
    if (b.remainder !== a.remainder) return b.remainder - a.remainder;
    if (b.unitPrice !== a.unitPrice) return b.unitPrice - a.unitPrice;
    return a.index - b.index;
  })) {
    if (remaining <= 0) break;
    allocation.floorShare += 1;
    remaining -= 1;
  }

  return allocations.map((allocation) => allocation.floorShare);
}

function buildCheckoutSessionLineItems(orderItems: DiscountedCheckoutOrderItem[]) {
  const units = orderItems.flatMap((item) => {
    const unitPrices = Array.from({ length: item.quantity }, () => item.unitPrice);
    const unitDiscounts = allocateDiscountAcrossUnits(unitPrices, item.discountAmount ?? 0);
    return unitPrices.map((unitPrice, index) => ({
      productName: item.productName,
      unitAmount: Math.max(0, unitPrice - (unitDiscounts[index] ?? 0)),
    }));
  });

  const grouped = new Map<string, { productName: string; unitAmount: number; quantity: number }>();
  for (const unit of units) {
    if (unit.unitAmount === 0) continue;
    const key = `${unit.productName}\0${unit.unitAmount}`;
    const existing = grouped.get(key);
    if (existing) existing.quantity += 1;
    else grouped.set(key, { ...unit, quantity: 1 });
  }
  return [...grouped.values()];
}

function computeAffiliateDiscount(
  product: Product,
  lineTotal: number,
  settings: AffiliateSettings | undefined,
  isFriendsFamily: boolean,
  affiliate: Affiliate,
  quantity: number,
): number {
  if (!product.affiliateEnabled) return 0;

  let discountType: string;
  let discountValue: number;
  const hasCustomDiscount = affiliate.useCustomRates && affiliate.customDiscountType && affiliate.customDiscountValue != null;

  if (isFriendsFamily && settings?.ffEnabled) {
    discountType = settings.ffDiscountType || "PERCENT";
    discountValue = settings.ffDiscountValue ?? 20;
  } else if (hasCustomDiscount) {
    discountType = affiliate.customDiscountType!;
    discountValue = affiliate.customDiscountValue!;
  } else if (product.affiliateUseGlobalSettings || !product.affiliateDiscountType) {
    discountType = settings?.defaultDiscountType || "PERCENT";
    discountValue = settings?.defaultDiscountValue ?? settings?.customerDiscountPercent ?? 0;
  } else {
    discountType = product.affiliateDiscountType;
    discountValue = product.affiliateDiscountValue ?? 0;
  }

  if (discountValue <= 0) return 0;
  if (discountType === "PERCENT") {
    return Math.floor(lineTotal * (discountValue / 100));
  }
  return Math.min(lineTotal, discountValue * quantity);
}

export class CheckoutService {
  constructor(private readonly deps: CheckoutServiceDependencies) {}

  private async resolveItems(items: Array<{ productId: string; quantity: number }>) {
    let subtotalAmount = 0;
    const orderItems: CheckoutOrderItem[] = [];
    const resolvedProducts: Product[] = [];

    for (const item of items) {
      const product = await this.deps.storage.getProduct(item.productId);
      if (!product) throw new CheckoutUnknownProductError(item.productId);
      subtotalAmount += product.price * item.quantity;
      orderItems.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: product.price,
      });
      resolvedProducts.push(product);
    }

    return { subtotalAmount, orderItems, resolvedProducts };
  }

  private applyAffiliatePricing(
    orderItems: CheckoutOrderItem[],
    resolvedProducts: Product[],
    affiliate: Affiliate | null | undefined,
    isFriendsFamily: boolean,
    settings: AffiliateSettings | undefined,
  ) {
    let affiliateDiscountAmount = 0;
    const discountedOrderItems: DiscountedCheckoutOrderItem[] = orderItems.map((item, index) => {
      if (affiliate?.status !== "active") return { ...item };
      const lineTotal = item.unitPrice * item.quantity;
      const discountAmount = computeAffiliateDiscount(
        resolvedProducts[index], lineTotal, settings, isFriendsFamily, affiliate, item.quantity,
      );
      affiliateDiscountAmount += discountAmount;
      return { ...item, discountAmount };
    });
    return { affiliateDiscountAmount, discountedOrderItems };
  }

  async quote(input: CheckoutQuoteInput): Promise<CheckoutQuoteResult> {
    const { subtotalAmount, orderItems, resolvedProducts } = await this.resolveItems(input.items);

    let affiliateSettings: AffiliateSettings | undefined;
    if (input.affiliate?.status === "active") {
      affiliateSettings = await this.deps.storage.getAffiliateSettings();
    }
    const { affiliateDiscountAmount } = this.applyAffiliatePricing(
      orderItems, resolvedProducts, input.affiliate, input.isFriendsFamily, affiliateSettings,
    );

    let couponDiscountAmount = 0;
    let validatedCoupon: Coupon | null = null;
    if (input.couponCode) {
      const coupon = await this.deps.storage.getCouponByCode(input.couponCode.toUpperCase());
      if (coupon?.active) {
        const now = this.deps.now();
        const notExpired = !coupon.endDate || new Date(coupon.endDate) >= now;
        const started = !coupon.startDate || new Date(coupon.startDate) <= now;
        const hasUses = !coupon.maxRedemptions || coupon.timesUsed < coupon.maxRedemptions;
        const meetsMin = !coupon.minOrderAmount || subtotalAmount >= coupon.minOrderAmount;

        if (notExpired && started && hasUses && meetsMin) {
          validatedCoupon = coupon;
          if (coupon.type === "percentage") {
            couponDiscountAmount = Math.round(subtotalAmount * (coupon.value / 100));
            if (coupon.maxDiscountAmount) {
              couponDiscountAmount = Math.min(couponDiscountAmount, coupon.maxDiscountAmount);
            }
          } else if (coupon.type === "fixed") {
            couponDiscountAmount = Math.min(coupon.value, subtotalAmount);
          }
          if (coupon.blockAffiliateCommission && input.affiliate) {
            this.deps.log.info(`[COUPON] Coupon ${coupon.code} blocks affiliate commission for ${input.affiliate.affiliateCode}`);
          }
        }
      }
    }

    const discountedSubtotal = Math.max(0, subtotalAmount - affiliateDiscountAmount - couponDiscountAmount);
    let taxCalculation: CheckoutTaxCalculationResult;
    const postalCode = input.taxAddress.postalCode.split("-")[0];

    try {
      taxCalculation = await this.deps.calculateTax({
        currency: "usd",
        lineItems: orderItems.map((item) => {
          const itemTotal = item.unitPrice * item.quantity;
          return {
            amount: subtotalAmount > 0 ? Math.floor(discountedSubtotal * (itemTotal / subtotalAmount)) : 0,
            reference: item.productId,
            taxBehavior: "exclusive" as const,
            taxCode: DEFAULT_STRIPE_TAX_CODE,
          };
        }),
        customerAddress: { ...input.taxAddress, postalCode },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : error;
      this.deps.log.error(`[TAX] Calculation failed | state=${input.taxAddress.state} zip=${input.taxAddress.postalCode}:`, message);
      throw new CheckoutTaxCalculationError(error);
    }

    const taxAmount = taxCalculation.taxAmountExclusive;
    const taxCalculationId = taxCalculation.id;
    this.deps.log.info(`[TAX] Calculated: $${(taxAmount / 100).toFixed(2)} | state=${input.taxAddress.state} zip=${postalCode} calcId=${taxCalculationId}`);
    if (taxAmount === 0 && TAXABLE_STATES_WARN_ON_ZERO.includes(input.taxAddress.state)) {
      this.deps.log.warn(`[TAX][WARN] Zero tax returned for taxable state ${input.taxAddress.state} (zip=${input.taxAddress.postalCode}, calcId=${taxCalculationId}). Verify Stripe Tax registration.`);
    }

    return {
      orderItems,
      resolvedProducts,
      subtotalAmount,
      affiliateDiscountAmount,
      couponDiscountAmount,
      discountedSubtotal,
      taxAmount,
      taxCalculationId,
      totalAmount: discountedSubtotal + taxAmount,
      validatedCoupon,
    };
  }

  async createPaymentIntentCheckout(
    input: CreatePaymentIntentCheckoutInput,
  ): Promise<CreatePaymentIntentCheckoutResult> {
    const quote = await this.quote(input);
    const order = await this.deps.storage.createOrder({
      customerId: input.customerId,
      status: "pending",
      totalAmount: quote.totalAmount,
      subtotalAmount: quote.subtotalAmount,
      taxAmount: quote.taxAmount > 0 ? quote.taxAmount : null,
      stripeTaxCalculationId: quote.taxCalculationId,
      affiliateCode: input.affiliate?.affiliateCode,
      affiliateIsFriendsFamily: input.isFriendsFamily,
      affiliateDiscountAmount: quote.affiliateDiscountAmount > 0 ? quote.affiliateDiscountAmount : null,
      couponDiscountAmount: quote.couponDiscountAmount > 0 ? quote.couponDiscountAmount : null,
      couponCode: quote.validatedCoupon?.code || null,
      shippingName: input.shipping.name,
      shippingCompany: input.shipping.company,
      shippingAddress: input.shipping.address,
      shippingLine2: input.shipping.line2,
      shippingCity: input.shipping.city,
      shippingState: input.shipping.state,
      shippingZip: input.shipping.zipCode,
      shippingCountry: input.shipping.country,
      billingSameAsShipping: input.billingSameAsShipping,
      billingName: input.billing?.name || null,
      billingCompany: input.billing?.company || null,
      billingAddress: input.billing?.address || null,
      billingLine2: input.billing?.line2 || null,
      billingCity: input.billing?.city || null,
      billingState: input.billing?.state || null,
      billingZip: input.billing?.zipCode || null,
      billingCountry: input.billing?.country || null,
      customerIp: input.customerIp,
      marketingConsentGranted: input.tracking.marketingConsentGranted,
      metaFbp: input.tracking.fbp,
      metaFbc: input.tracking.fbc,
      metaEventSourceUrl: input.tracking.eventSourceUrl,
      customerUserAgent: input.tracking.userAgent,
    });

    for (const item of quote.orderItems) {
      await this.deps.storage.createOrderItem({ orderId: order.id, ...item });
    }

    const paymentIntent = await this.deps.createPaymentIntent({
      amount: quote.totalAmount,
      currency: "usd",
      automaticPaymentMethods: { enabled: true },
      metadata: {
        orderId: order.id,
        customerId: input.customerId,
        affiliateCode: input.affiliate?.affiliateCode || "",
        affiliateId: input.affiliate?.id || "",
        affiliateSessionId: input.affiliateSessionId || "",
        attributionType: input.attributionType,
        isFriendsFamily: input.isFriendsFamily ? "true" : "false",
        taxAmount: quote.taxAmount.toString(),
        taxCalculationId: quote.taxCalculationId || "",
        affiliateDiscountAmount: quote.affiliateDiscountAmount.toString(),
        couponCode: quote.validatedCoupon?.code || "",
        couponId: quote.validatedCoupon?.id || "",
        couponDiscountAmount: quote.couponDiscountAmount.toString(),
      },
    });

    await this.deps.storage.updateOrder(order.id, {
      stripePaymentIntentId: paymentIntent.id,
    });

    return {
      clientSecret: paymentIntent.clientSecret,
      orderId: order.id,
      subtotalAmount: quote.subtotalAmount,
      affiliateDiscountAmount: quote.affiliateDiscountAmount,
      couponDiscountAmount: quote.couponDiscountAmount,
      taxAmount: quote.taxAmount,
      totalAmount: quote.totalAmount,
    };
  }

  async createCheckoutSession(input: CreateCheckoutSessionInput): Promise<CreateCheckoutSessionResult> {
    const { subtotalAmount, orderItems, resolvedProducts } = await this.resolveItems(input.items);
    const affiliateSettings = await this.deps.storage.getAffiliateSettings();
    const { affiliateDiscountAmount, discountedOrderItems } = this.applyAffiliatePricing(
      orderItems, resolvedProducts, input.affiliate, input.isFriendsFamily, affiliateSettings,
    );
    const totalAmount = Math.max(0, subtotalAmount - affiliateDiscountAmount);
    const lineItems = buildCheckoutSessionLineItems(discountedOrderItems);
    if (lineItems.length === 0) throw new CheckoutZeroPayableError();

    const createSession = await this.deps.getCheckoutSessionCreator();
    if (!createSession) {
      const order = await this.deps.storage.createOrder({
        customerId: input.customerId,
        status: "pending",
        subtotalAmount,
        totalAmount,
        notes: "Stripe not configured - manual payment required",
        affiliateCode: input.affiliate?.affiliateCode,
        affiliateIsFriendsFamily: input.isFriendsFamily,
        affiliateDiscountAmount: affiliateDiscountAmount > 0 ? affiliateDiscountAmount : null,
      });

      for (const item of orderItems) {
        await this.deps.storage.createOrderItem({ orderId: order.id, ...item });
      }

      if (input.affiliate?.status === "active") {
        const existingReferral = await this.deps.storage.getAffiliateReferralByOrderId(order.id);
        if (!existingReferral) {
          const commissionRate = affiliateSettings?.commissionRate || 10;
          const commissionAmount = Math.round(subtotalAmount * (commissionRate / 100));
          await this.deps.storage.createAffiliateReferral({
            affiliateId: input.affiliate.id,
            orderId: order.id,
            orderAmount: subtotalAmount,
            commissionAmount,
            commissionRate,
            status: "pending",
          });
          await this.deps.storage.updateAffiliate(input.affiliate.id, {
            totalReferrals: input.affiliate.totalReferrals + 1,
            pendingBalance: input.affiliate.pendingBalance + commissionAmount,
            totalEarnings: input.affiliate.totalEarnings + commissionAmount,
          });
        }
      }

      await this.deps.sendOrderNotification(order.id);
      return {
        status: "manual_fallback",
        orderId: order.id,
        message: "Order created - Stripe not configured for payment processing",
      };
    }

    const order = await this.deps.storage.createOrder({
      customerId: input.customerId,
      status: "pending",
      subtotalAmount,
      totalAmount,
      stripeSessionId: null,
      affiliateCode: input.affiliate?.affiliateCode,
      affiliateIsFriendsFamily: input.isFriendsFamily,
      affiliateDiscountAmount: affiliateDiscountAmount > 0 ? affiliateDiscountAmount : null,
    });
    for (const item of orderItems) {
      await this.deps.storage.createOrderItem({ orderId: order.id, ...item });
    }

    const metadata = {
      orderId: order.id,
      customerId: input.customerId,
      affiliateCode: input.affiliate?.affiliateCode || "",
      affiliateId: input.affiliate?.id || "",
      affiliateSessionId: input.affiliateSessionId || "",
      attributionType: input.attributionType,
      isFriendsFamily: input.isFriendsFamily ? "true" : "false",
      affiliateDiscountAmount: affiliateDiscountAmount.toString(),
      paymentFlow: "checkout_session",
    };
    const session = await createSession({
      lineItems,
      successUrl: `${input.baseUrl}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${input.baseUrl}?cancelled=true`,
      customerEmail: input.customerEmail,
      clientReferenceId: order.id,
      automaticTax: { enabled: true },
      allowedShippingCountries: ["US"],
      metadata,
      paymentIntentMetadata: metadata,
    });
    await this.deps.storage.updateOrder(order.id, { stripeSessionId: session.id });
    return {
      status: "session_created",
      orderId: order.id,
      sessionId: session.id,
      checkoutUrl: session.url,
    };
  }
}

export function createCheckoutService(
  overrides: Omit<Partial<CheckoutServiceDependencies>, "storage"> & {
    storage?: Partial<CheckoutServiceDependencies["storage"]>;
  } = {},
): CheckoutService {
  const storageDependency: CheckoutServiceDependencies["storage"] = {
    getProduct: async (...args) => (await import("../../storage")).storage.getProduct(...args),
    getAffiliateSettings: async (...args) => (await import("../../storage")).storage.getAffiliateSettings(...args),
    getCouponByCode: async (...args) => (await import("../../storage")).storage.getCouponByCode(...args),
    createOrder: async (...args) => (await import("../../storage")).storage.createOrder(...args),
    createOrderItem: async (...args) => (await import("../../storage")).storage.createOrderItem(...args),
    updateOrder: async (...args) => (await import("../../storage")).storage.updateOrder(...args),
    getAffiliateReferralByOrderId: async (...args) => (await import("../../storage")).storage.getAffiliateReferralByOrderId(...args),
    createAffiliateReferral: async (...args) => (await import("../../storage")).storage.createAffiliateReferral(...args),
    updateAffiliate: async (...args) => (await import("../../storage")).storage.updateAffiliate(...args),
  };

  return new CheckoutService({
    storage: { ...storageDependency, ...overrides.storage },
    calculateTax: overrides.calculateTax ?? (async (input) => {
      const { stripeService } = await import("../integrations/stripe/StripeService");
      const stripeClient = await stripeService.getClient();
      if (!stripeClient) throw new Error("Stripe is not configured");
      const result = await stripeClient.tax.calculations.create({
        currency: input.currency,
        line_items: input.lineItems.map((item) => ({
          amount: item.amount,
          reference: item.reference,
          tax_behavior: item.taxBehavior,
          tax_code: item.taxCode,
        })),
        customer_details: {
          address: {
            line1: input.customerAddress.line1,
            city: input.customerAddress.city,
            state: input.customerAddress.state,
            postal_code: input.customerAddress.postalCode,
            country: input.customerAddress.country,
          },
          address_source: "shipping",
        },
      });
      return { id: result.id, taxAmountExclusive: result.tax_amount_exclusive };
    }),
    createPaymentIntent: overrides.createPaymentIntent ?? (async (input) => {
      const { stripeService } = await import("../integrations/stripe/StripeService");
      const stripeClient = await stripeService.getClient();
      if (!stripeClient) throw new Error("Stripe is not configured");
      const result = await stripeClient.paymentIntents.create({
        amount: input.amount,
        currency: input.currency,
        automatic_payment_methods: input.automaticPaymentMethods,
        metadata: input.metadata,
      });
      return { id: result.id, clientSecret: result.client_secret };
    }),
    getCheckoutSessionCreator: overrides.getCheckoutSessionCreator ?? (async () => {
      const { stripeService } = await import("../integrations/stripe/StripeService");
      const stripeClient = await stripeService.getClient();
      if (!stripeClient) return null;
      return async (input) => {
        const session = await stripeClient.checkout.sessions.create({
          line_items: input.lineItems.map((item) => ({
            price_data: {
              currency: "usd",
              product_data: { name: item.productName },
              unit_amount: item.unitAmount,
              tax_behavior: "exclusive",
            },
            quantity: item.quantity,
          })),
          mode: "payment",
          success_url: input.successUrl,
          cancel_url: input.cancelUrl,
          customer_email: input.customerEmail,
          client_reference_id: input.clientReferenceId,
          automatic_tax: input.automaticTax,
          shipping_address_collection: { allowed_countries: input.allowedShippingCountries },
          metadata: input.metadata,
          payment_intent_data: { metadata: input.paymentIntentMetadata },
        });
        return { id: session.id, url: session.url };
      };
    }),
    sendOrderNotification: overrides.sendOrderNotification ?? (async (orderId) => {
      const { sendOrderNotification } = await import("./order-notification.service");
      await sendOrderNotification(orderId);
    }),
    now: overrides.now ?? (() => new Date()),
    log: overrides.log ?? console,
  });
}
