import { Router } from "express";
import { storage } from "../../../storage";
import { insertCustomerSchema, type Product, type AffiliateSettings, type Affiliate, orders } from "@shared/schema";
import { checkoutLimiter, paymentLimiter } from "../../middleware/rate-limiter";
import { normalizeEmail } from "../../services/customer-identity.service";
import { getCustomerAuthContext } from "../../auth/customerBetterAuth";
import { normalizeState } from "@shared/us-states";
import { validateEmail, validatePhone, validateAddress, validateZip, normalizeAddress, type ValidationError } from "@shared/validation";
import { stripeService } from "../../integrations/stripe/StripeService";
import { createOrderFinalizationService } from "../../services/order-finalization.service";
import {
  CheckoutEmptyCartError,
  CheckoutInvalidItemQuantityError,
  CheckoutTaxCalculationError,
  CheckoutUnknownProductError,
  CheckoutZeroPayableError,
  createCheckoutService,
} from "../../services/checkout.service";
import { db } from "../../../db";
import { eq, and, sql } from "drizzle-orm";

const DEFAULT_STRIPE_TAX_CODE = "txcd_99999999";

const TAXABLE_STATES_WARN_ON_ZERO = ["NC"];

interface MetaTrackingPayload {
  marketingConsentGranted?: boolean;
  fbp?: string;
  fbc?: string;
  eventSourceUrl?: string;
  userAgent?: string;
}

function normalizeMetaTracking(input: unknown): MetaTrackingPayload {
  const data = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const asString = (value: unknown, max = 1000): string | undefined => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    return trimmed.slice(0, max);
  };

  return {
    marketingConsentGranted: data.marketingConsentGranted === true,
    fbp: asString(data.fbp, 200),
    fbc: asString(data.fbc, 200),
    eventSourceUrl: asString(data.eventSourceUrl, 1000),
    userAgent: asString(data.userAgent, 1000),
  };
}

function computeAffiliateDiscount(
  product: Product,
  lineTotal: number,
  settings: AffiliateSettings | undefined,
  isFriendsFamily: boolean = false,
  affiliate?: Affiliate | null,
  quantity: number = 1
): number {
  if (!product.affiliateEnabled) return 0;

  let discountType: string;
  let discountValue: number;

  const hasCustomDiscount = affiliate?.useCustomRates && affiliate?.customDiscountType && affiliate?.customDiscountValue != null;

  if (isFriendsFamily && settings?.ffEnabled) {
    discountType = settings.ffDiscountType || "PERCENT";
    discountValue = settings.ffDiscountValue ?? 20;
  } else if (hasCustomDiscount) {
    discountType = affiliate!.customDiscountType!;
    discountValue = affiliate!.customDiscountValue!;
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
  } else {
    return Math.min(lineTotal, discountValue * quantity);
  }
}

async function resolveAffiliateCode(code: string): Promise<{ baseCode: string; isFriendsFamily: boolean }> {
  const upper = code.toUpperCase();
  const exactAffiliate = await storage.getAffiliateByCode(upper);
  if (exactAffiliate) {
    return { baseCode: upper, isFriendsFamily: false };
  }
  if (upper.startsWith("FF") && upper.length > 2) {
    const stripped = upper.substring(2);
    return { baseCode: stripped, isFriendsFamily: true };
  }
  return { baseCode: upper, isFriendsFamily: false };
}

async function countFfUsesForAffiliate(affiliateCode: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(
      and(
        eq(orders.affiliateCode, affiliateCode),
        eq(orders.affiliateIsFriendsFamily, true),
        sql`${orders.status} != 'cancelled'`
      )
    );
  return result[0]?.count || 0;
}

async function checkFfLimitExceeded(
  affiliateCode: string,
  settings: AffiliateSettings | null | undefined
): Promise<boolean> {
  if (!settings || !settings.ffMaxUses || settings.ffMaxUses <= 0) return false;
  const usageCount = await countFfUsesForAffiliate(affiliateCode);
  return usageCount >= settings.ffMaxUses;
}

const router = Router();

router.get("/stripe/config", async (req, res) => {
  try {
    const config = await stripeService.getConfig();
    res.json({
      publishableKey: config.publishableKey || null,
    });
  } catch (error) {
    console.error("[STRIPE] Failed to get config:", error);
    res.json({ publishableKey: null });
  }
});

