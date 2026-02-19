import { Router } from "express";
import { storage } from "../../../storage";
import { insertCustomerSchema, type Product, type AffiliateSettings, type Affiliate, orders } from "@shared/schema";
import { checkoutLimiter, paymentLimiter } from "../../middleware/rate-limiter";
import { affiliateCommissionService } from "../../services/affiliate-commission.service";
import { normalizeEmail } from "../../services/customer-identity.service";
import { verifySessionToken } from "../../middleware/customer-auth.middleware";
import { normalizeState } from "@shared/us-states";
import { validateEmail, validatePhone, validateAddress, validateZip, normalizeAddress, type ValidationError } from "@shared/validation";
import { stripeService } from "../../integrations/stripe/StripeService";
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

    const userId = req.user?.claims?.sub;

    let loggedInCustomerId: string | null = null;
    const authHeader = req.headers?.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const tokenResult = verifySessionToken(authHeader.slice(7));
      if (tokenResult.valid && tokenResult.customerId) {
        loggedInCustomerId = tokenResult.customerId;
      }
    }

    if (affiliate && affiliate.status === "active") {
      const affiliateCustomer = await storage.getCustomer(affiliate.customerId);
      if (affiliateCustomer && normalizeEmail(affiliateCustomer.email) === customerData.email) {
        console.log(`[SELF-REFERRAL] Blocked self-referral: customer email ${customerData.email} matches affiliate ${affiliate.affiliateCode} owner`);
        affiliate = null;
      }
    }

    let existingCustomer = await storage.getCustomerByEmail(customerData.email);
    if (!existingCustomer) {
      existingCustomer = await storage.createCustomer({ ...customerData, userId });
    } else {
      if (affiliate && affiliate.status === "active" && existingCustomer.id === affiliate.customerId) {
        console.log(`[SELF-REFERRAL] Blocked self-referral: customerId ${existingCustomer.id} is affiliate owner for ${affiliate.affiliateCode}`);
        affiliate = null;
      }
      const updated = await storage.updateCustomer(existingCustomer.id, {
        ...customerData,
        userId: existingCustomer.userId || userId,
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

    let subtotalAmount = 0;
    const orderItems: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
    }> = [];
    const resolvedProducts: Product[] = [];

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
      resolvedProducts.push(product);
    }

    let affiliateDiscountAmount = 0;
    if (affiliate && affiliate.status === "active") {
      const affSettings = await storage.getAffiliateSettings();
      for (let i = 0; i < orderItems.length; i++) {
        const lineTotal = orderItems[i].unitPrice * orderItems[i].quantity;
        affiliateDiscountAmount += computeAffiliateDiscount(resolvedProducts[i], lineTotal, affSettings, isFriendsFamily, affiliate, orderItems[i].quantity);
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
          if (coupon.blockAffiliateCommission && affiliate) {
            console.log(`[COUPON] Coupon ${coupon.code} blocks affiliate commission for ${affiliate.affiliateCode}`);
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
      console.log(`[TAX] Calculated: $${(taxAmount / 100).toFixed(2)} | state=${normalizedShipping.state} zip=${customerData.zipCode.split("-")[0]} calcId=${taxCalculationId}`);

      if (taxAmount === 0 && TAXABLE_STATES_WARN_ON_ZERO.includes(normalizedShipping.state)) {
        console.warn(`[TAX][WARN] Zero tax returned for taxable state ${normalizedShipping.state} (zip=${customerData.zipCode}, calcId=${taxCalculationId}). Verify Stripe Tax registration.`);
      }
    } catch (taxError: any) {
      console.error(`[TAX] Calculation failed | state=${normalizedShipping.state} zip=${customerData.zipCode}:`, taxError.message);
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

    const order = await storage.createOrder({
      customerId: existingCustomer.id,
      status: "pending",
      totalAmount,
      subtotalAmount,
      taxAmount: taxAmount > 0 ? taxAmount : null,
      stripeTaxCalculationId: taxCalculationId,
      affiliateCode: affiliate?.affiliateCode,
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

    for (const item of orderItems) {
      await storage.createOrderItem({
        orderId: order.id,
        ...item,
      });
    }

    const paymentIntent = await stripeClient.paymentIntents.create({
      amount: totalAmount,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      metadata: {
        orderId: order.id,
        customerId: existingCustomer.id,
        affiliateCode: affiliate?.affiliateCode || "",
        affiliateId: affiliate?.id || "",
        affiliateSessionId: affiliateSessionId || "",
        attributionType: affiliateCode ? "coupon" : (affiliateSessionId ? "cookie" : "direct"),
        isFriendsFamily: isFriendsFamily ? "true" : "false",
        taxAmount: taxAmount.toString(),
        taxCalculationId: taxCalculationId || "",
        affiliateDiscountAmount: affiliateDiscountAmount.toString(),
        couponCode: validatedCoupon?.code || "",
        couponId: validatedCoupon?.id || "",
        couponDiscountAmount: couponDiscountAmount.toString(),
      },
    });

    await storage.updateOrder(order.id, {
      stripePaymentIntentId: paymentIntent.id,
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      orderId: order.id,
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
    const userId = req.user?.claims?.sub;
    if (existingCustomer) {
      if (affiliate && affiliate.status === "active" && existingCustomer.id === affiliate.customerId) {
        affiliate = null;
      }
      const updated = await storage.updateCustomer(existingCustomer.id, {
        ...customerData,
        userId: existingCustomer.userId || userId,
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

    let order = await storage.getOrder(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (paymentIntent.amount !== order.totalAmount) {
      console.error("Amount mismatch:", { 
        paymentAmount: paymentIntent.amount, 
        orderAmount: order.totalAmount 
      });
      return res.status(400).json({ message: "Payment amount mismatch" });
    }

    if (paymentIntent.currency !== "usd") {
      return res.status(400).json({ message: "Invalid currency" });
    }

    const startedPending = order.status === "pending";

    if (startedPending) {
      const confirmUpdate: Record<string, any> = {
        status: "paid",
        stripePaymentIntentId: paymentIntentId,
      };
      if (hasMetaTracking) {
        confirmUpdate.marketingConsentGranted = normalizedMetaTracking.marketingConsentGranted === true;
        if (normalizedMetaTracking.fbp) confirmUpdate.metaFbp = normalizedMetaTracking.fbp;
        if (normalizedMetaTracking.fbc) confirmUpdate.metaFbc = normalizedMetaTracking.fbc;
        if (normalizedMetaTracking.eventSourceUrl) confirmUpdate.metaEventSourceUrl = normalizedMetaTracking.eventSourceUrl;
        confirmUpdate.customerUserAgent = normalizedMetaTracking.userAgent || req.get("user-agent") || null;
      }

      const updatedOrder = await storage.updateOrder(orderId, confirmUpdate);
      if (updatedOrder) {
        order = updatedOrder;
      }

      if (order.stripeTaxCalculationId) {
        try {
          await stripeClient.tax.transactions.createFromCalculation({
            calculation: order.stripeTaxCalculationId,
            reference: orderId,
          });
          console.log(`[TAX] Created tax transaction for order ${orderId}`);
        } catch (taxError: any) {
          console.error(`[TAX] Failed to create tax transaction for order ${orderId}:`, taxError.message);
        }
      }

      if (order.affiliateCode) {
        const sessionId = paymentIntent.metadata?.affiliateSessionId;
        const attributionType = paymentIntent.metadata?.attributionType;
        const metaIsFriendsFamily = paymentIntent.metadata?.isFriendsFamily === "true";
        const commissionResult = await affiliateCommissionService.recordCommission(orderId, {
          sessionId: sessionId || undefined,
          attributionType: attributionType || undefined,
          isFriendsFamily: metaIsFriendsFamily,
        });
        if (commissionResult.success && commissionResult.commissionAmount) {
          console.log(`[PAYMENT] Recorded commission for order ${orderId}`);
        }
      }

      await sendOrderNotification(orderId);
    }

    if (!startedPending && order.status === "paid" && hasMetaTracking) {
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

    // Idempotent enqueue: allows late consent capture on already-paid orders.
    if (order.status === "paid") {
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

    const userId = req.user?.claims?.sub;

    if (affiliate && affiliate.status === "active") {
      const affiliateCustomer = await storage.getCustomer(affiliate.customerId);
      if (affiliateCustomer && normalizeEmail(affiliateCustomer.email) === customerData.email) {
        console.log(`[SELF-REFERRAL] Blocked self-referral in checkout: customer email ${customerData.email} matches affiliate ${affiliate.affiliateCode} owner`);
        affiliate = null;
      }
    }
    
    let existingCustomer = await storage.getCustomerByEmail(customerData.email);
    if (!existingCustomer) {
      existingCustomer = await storage.createCustomer({ ...customerData, userId });
    } else {
      if (affiliate && affiliate.status === "active" && existingCustomer.id === affiliate.customerId) {
        console.log(`[SELF-REFERRAL] Blocked self-referral in checkout: customerId ${existingCustomer.id} is affiliate owner for ${affiliate.affiliateCode}`);
        affiliate = null;
      }
      const updated = await storage.updateCustomer(existingCustomer.id, { 
        ...customerData, 
        userId: existingCustomer.userId || userId 
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
    const resolvedCheckoutProducts: Product[] = [];

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
      resolvedCheckoutProducts.push(product);
    }

    let affiliateDiscountAmount = 0;
    const affSettings = await storage.getAffiliateSettings();
    if (affiliate && affiliate.status === "active") {
      for (let i = 0; i < orderItems.length; i++) {
        const lineTotal = orderItems[i].unitPrice * orderItems[i].quantity;
        affiliateDiscountAmount += computeAffiliateDiscount(resolvedCheckoutProducts[i], lineTotal, affSettings, isFriendsFamily, affiliate, orderItems[i].quantity);
      }
    }

    const discountedSubtotal = Math.max(0, subtotalAmount - affiliateDiscountAmount);
    const totalAmount = discountedSubtotal;

    const checkoutStripeClient = await stripeService.getClient();
    if (!checkoutStripeClient) {
      const order = await storage.createOrder({
        customerId: existingCustomer.id,
        status: "pending",
        subtotalAmount,
        totalAmount,
        notes: "Stripe not configured - manual payment required",
        affiliateCode: affiliate?.affiliateCode,
        affiliateIsFriendsFamily: isFriendsFamily,
        affiliateDiscountAmount: affiliateDiscountAmount > 0 ? affiliateDiscountAmount : null,
      });

      for (const item of orderItems) {
        await storage.createOrderItem({
          orderId: order.id,
          ...item,
        });
      }

      if (affiliate && affiliate.status === "active") {
        const existingReferral = await storage.getAffiliateReferralByOrderId(order.id);
        if (!existingReferral) {
          const commissionRate = affSettings?.commissionRate || 10;
          const commissionAmount = Math.round(subtotalAmount * (commissionRate / 100));
          
          await storage.createAffiliateReferral({
            affiliateId: affiliate.id,
            orderId: order.id,
            orderAmount: subtotalAmount,
            commissionAmount,
            commissionRate,
            status: "pending",
          });
          
          await storage.updateAffiliate(affiliate.id, {
            totalReferrals: affiliate.totalReferrals + 1,
            pendingBalance: affiliate.pendingBalance + commissionAmount,
            totalEarnings: affiliate.totalEarnings + commissionAmount,
          });
        }
      }

      await sendOrderNotification(order.id);

      return res.json({
        success: true,
        orderId: order.id,
        message: "Order created - Stripe not configured for payment processing",
      });
    }

    const lineItems = orderItems.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.productName,
        },
        unit_amount: item.unitPrice,
        tax_behavior: "exclusive" as const,
      },
      quantity: item.quantity,
    }));

    const baseUrl = process.env.BASE_URL || `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;

    const stripeSession = await checkoutStripeClient.checkout.sessions.create({
      line_items: lineItems,
      mode: "payment",
      success_url: `${baseUrl}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}?cancelled=true`,
      customer_email: customerData.email,
      automatic_tax: { enabled: true },
      shipping_address_collection: {
        allowed_countries: ["US"],
      },
      metadata: {
        customerId: existingCustomer.id,
        affiliateCode: affiliate?.affiliateCode || "",
        affiliateId: affiliate?.id || "",
        affiliateSessionId: affiliateSessionId || "",
        attributionType: affiliateCode ? "coupon" : (affiliateSessionId ? "cookie" : "direct"),
        isFriendsFamily: isFriendsFamily ? "true" : "false",
      },
    });

    const order = await storage.createOrder({
      customerId: existingCustomer.id,
      status: "pending",
      subtotalAmount,
      totalAmount,
      stripeSessionId: stripeSession.id,
      affiliateCode: affiliate?.affiliateCode,
      affiliateIsFriendsFamily: isFriendsFamily,
      affiliateDiscountAmount: affiliateDiscountAmount > 0 ? affiliateDiscountAmount : null,
    });

    for (const item of orderItems) {
      await storage.createOrderItem({
        orderId: order.id,
        ...item,
      });
    }

    res.json({
      success: true,
      checkoutUrl: stripeSession.url,
      orderId: order.id,
    });
  } catch (error: any) {
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

export async function sendOrderNotification(orderId: string) {
  try {
    const settings = await storage.getSiteSettings();
    const order = await storage.getOrder(orderId);
    if (!order) return;

    const customer = await storage.getCustomer(order.customerId);
    const items = await storage.getOrderItems(orderId);

    const { customerEmailService } = await import("../../services/customer-email.service");
    const customerEmailResult = await customerEmailService.sendOrderConfirmation(orderId);
    if (customerEmailResult.success) {
      console.log(`Order confirmation email sent to customer for order ${orderId}`);
    } else {
      console.log(`Failed to send customer confirmation email: ${customerEmailResult.error}`);
    }

    const allAdminUsers = await storage.getAdminUsers();
    const fulfillmentEmails = allAdminUsers
      .filter(u => u.role === "fulfillment")
      .map(u => u.email);

    const recipientSet = new Set<string>(fulfillmentEmails);
    if (settings?.orderNotificationEmail) {
      recipientSet.add(settings.orderNotificationEmail);
    }

    const recipients = Array.from(recipientSet);
    if (recipients.length === 0) {
      console.log("No fulfillment team members or admin notification email configured — skipping order notification");
      return;
    }

    if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
      const formData = (await import("form-data")).default;
      const Mailgun = (await import("mailgun.js")).default;
      const mailgun = new Mailgun(formData);
      const mg = mailgun.client({ username: "api", key: process.env.MAILGUN_API_KEY });

      const companyName = settings?.companyName || "Power Plunge";
      let baseUrl = "https://your-domain.replit.app";
      if (process.env.REPLIT_DOMAINS) {
        baseUrl = `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`;
      } else if (process.env.REPLIT_DEV_DOMAIN) {
        baseUrl = `https://${process.env.REPLIT_DEV_DOMAIN}`;
      } else if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
        baseUrl = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
      }
      const adminOrderUrl = `${baseUrl}/admin/orders`;
      const orderDate = new Date(order.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
      const orderTime = new Date(order.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
      const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`;
      const isFreeOrder = !!order.isManualOrder && !order.stripePaymentIntentId;
      const formatOrderTotal = isFreeOrder ? "$0.00" : formatCents(order.totalAmount);

      const itemsHtml = items.map(item => `
            <tr>
              <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 14px;">${item.productName}</td>
              <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #374151; font-size: 14px;">${item.quantity}</td>
              <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #111827; font-weight: 500; font-size: 14px;">${isFreeOrder ? "$0.00" : formatCents(item.unitPrice * item.quantity)}</td>
            </tr>`).join("");

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%); padding: 32px; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">New Order Received</h1>
        <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Order #${order.id.slice(0, 8).toUpperCase()} needs fulfillment</p>
      </div>

      <!-- Content -->
      <div style="padding: 32px;">
        <!-- Order Summary -->
        <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <h3 style="margin: 0 0 12px; color: #111827; font-size: 16px; font-weight: 600;">Order Summary</h3>
          <div style="margin-bottom: 8px;">
            <span style="color: #6b7280; font-size: 14px;">Order Number: </span>
            <span style="color: #111827; font-weight: 600; font-size: 14px;">#${order.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <div style="margin-bottom: 8px;">
            <span style="color: #6b7280; font-size: 14px;">Date: </span>
            <span style="color: #111827; font-size: 14px;">${orderDate} at ${orderTime}</span>
          </div>
          <div>
            <span style="color: #6b7280; font-size: 14px;">Total: </span>
            <span style="color: #111827; font-weight: 700; font-size: 16px;">${formatOrderTotal}</span>
          </div>
        </div>

        <!-- Items to Pack -->
        <h3 style="margin: 0 0 16px; color: #111827; font-size: 16px; font-weight: 600;">Items to Pack</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <thead>
            <tr style="background: #f9fafb;">
              <th style="padding: 10px 16px; text-align: left; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; border-bottom: 2px solid #e5e7eb;">Product</th>
              <th style="padding: 10px 16px; text-align: center; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; border-bottom: 2px solid #e5e7eb;">Qty</th>
              <th style="padding: 10px 16px; text-align: right; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; border-bottom: 2px solid #e5e7eb;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding: 16px; font-weight: 600; color: #111827; font-size: 16px; border-top: 2px solid #e5e7eb;">Order Total</td>
              <td style="padding: 16px; text-align: right; font-weight: 700; color: #111827; font-size: 18px; border-top: 2px solid #e5e7eb;">${formatOrderTotal}</td>
            </tr>
          </tfoot>
        </table>

        <!-- Ship To -->
        <h3 style="margin: 0 0 12px; color: #111827; font-size: 16px; font-weight: 600;">Ship To</h3>
        <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <p style="margin: 0; color: #111827; font-weight: 600; font-size: 14px;">${customer?.name || "N/A"}</p>
          ${customer?.address ? `<p style="margin: 4px 0 0; color: #374151; font-size: 14px;">${customer.address}</p>` : ""}
          ${customer?.city ? `<p style="margin: 4px 0 0; color: #374151; font-size: 14px;">${customer.city}${customer?.state ? `, ${customer.state}` : ""} ${customer?.zipCode || ""}</p>` : ""}
          ${customer?.country && customer.country !== "US" ? `<p style="margin: 4px 0 0; color: #374151; font-size: 14px;">${customer.country}</p>` : ""}
        </div>

        <!-- Customer Contact -->
        <h3 style="margin: 0 0 12px; color: #111827; font-size: 16px; font-weight: 600;">Customer Contact</h3>
        <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          ${customer?.email ? `<div style="margin-bottom: 8px;"><span style="color: #6b7280; font-size: 14px;">Email: </span><a href="mailto:${customer.email}" style="color: #0891b2; text-decoration: none; font-size: 14px;">${customer.email}</a></div>` : ""}
          ${customer?.phone ? `<div><span style="color: #6b7280; font-size: 14px;">Phone: </span><a href="tel:${customer.phone}" style="color: #0891b2; text-decoration: none; font-size: 14px;">${customer.phone}</a></div>` : ""}
        </div>

        <!-- View in Admin Button -->
        <div style="text-align: center; margin: 32px 0;">
          <a href="${adminOrderUrl}" style="display: inline-block; background: #0891b2; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">View Order in Admin</a>
        </div>
      </div>

      <!-- Footer -->
      <div style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0 0 8px; color: #374151; font-size: 13px; font-weight: 500;">${companyName}</p>
        <p style="margin: 0; color: #9ca3af; font-size: 11px;">This is an internal fulfillment notification. Do not forward to customers.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

      await mg.messages.create(process.env.MAILGUN_DOMAIN, {
        from: `${companyName} Orders <orders@${process.env.MAILGUN_DOMAIN}>`,
        to: recipients,
        subject: `New Order #${order.id.slice(0, 8).toUpperCase()} — ${formatOrderTotal} — ${customer?.name || "Unknown"}`,
        html,
      });

      console.log(`Order notification email sent via Mailgun to: ${recipients.join(", ")}`);
    } else {
      console.log("Mailgun not configured, skipping admin email notification");
      console.log(`Order ${orderId} notification would be sent to: ${recipients.join(", ")}`);
    }
  } catch (error) {
    console.error("Failed to send order notification:", error);
  }
}

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
