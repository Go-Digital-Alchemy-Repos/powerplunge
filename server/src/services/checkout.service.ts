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

export interface CheckoutServiceDependencies {
  storage: Pick<IStorage, "getProduct" | "getAffiliateSettings" | "getCouponByCode">;
  calculateTax: (input: CheckoutTaxCalculationInput) => Promise<CheckoutTaxCalculationResult>;
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

  async quote(input: CheckoutQuoteInput): Promise<CheckoutQuoteResult> {
    let subtotalAmount = 0;
    const orderItems: CheckoutOrderItem[] = [];
    const resolvedProducts: Product[] = [];
    const { items } = input;

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

    let affiliateDiscountAmount = 0;
    if (input.affiliate?.status === "active") {
      const settings = await this.deps.storage.getAffiliateSettings();
      for (let index = 0; index < orderItems.length; index++) {
        const item = orderItems[index];
        const lineTotal = item.unitPrice * item.quantity;
        affiliateDiscountAmount += computeAffiliateDiscount(
          resolvedProducts[index], lineTotal, settings, input.isFriendsFamily, input.affiliate, item.quantity,
        );
      }
    }

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
}

export function createCheckoutService(
  overrides: Partial<CheckoutServiceDependencies> = {},
): CheckoutService {
  const storageDependency: CheckoutServiceDependencies["storage"] = {
    getProduct: async (...args) => (await import("../../storage")).storage.getProduct(...args),
    getAffiliateSettings: async (...args) => (await import("../../storage")).storage.getAffiliateSettings(...args),
    getCouponByCode: async (...args) => (await import("../../storage")).storage.getCouponByCode(...args),
  };

  return new CheckoutService({
    storage: overrides.storage ?? storageDependency,
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
    now: overrides.now ?? (() => new Date()),
    log: overrides.log ?? console,
  });
}