router.get("/validate-referral-code/:code", async (req, res) => {
  try {
    const { code } = req.params;
    if (!code || code.length < 3) {
      return res.json({ valid: false });
    }
    const resolved = await resolveAffiliateCode(code);
    const affiliate = await storage.getAffiliateByCode(resolved.baseCode);
    if (affiliate && affiliate.status === "active") {
      if (resolved.isFriendsFamily) {
        const affSettings = await storage.getAffiliateSettings();
        if (!(affSettings as any)?.ffEnabled || !affiliate.ffEnabled) {
          return res.json({ valid: false });
        }
        const limitExceeded = await checkFfLimitExceeded(affiliate.affiliateCode, affSettings);
        if (limitExceeded) {
          return res.json({ valid: false, reason: "ff_limit_reached" });
        }
        return res.json({ valid: true, code: `FF${affiliate.affiliateCode}`, isFriendsFamily: true });
      }
      return res.json({ valid: true, code: affiliate.affiliateCode });
    }
    return res.json({ valid: false });
  } catch (error) {
    console.error("Validate referral code error:", error);
    return res.json({ valid: false });
  }
});

router.post("/create-payment-intent", paymentLimiter, async (req: any, res) => {
  try {
    const {
      items,
      customer,
      affiliateCode,
      billingAddress: billingInput,
      billingSameAsShipping: billingSame,
      couponCode,
      metaTracking,
    } = req.body;
    const normalizedMetaTracking = normalizeMetaTracking(metaTracking);
    const isBillingSame = billingSame !== false;

    const stripeClient = await stripeService.getClient();
    if (!stripeClient) {
      return res.status(400).json({ message: "Stripe is not configured" });
    }

    const parsedCustomer = insertCustomerSchema.parse(customer);
    const customerData = { ...parsedCustomer, email: normalizeEmail(parsedCustomer.email) };

    const allErrors: ValidationError[] = [];

    const emailErr = validateEmail(customerData.email);
    if (emailErr) allErrors.push(emailErr);

    const phoneErr = validatePhone(customerData.phone || "");
    if (phoneErr) allErrors.push(phoneErr);

    const shippingAddr = {
      name: customerData.name || "",
      company: (customer.company || "").trim(),
      line1: customerData.address || "",
      line2: (customer.line2 || "").trim(),
      city: customerData.city || "",
      state: customerData.state || "",
      postalCode: customerData.zipCode || "",
      country: "US",
    };
    const shippingErrors = validateAddress(shippingAddr);
    allErrors.push(...shippingErrors);

    const normalizedShipping = normalizeAddress(shippingAddr);
    customerData.state = normalizedShipping.state;
    customerData.zipCode = normalizedShipping.postalCode;

    let validatedBilling: { name: string; company?: string; address: string; line2?: string; city: string; state: string; zipCode: string } | null = null;
    if (!isBillingSame && billingInput) {
      const billingAddr = {
        name: billingInput.name || "",
        company: (billingInput.company || "").trim(),
        line1: billingInput.address || "",
        line2: (billingInput.line2 || "").trim(),
        city: billingInput.city || "",
        state: billingInput.state || "",
        postalCode: billingInput.zipCode || "",
        country: "US",
      };
      const billingErrors = validateAddress(billingAddr, "billing");
      allErrors.push(...billingErrors);

      const normalizedBilling = normalizeAddress(billingAddr);
      validatedBilling = {
        name: normalizedBilling.name,
        company: normalizedBilling.company,
        address: normalizedBilling.line1,
        line2: normalizedBilling.line2,
        city: normalizedBilling.city,
        state: normalizedBilling.state,
        zipCode: normalizedBilling.postalCode,
      };
    }

    if (allErrors.length > 0) {
      return res.status(400).json({ errors: allErrors });
    }

    let affiliateSessionId: string | null = null;
    let cookieAffiliateId: string | null = null;
    const affiliateCookie = req.cookies?.affiliate;
    if (affiliateCookie) {
      try {
        const decoded = Buffer.from(affiliateCookie, "base64").toString("utf8");
        const cookieData = JSON.parse(decoded);
        if (cookieData.affiliateId && cookieData.sessionId && cookieData.expiresAt > Date.now()) {
          affiliateSessionId = cookieData.sessionId;
          cookieAffiliateId = cookieData.affiliateId;
        }
      } catch {}
    }

    let affiliate = null;
    let isFriendsFamily = false;
    if (affiliateCode) {
      const resolved = await resolveAffiliateCode(affiliateCode);
      isFriendsFamily = resolved.isFriendsFamily;
      affiliate = await storage.getAffiliateByCode(resolved.baseCode);
      if (isFriendsFamily && affiliate) {
        const affSettings = await storage.getAffiliateSettings();
        if (!(affSettings as any)?.ffEnabled || !affiliate.ffEnabled) {
          isFriendsFamily = false;
        } else {
          const limitExceeded = await checkFfLimitExceeded(affiliate.affiliateCode, affSettings);
          if (limitExceeded) {
            isFriendsFamily = false;
          }
        }
      }
    } else if (cookieAffiliateId) {
      affiliate = await storage.getAffiliate(cookieAffiliateId);
    }

    const customerAuthContext = await getCustomerAuthContext(req).catch(() => null);
    const loggedInCustomerId = customerAuthContext?.customer.id ?? null;

    if (affiliate && affiliate.status === "active") {
      const affiliateCustomer = await storage.getCustomer(affiliate.customerId);
      if (affiliateCustomer && normalizeEmail(affiliateCustomer.email) === customerData.email) {
        console.log(`[SELF-REFERRAL] Blocked self-referral: customer email ${customerData.email} matches affiliate ${affiliate.affiliateCode} owner`);
        affiliate = null;
      }
    }

    let existingCustomer = await storage.getCustomerByEmail(customerData.email);
    if (!existingCustomer) {
      existingCustomer = await storage.createCustomer({ ...customerData, userId: null });
    } else {
      if (affiliate && affiliate.status === "active" && existingCustomer.id === affiliate.customerId) {
        console.log(`[SELF-REFERRAL] Blocked self-referral: customerId ${existingCustomer.id} is affiliate owner for ${affiliate.affiliateCode}`);
        affiliate = null;
      }
      const updated = await storage.updateCustomer(existingCustomer.id, {
        ...customerData,
        userId: existingCustomer.userId || null,
      });
      if (updated) existingCustomer = updated;
    }

    if (loggedInCustomerId && loggedInCustomerId !== existingCustomer.id) {
      const loggedInCustomer = await storage.getCustomer(loggedInCustomerId);
      if (loggedInCustomer && !loggedInCustomer.isDisabled) {
        console.log(`[CHECKOUT] Logged-in customer ${loggedInCustomerId} using checkout email ${customerData.email} (customer ${existingCustomer.id}). Assigning order to logged-in account.`);
        existingCustomer = loggedInCustomer;
      }
    }

    const forwardedFor = req.headers?.["x-forwarded-for"];
    const customerIp = typeof forwardedFor === "string"
      ? forwardedFor.split(",")[0]?.trim() || null
      : req.ip || null;

    let checkout;
    try {
      const checkoutService = createCheckoutService({
        storage: {
          getProduct: (...args) => storage.getProduct(...args),
          getAffiliateSettings: (...args) => storage.getAffiliateSettings(...args),
          getCouponByCode: (...args) => storage.getCouponByCode(...args),
          createOrder: (...args) => storage.createOrder(...args),
          createOrderItem: (...args) => storage.createOrderItem(...args),
          updateOrder: (...args) => storage.updateOrder(...args),
        },
        calculateTax: async (input) => {
          const calculation = await stripeClient.tax.calculations.create({
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
          return { id: calculation.id, taxAmountExclusive: calculation.tax_amount_exclusive };
        },
        createPaymentIntent: async (input) => {
          const paymentIntent = await stripeClient.paymentIntents.create({
            amount: input.amount,
            currency: input.currency,
            automatic_payment_methods: input.automaticPaymentMethods,
            metadata: input.metadata,
          });
          return { id: paymentIntent.id, clientSecret: paymentIntent.client_secret };
        },
      });
      checkout = await checkoutService.createPaymentIntentCheckout({
        items,
        affiliate,
        isFriendsFamily,
        couponCode,
        taxAddress: {
          line1: customerData.address || "",
          city: customerData.city || "",
          state: normalizedShipping.state,
          postalCode: customerData.zipCode,
          country: "US",
        },
        customerId: existingCustomer.id,
        shipping: {
          name: customerData.name,
          company: shippingAddr.company || null,
          address: customerData.address,
          line2: shippingAddr.line2 || null,
          city: customerData.city,
          state: normalizedShipping.state,
          zipCode: customerData.zipCode,
          country: "US",
        },
        billingSameAsShipping: isBillingSame,
        billing: validatedBilling ? {
          name: validatedBilling.name,
          company: validatedBilling.company || null,
          address: validatedBilling.address,
          line2: validatedBilling.line2 || null,
          city: validatedBilling.city,
          state: validatedBilling.state,
          zipCode: validatedBilling.zipCode,
          country: "US",
        } : null,
        affiliateSessionId,
        attributionType: affiliateCode ? "coupon" : (affiliateSessionId ? "cookie" : "direct"),
        customerIp,
        tracking: {
          marketingConsentGranted: normalizedMetaTracking.marketingConsentGranted === true,
          fbp: normalizedMetaTracking.fbp || null,
          fbc: normalizedMetaTracking.fbc || null,
          eventSourceUrl: normalizedMetaTracking.eventSourceUrl || null,
          userAgent: normalizedMetaTracking.userAgent || req.get("user-agent") || null,
        },
      });
    } catch (error) {
      if (error instanceof CheckoutEmptyCartError || error instanceof CheckoutInvalidItemQuantityError) {
        return res.status(400).json({ message: error.message });
      }
      if (error instanceof CheckoutUnknownProductError) {
        return res.status(400).json({ message: error.message });
      }
      if (error instanceof CheckoutTaxCalculationError) {
        return res.status(422).json({ message: error.message, field: "address" });
      }
      throw error;
    }

    const {
      affiliateDiscountAmount,
      couponDiscountAmount,
      clientSecret,
      orderId,
      subtotalAmount,
      taxAmount,
      totalAmount,
    } = checkout;

    res.json({
      clientSecret,
      orderId,
      subtotal: subtotalAmount,
      affiliateDiscount: affiliateDiscountAmount,
      couponDiscount: couponDiscountAmount,
      taxAmount,
      total: totalAmount,
    });
  } catch (error: any) {
    console.error("Create payment intent error:", error);
    res.status(500).json({ message: error.message || "Failed to create payment intent" });
  }
});

router.post("/reprice-payment-intent", paymentLimiter, async (req: any, res) => {
  try {
    const {
      orderId,
      items,
      customer,
      billingAddress: billingInput,
      billingSameAsShipping: billingSame,
      affiliateCode,
      couponCode,
      metaTracking,
    } = req.body;
    const normalizedMetaTracking = normalizeMetaTracking(metaTracking);
    const isBillingSame = billingSame !== false;

    if (!orderId) {
      return res.status(400).json({ message: "Missing orderId" });
    }

    const stripeClient = await stripeService.getClient();
    if (!stripeClient) {
      return res.status(400).json({ message: "Stripe is not configured" });
    }

    const order = await storage.getOrder(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (order.status !== "pending") {
      return res.status(400).json({ message: "Order already finalized" });
    }
    if (!order.stripePaymentIntentId) {
      return res.status(400).json({ message: "Order has no payment intent" });
    }

    const parsedCustomer = insertCustomerSchema.parse(customer);
    const customerData = { ...parsedCustomer, email: normalizeEmail(parsedCustomer.email) };

    const allErrors: ValidationError[] = [];

    const emailErr = validateEmail(customerData.email);
    if (emailErr) allErrors.push(emailErr);

    const phoneErr = validatePhone(customerData.phone || "");
    if (phoneErr) allErrors.push(phoneErr);

    const shippingAddr = {
      name: customerData.name || "",
      company: (customer.company || "").trim(),
      line1: customerData.address || "",
      line2: (customer.line2 || "").trim(),
      city: customerData.city || "",
      state: customerData.state || "",
      postalCode: customerData.zipCode || "",
      country: "US",
    };
    const shippingErrors = validateAddress(shippingAddr);
    allErrors.push(...shippingErrors);

    const normalizedShipping = normalizeAddress(shippingAddr);
    customerData.state = normalizedShipping.state;
    customerData.zipCode = normalizedShipping.postalCode;

    let validatedBilling: { name: string; company?: string; address: string; line2?: string; city: string; state: string; zipCode: string } | null = null;
    if (!isBillingSame && billingInput) {
      const billingAddr = {
        name: billingInput.name || "",
        company: (billingInput.company || "").trim(),
        line1: billingInput.address || "",
        line2: (billingInput.line2 || "").trim(),
        city: billingInput.city || "",
        state: billingInput.state || "",
        postalCode: billingInput.zipCode || "",
        country: "US",
      };
      const billingErrors = validateAddress(billingAddr, "billing");
      allErrors.push(...billingErrors);

      const normalizedBilling = normalizeAddress(billingAddr);
      validatedBilling = {
        name: normalizedBilling.name,
        company: normalizedBilling.company,
        address: normalizedBilling.line1,
        line2: normalizedBilling.line2,
        city: normalizedBilling.city,
        state: normalizedBilling.state,
        zipCode: normalizedBilling.postalCode,
      };
    }

    if (allErrors.length > 0) {
      return res.status(400).json({ errors: allErrors });
    }

    let affiliateSessionId: string | null = null;
    let cookieAffiliateId: string | null = null;
    const affiliateCookie = req.cookies?.affiliate;
    if (affiliateCookie) {
      try {
        const decoded = Buffer.from(affiliateCookie, "base64").toString("utf8");
        const cookieData = JSON.parse(decoded);
        if (cookieData.affiliateId && cookieData.sessionId && cookieData.expiresAt > Date.now()) {
          affiliateSessionId = cookieData.sessionId;
          cookieAffiliateId = cookieData.affiliateId;
        }
      } catch {}
    }

    let affiliate = null;
    let isFriendsFamily = false;
    if (affiliateCode) {
      const resolved = await resolveAffiliateCode(affiliateCode);
      isFriendsFamily = resolved.isFriendsFamily;
      affiliate = await storage.getAffiliateByCode(resolved.baseCode);
      if (isFriendsFamily && affiliate) {
        const affSettings = await storage.getAffiliateSettings();
        if (!(affSettings as any)?.ffEnabled || !affiliate.ffEnabled) {
          isFriendsFamily = false;
        } else {
          const limitExceeded = await checkFfLimitExceeded(affiliate.affiliateCode, affSettings);
          if (limitExceeded) {
            isFriendsFamily = false;
          }
        }
      }
    } else if (cookieAffiliateId) {
      affiliate = await storage.getAffiliate(cookieAffiliateId);
    }

    if (affiliate && affiliate.status === "active") {
      const affiliateCustomer = await storage.getCustomer(affiliate.customerId);
      if (affiliateCustomer && normalizeEmail(affiliateCustomer.email) === customerData.email) {
        affiliate = null;
      }
    }

    let existingCustomer = await storage.getCustomerByEmail(customerData.email);
    if (existingCustomer) {
      if (affiliate && affiliate.status === "active" && existingCustomer.id === affiliate.customerId) {
        affiliate = null;
      }
      const updated = await storage.updateCustomer(existingCustomer.id, {
        ...customerData,
        userId: existingCustomer.userId || null,
      });
      if (updated) existingCustomer = updated;
    }

    let subtotalAmount = 0;
    const orderItems: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
    }> = [];
    const repriceProducts: Product[] = [];

    for (const item of items) {
      const product = await storage.getProduct(item.productId);
      if (!product) {
        return res.status(400).json({ message: `Product ${item.productId} not found` });
      }
      subtotalAmount += product.price * item.quantity;
      orderItems.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: product.price,
      });
      repriceProducts.push(product);
    }

    let affiliateDiscountAmount = 0;
    if (affiliate && affiliate.status === "active") {
      const affSettings = await storage.getAffiliateSettings();
      for (let i = 0; i < orderItems.length; i++) {
        const lineTotal = orderItems[i].unitPrice * orderItems[i].quantity;
        affiliateDiscountAmount += computeAffiliateDiscount(repriceProducts[i], lineTotal, affSettings, isFriendsFamily, affiliate, orderItems[i].quantity);
      }
    }

    let couponDiscountAmount = 0;
    let validatedCoupon: any = null;
    if (couponCode) {
      const coupon = await storage.getCouponByCode(couponCode.toUpperCase());
      if (coupon && coupon.active) {
        const now = new Date();
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
        }
      }
    }

    const discountedSubtotal = Math.max(0, subtotalAmount - affiliateDiscountAmount - couponDiscountAmount);

    let taxAmount = 0;
    let taxCalculationId: string | null = null;

    try {
      const taxableAmount = discountedSubtotal;
      const taxLineItems = orderItems.map((item) => {
        const itemTotal = item.unitPrice * item.quantity;
        const itemShare = subtotalAmount > 0 ? Math.floor(taxableAmount * (itemTotal / subtotalAmount)) : 0;
        return {
          amount: itemShare,
          reference: item.productId,
          tax_behavior: "exclusive" as const,
          tax_code: DEFAULT_STRIPE_TAX_CODE,
        };
      });

      const taxCalculation = await stripeClient.tax.calculations.create({
        currency: "usd",
        line_items: taxLineItems,
        customer_details: {
          address: {
            line1: customerData.address || "",
            city: customerData.city || "",
            state: normalizedShipping.state,
            postal_code: customerData.zipCode.split("-")[0],
            country: "US",
          },
          address_source: "shipping",
        },
      });

      taxAmount = taxCalculation.tax_amount_exclusive;
      taxCalculationId = taxCalculation.id;
      console.log(`[TAX] Repriced: $${(taxAmount / 100).toFixed(2)} | state=${normalizedShipping.state} zip=${customerData.zipCode.split("-")[0]} calcId=${taxCalculationId}`);

      if (taxAmount === 0 && TAXABLE_STATES_WARN_ON_ZERO.includes(normalizedShipping.state)) {
        console.warn(`[TAX][WARN] Zero tax returned for taxable state ${normalizedShipping.state} (zip=${customerData.zipCode}, calcId=${taxCalculationId}). Verify Stripe Tax registration.`);
      }
    } catch (taxError: any) {
      console.error(`[TAX] Reprice calculation failed | state=${normalizedShipping.state} zip=${customerData.zipCode}:`, taxError.message);
      return res.status(422).json({
        message: "Unable to calculate tax. Please verify your shipping state and ZIP code.",
        field: "address",
      });
    }

    const totalAmount = discountedSubtotal + taxAmount;
    const forwardedFor = req.headers?.["x-forwarded-for"];
    const customerIp = typeof forwardedFor === "string"
      ? forwardedFor.split(",")[0]?.trim() || null
      : req.ip || null;

    await storage.updateOrder(orderId, {
      subtotalAmount,
      taxAmount: taxAmount > 0 ? taxAmount : null,
      totalAmount,
      stripeTaxCalculationId: taxCalculationId,
      affiliateCode: affiliate?.affiliateCode || null,
      affiliateIsFriendsFamily: isFriendsFamily,
      affiliateDiscountAmount: affiliateDiscountAmount > 0 ? affiliateDiscountAmount : null,
      couponDiscountAmount: couponDiscountAmount > 0 ? couponDiscountAmount : null,
      couponCode: validatedCoupon?.code || null,
      shippingName: customerData.name,
      shippingCompany: shippingAddr.company || null,
      shippingAddress: customerData.address,
      shippingLine2: shippingAddr.line2 || null,
      shippingCity: customerData.city,
      shippingState: normalizedShipping.state,
      shippingZip: customerData.zipCode,
      shippingCountry: "US",
      billingSameAsShipping: isBillingSame,
      billingName: validatedBilling?.name || null,
      billingCompany: validatedBilling?.company || null,
      billingAddress: validatedBilling?.address || null,
      billingLine2: validatedBilling?.line2 || null,
      billingCity: validatedBilling?.city || null,
      billingState: validatedBilling?.state || null,
      billingZip: validatedBilling?.zipCode || null,
      billingCountry: validatedBilling ? "US" : null,
      customerIp,
      marketingConsentGranted: normalizedMetaTracking.marketingConsentGranted === true,
      metaFbp: normalizedMetaTracking.fbp || null,
      metaFbc: normalizedMetaTracking.fbc || null,
      metaEventSourceUrl: normalizedMetaTracking.eventSourceUrl || null,
      customerUserAgent: normalizedMetaTracking.userAgent || req.get("user-agent") || null,
    });

    let clientSecret: string;
    const repriceMetadata = {
      orderId: order.id,
      customerId: order.customerId,
      affiliateCode: affiliate?.affiliateCode || "",
      affiliateId: affiliate?.id || "",
      affiliateSessionId: affiliateSessionId || "",
      attributionType: affiliateCode ? "coupon" : (affiliateSessionId ? "cookie" : "direct"),
      taxAmount: taxAmount.toString(),
      taxCalculationId: taxCalculationId || "",
      affiliateDiscountAmount: affiliateDiscountAmount.toString(),
      couponCode: validatedCoupon?.code || "",
      couponId: validatedCoupon?.id || "",
      couponDiscountAmount: couponDiscountAmount.toString(),
    };
    try {
      const updatedIntent = await stripeClient.paymentIntents.update(order.stripePaymentIntentId, {
        amount: totalAmount,
        metadata: repriceMetadata,
      });
      clientSecret = updatedIntent.client_secret!;
    } catch (updateErr: any) {
      console.log(`[REPRICE] PaymentIntent update failed, recreating: ${updateErr.message}`);
      const newIntent = await stripeClient.paymentIntents.create({
        amount: totalAmount,
        currency: "usd",
        automatic_payment_methods: { enabled: true },
        metadata: repriceMetadata,
      });
      await storage.updateOrder(orderId, { stripePaymentIntentId: newIntent.id });
      clientSecret = newIntent.client_secret!;
    }

    res.json({
      clientSecret,
      orderId: order.id,
      subtotal: subtotalAmount,
      affiliateDiscount: affiliateDiscountAmount,
      couponDiscount: couponDiscountAmount,
      taxAmount,
      total: totalAmount,
    });
  } catch (error: any) {
    console.error("Reprice payment intent error:", error);
    res.status(500).json({ message: error.message || "Failed to reprice payment intent" });
  }
});

