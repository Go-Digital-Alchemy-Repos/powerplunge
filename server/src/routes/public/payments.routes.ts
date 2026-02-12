import { Router } from "express";
import { storage } from "../../../storage";
import { insertCustomerSchema, type Product, type AffiliateSettings } from "@shared/schema";
import { checkoutLimiter, paymentLimiter } from "../../middleware/rate-limiter";
import { affiliateCommissionService } from "../../services/affiliate-commission.service";
import { normalizeEmail } from "../../services/customer-identity.service";
import { normalizeState } from "@shared/us-states";
import { validateEmail, validatePhone, validateAddress, validateZip, normalizeAddress, type ValidationError } from "@shared/validation";
import { stripeService } from "../../integrations/stripe/StripeService";

const DEFAULT_STRIPE_TAX_CODE = "txcd_99999999";

const TAXABLE_STATES_WARN_ON_ZERO = ["NC"];

function computeAffiliateDiscount(
  product: Product,
  lineTotal: number,
  settings: AffiliateSettings | undefined
): number {
  if (!product.affiliateEnabled) return 0;

  let discountType: string;
  let discountValue: number;

  if (product.affiliateUseGlobalSettings || !product.affiliateDiscountType) {
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
    return Math.min(lineTotal, discountValue);
  }
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
    const affiliate = await storage.getAffiliateByCode(code.toUpperCase());
    if (affiliate && affiliate.status === "active") {
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
    const { items, customer, affiliateCode, billingAddress: billingInput, billingSameAsShipping: billingSame } = req.body;
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
    if (affiliateCode) {
      affiliate = await storage.getAffiliateByCode(affiliateCode);
    } else if (cookieAffiliateId) {
      affiliate = await storage.getAffiliate(cookieAffiliateId);
    }

    const userId = req.user?.claims?.sub;

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
        affiliateDiscountAmount += computeAffiliateDiscount(resolvedProducts[i], lineTotal, affSettings);
      }
    }

    const discountedSubtotal = Math.max(0, subtotalAmount - affiliateDiscountAmount);

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

    const order = await storage.createOrder({
      customerId: existingCustomer.id,
      status: "pending",
      totalAmount,
      subtotalAmount,
      taxAmount: taxAmount > 0 ? taxAmount : null,
      stripeTaxCalculationId: taxCalculationId,
      affiliateCode: affiliate?.affiliateCode,
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
      metadata: {
        orderId: order.id,
        customerId: existingCustomer.id,
        affiliateCode: affiliate?.affiliateCode || "",
        affiliateId: affiliate?.id || "",
        affiliateSessionId: affiliateSessionId || "",
        attributionType: affiliateCode ? "coupon" : (affiliateSessionId ? "cookie" : "direct"),
        taxAmount: taxAmount.toString(),
        taxCalculationId: taxCalculationId || "",
        affiliateDiscountAmount: affiliateDiscountAmount.toString(),
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
    const { orderId, items, customer, billingAddress: billingInput, billingSameAsShipping: billingSame, affiliateCode } = req.body;
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
    if (affiliateCode) {
      affiliate = await storage.getAffiliateByCode(affiliateCode);
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
        affiliateDiscountAmount += computeAffiliateDiscount(repriceProducts[i], lineTotal, affSettings);
      }
    }

    const discountedSubtotal = Math.max(0, subtotalAmount - affiliateDiscountAmount);

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

    await storage.updateOrder(orderId, {
      subtotalAmount,
      taxAmount: taxAmount > 0 ? taxAmount : null,
      totalAmount,
      stripeTaxCalculationId: taxCalculationId,
      affiliateCode: affiliate?.affiliateCode || null,
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
    });

    let clientSecret: string;
    try {
      const updatedIntent = await stripeClient.paymentIntents.update(order.stripePaymentIntentId, {
        amount: totalAmount,
        metadata: {
          orderId: order.id,
          customerId: order.customerId,
          affiliateCode: affiliate?.affiliateCode || "",
          affiliateId: affiliate?.id || "",
          affiliateSessionId: affiliateSessionId || "",
          attributionType: affiliateCode ? "coupon" : (affiliateSessionId ? "cookie" : "direct"),
          taxAmount: taxAmount.toString(),
          taxCalculationId: taxCalculationId || "",
          affiliateDiscountAmount: affiliateDiscountAmount.toString(),
        },
      });
      clientSecret = updatedIntent.client_secret!;
    } catch (updateErr: any) {
      console.log(`[REPRICE] PaymentIntent update failed, recreating: ${updateErr.message}`);
      const newIntent = await stripeClient.paymentIntents.create({
        amount: totalAmount,
        currency: "usd",
        metadata: {
          orderId: order.id,
          customerId: order.customerId,
          affiliateCode: affiliate?.affiliateCode || "",
          affiliateId: affiliate?.id || "",
          affiliateSessionId: affiliateSessionId || "",
          attributionType: affiliateCode ? "coupon" : (affiliateSessionId ? "cookie" : "direct"),
          taxAmount: taxAmount.toString(),
          taxCalculationId: taxCalculationId || "",
          affiliateDiscountAmount: affiliateDiscountAmount.toString(),
        },
      });
      await storage.updateOrder(orderId, { stripePaymentIntentId: newIntent.id });
      clientSecret = newIntent.client_secret!;
    }

    res.json({
      clientSecret,
      orderId: order.id,
      subtotal: subtotalAmount,
      affiliateDiscount: affiliateDiscountAmount,
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
    const { orderId, paymentIntentId } = req.body;

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

    const order = await storage.getOrder(orderId);
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

    if (order.status === "pending") {
      await storage.updateOrder(orderId, { 
        status: "paid",
        stripePaymentIntentId: paymentIntentId,
      });

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
        const commissionResult = await affiliateCommissionService.recordCommission(orderId, {
          sessionId: sessionId || undefined,
          attributionType: attributionType || undefined,
        });
        if (commissionResult.success && commissionResult.commissionAmount) {
          console.log(`[PAYMENT] Recorded commission for order ${orderId}`);
        }
      }

      await sendOrderNotification(orderId);
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
    if (affiliateCode) {
      affiliate = await storage.getAffiliateByCode(affiliateCode);
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
    }

    let affiliateDiscountAmount = 0;
    const affSettings = await storage.getAffiliateSettings();
    if (affiliate && affiliate.status === "active") {
      const discountPercent = affSettings?.customerDiscountPercent || 0;
      if (discountPercent > 0) {
        affiliateDiscountAmount = Math.floor(subtotalAmount * (discountPercent / 100));
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
      payment_method_types: ["card"],
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
      },
    });

    const order = await storage.createOrder({
      customerId: existingCustomer.id,
      status: "pending",
      totalAmount,
      stripeSessionId: stripeSession.id,
      affiliateCode: affiliate?.affiliateCode,
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

      const itemsHtml = items.map(item => `
            <tr>
              <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 14px;">${item.productName}</td>
              <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #374151; font-size: 14px;">${item.quantity}</td>
              <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #111827; font-weight: 500; font-size: 14px;">${formatCents(item.unitPrice * item.quantity)}</td>
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
            <span style="color: #111827; font-weight: 700; font-size: 16px;">${formatCents(order.totalAmount)}</span>
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
              <td style="padding: 16px; text-align: right; font-weight: 700; color: #111827; font-size: 18px; border-top: 2px solid #e5e7eb;">${formatCents(order.totalAmount)}</td>
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
        subject: `New Order #${order.id.slice(0, 8).toUpperCase()} — ${formatCents(order.totalAmount)} — ${customer?.name || "Unknown"}`,
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