router.post("/confirm-payment", paymentLimiter, async (req: any, res) => {
  try {
    const { orderId, paymentIntentId, metaTracking } = req.body;
    const normalizedMetaTracking = normalizeMetaTracking(metaTracking);
    const hasMetaTracking = !!metaTracking && typeof metaTracking === "object";

    if (!orderId || !paymentIntentId) {
      return res.status(400).json({ message: "Missing orderId or paymentIntentId" });
    }

    const stripeClient = await stripeService.getClient();
    if (!stripeClient) {
      return res.status(400).json({ message: "Stripe is not configured" });
    }

    const paymentIntent = await stripeClient.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({ message: "Payment not completed" });
    }

    if (paymentIntent.metadata.orderId !== orderId) {
      console.error("Order ID mismatch:", { 
        providedOrderId: orderId, 
        metadataOrderId: paymentIntent.metadata.orderId 
      });
      return res.status(400).json({ message: "Invalid payment verification" });
    }

    const finalizationUpdate: Record<string, any> = {};
    if (hasMetaTracking) {
      finalizationUpdate.marketingConsentGranted = normalizedMetaTracking.marketingConsentGranted === true;
      if (normalizedMetaTracking.fbp) finalizationUpdate.metaFbp = normalizedMetaTracking.fbp;
      if (normalizedMetaTracking.fbc) finalizationUpdate.metaFbc = normalizedMetaTracking.fbc;
      if (normalizedMetaTracking.eventSourceUrl) finalizationUpdate.metaEventSourceUrl = normalizedMetaTracking.eventSourceUrl;
      finalizationUpdate.customerUserAgent = normalizedMetaTracking.userAgent || req.get("user-agent") || null;
    }

    const finalizationService = createOrderFinalizationService({
      createTaxTransaction: async (calculation, reference) => {
        await stripeClient.tax.transactions.createFromCalculation({ calculation, reference });
      },
    });
    const finalizationResult = await finalizationService.finalizeStripePaymentIntent({
      paymentIntent: {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata,
      },
      orderUpdate: finalizationUpdate,
    });

    if (finalizationResult.status === "skipped") {
      switch (finalizationResult.reason) {
        case "missing_order_id":
        case "order_not_found":
          return res.status(404).json({ message: "Order not found" });
        case "amount_mismatch":
          return res.status(400).json({ message: "Payment amount mismatch" });
        case "currency_mismatch":
          return res.status(400).json({ message: "Invalid currency" });
      }
    }

    let order = finalizationResult.order;
    if (!order) {
      order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
    }

    if (finalizationResult.status !== "finalized" && order.status === "paid" && hasMetaTracking) {
      const trackingOnlyUpdate: Record<string, any> = {
        marketingConsentGranted: normalizedMetaTracking.marketingConsentGranted === true,
      };
      if (normalizedMetaTracking.fbp) trackingOnlyUpdate.metaFbp = normalizedMetaTracking.fbp;
      if (normalizedMetaTracking.fbc) trackingOnlyUpdate.metaFbc = normalizedMetaTracking.fbc;
      if (normalizedMetaTracking.eventSourceUrl) trackingOnlyUpdate.metaEventSourceUrl = normalizedMetaTracking.eventSourceUrl;
      trackingOnlyUpdate.customerUserAgent = normalizedMetaTracking.userAgent || req.get("user-agent") || null;
      const updatedOrder = await storage.updateOrder(orderId, trackingOnlyUpdate);
      if (updatedOrder) {
        order = updatedOrder;
      }
    }

    // Already-finalized orders can still receive browser tracking context.
    // Re-enqueue is idempotent and lets Meta capture late consent without re-running finalization.
    if (finalizationResult.status !== "finalized" && order.status === "paid") {
      try {
        const { metaConversionsService } = await import("../../integrations/meta/MetaConversionsService");
        await metaConversionsService.enqueuePurchase(orderId);
      } catch (metaErr: any) {
        console.error("[META] Failed to enqueue purchase event:", metaErr.message || metaErr);
      }
    }

    res.json({ success: true, orderId });
  } catch (error: any) {
    console.error("Confirm payment error:", error);
    res.status(500).json({ message: error.message || "Failed to confirm payment" });
  }
});

router.post("/checkout", checkoutLimiter, async (req: any, res) => {
  try {
    const { items, customer, affiliateCode } = req.body;

    const parsedCheckoutCustomer = insertCustomerSchema.parse(customer);
    const customerData = { ...parsedCheckoutCustomer, email: normalizeEmail(parsedCheckoutCustomer.email) };

    let affiliateSessionId: string | null = null;
    let cookieAffiliateId: string | null = null;
    const affiliateCookie = req.cookies?.affiliate;
    if (affiliateCookie) {
      try {
        const decoded = Buffer.from(affiliateCookie, "base64").toString("utf8");
        const cookieData = JSON.parse(decoded);
        if (cookieData.affiliateId && cookieData.sessionId && cookieData.expiresAt > Date.now()) {
          affiliateSessionId = cookieData.sessionId;
          cookieAffiliateId = cookieData.affiliateId;
        }
      } catch {}
    }

    let affiliate = null;
    let isFriendsFamily = false;
    if (affiliateCode) {
      const resolved = await resolveAffiliateCode(affiliateCode);
      isFriendsFamily = resolved.isFriendsFamily;
      affiliate = await storage.getAffiliateByCode(resolved.baseCode);
      if (isFriendsFamily && affiliate) {
        const affSettings = await storage.getAffiliateSettings();
        if (!(affSettings as any)?.ffEnabled || !affiliate.ffEnabled) {
          isFriendsFamily = false;
        } else {
          const limitExceeded = await checkFfLimitExceeded(affiliate.affiliateCode, affSettings);
          if (limitExceeded) {
            isFriendsFamily = false;
          }
        }
      }
    } else if (cookieAffiliateId) {
      affiliate = await storage.getAffiliate(cookieAffiliateId);
    }

    if (affiliate && affiliate.status === "active") {
      const affiliateCustomer = await storage.getCustomer(affiliate.customerId);
      if (affiliateCustomer && normalizeEmail(affiliateCustomer.email) === customerData.email) {
        console.log(`[SELF-REFERRAL] Blocked self-referral in checkout: customer email ${customerData.email} matches affiliate ${affiliate.affiliateCode} owner`);
        affiliate = null;
      }
    }
    const customerAuthContext = await getCustomerAuthContext(req).catch(() => null);
    const loggedInCustomerId = customerAuthContext?.customer.id ?? null;

    let existingCustomer = await storage.getCustomerByEmail(customerData.email);
    if (!existingCustomer) {
      existingCustomer = await storage.createCustomer({ ...customerData, userId: null });
    } else {
      if (affiliate && affiliate.status === "active" && existingCustomer.id === affiliate.customerId) {
        console.log(`[SELF-REFERRAL] Blocked self-referral in checkout: customerId ${existingCustomer.id} is affiliate owner for ${affiliate.affiliateCode}`);
        affiliate = null;
      }
      const updated = await storage.updateCustomer(existingCustomer.id, {
        ...customerData,
        userId: existingCustomer.userId || null,
      });
      if (updated) existingCustomer = updated;
    }

    if (loggedInCustomerId && loggedInCustomerId !== existingCustomer.id) {
      const loggedInCustomer = await storage.getCustomer(loggedInCustomerId);
      if (loggedInCustomer && !loggedInCustomer.isDisabled) {
        console.log(`[CHECKOUT] Logged-in customer ${loggedInCustomerId} using checkout email ${customerData.email} (customer ${existingCustomer.id}). Assigning order to logged-in account.`);
        existingCustomer = loggedInCustomer;
      }
    }

    const baseUrl = process.env.BASE_URL || `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
    const checkout = await createCheckoutService().createCheckoutSession({
      items,
      customerId: existingCustomer.id,
      customerEmail: customerData.email,
      affiliate,
      isFriendsFamily,
      affiliateSessionId,
      attributionType: affiliateCode ? "coupon" : (affiliateSessionId ? "cookie" : "direct"),
      baseUrl,
    });

    if (checkout.status === "manual_fallback") {
      return res.json({
        success: true,
        orderId: checkout.orderId,
        message: checkout.message,
      });
    }

    res.json({ success: true, checkoutUrl: checkout.checkoutUrl, orderId: checkout.orderId });
  } catch (error: any) {
    if (error instanceof CheckoutUnknownProductError || error instanceof CheckoutZeroPayableError) {
      return res.status(400).json({ message: error.message });
    }
    console.error("Checkout error:", error);
    res.status(500).json({ message: error.message || "Checkout failed" });
  }
});

router.get("/orders/by-session/:sessionId", async (req, res) => {
  try {
    const order = await storage.getOrderByStripeSession(req.params.sessionId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    const items = await storage.getOrderItems(order.id);
    const customer = await storage.getCustomer(order.customerId);
    res.json({ order, items, customer });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch order" });
  }
});


router.post("/analytics/checkout-event", (req, res) => {
  try {
    const { event, ...metadata } = req.body;
    if (event) {
      console.log(`[CHECKOUT_ANALYTICS] ${event}`, JSON.stringify(metadata));
    }
    res.status(204).end();
  } catch {
    res.status(204).end();
  }
});

export default router;
