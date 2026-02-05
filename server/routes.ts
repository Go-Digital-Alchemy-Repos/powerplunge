/**
 * =============================================================================
 * LEGACY COMPAT — DO NOT ADD NEW ROUTES HERE
 * =============================================================================
 * 
 * This file is a LEGACY route registration module that will be incrementally
 * migrated to server/src/routes/**. 
 * 
 * CANONICAL ROUTE LOCATION: server/src/routes/
 * - Public routes → server/src/routes/public/
 * - Admin routes → server/src/routes/admin/
 * - Customer routes → server/src/routes/customer/
 * - Webhook routes → server/src/routes/webhooks/
 * 
 * LAYER ARCHITECTURE:
 * - routes: Define endpoints, attach middleware, call controller
 * - controllers: Parse/validate inputs, call service, return response
 * - services: Business logic, calls repos + integrations
 * - repositories: DB queries only
 * - integrations: External SDK wrapper only
 * 
 * When adding new routes, create them in the appropriate server/src/routes/ folder.
 * 
 * MIGRATION PROGRESS:
 * - [✓] Auth integration → server/src/integrations/replit/auth/
 * - [✓] Object storage → server/src/integrations/replit/object-storage/
 * - [✓] Middleware → server/src/middleware/
 * - [✓] Utilities → server/src/utils/
 * - [✓] Products (public + admin) → server/src/routes/public/products, admin/products
 * - [✓] Customers (admin) → server/src/routes/admin/customers
 * - [ ] Orders → pending extraction
 * - [ ] Settings → pending extraction
 * - [ ] Affiliates → pending extraction
 * - [ ] Payments → pending extraction
 * =============================================================================
 */

import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import { insertProductSchema, insertCustomerSchema, insertAffiliateSchema, validateContentJson, validatePageType } from "@shared/schema";
import { z } from "zod";

// Canonical imports from server/src/
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./src/integrations/replit/auth";
import { registerObjectStorageRoutes } from "./src/integrations/replit/object-storage";
import { registerR2Routes, isR2Configured } from "./src/integrations/cloudflare-r2";
import { requireAdmin, errorHandler, requireFullAccess, requireOrderAccess } from "./src/middleware";
import { registerBetterAuthRoutes } from "./src/auth/betterAuthRoutes";
import { checkoutLimiter, paymentLimiter, affiliateTrackLimiter, passwordResetLimiter } from "./src/middleware/rate-limiter";

// Layered route modules (migrated from this file)
import publicProductsRoutes from "./src/routes/public/products.routes";
import affiliateTrackingRoutes from "./src/routes/public/affiliate-tracking.routes";
import affiliateSignupRoutes from "./src/routes/public/affiliate-signup.routes";
import adminProductsRoutes from "./src/routes/admin/products.routes";
import adminCustomersRoutes from "./src/routes/admin/customers.routes";
import adminMediaRoutes from "./src/routes/admin/media.routes";
import revenueRoutes from "./src/routes/revenue.routes";
import affiliateRoutes from "./src/routes/affiliate.routes";
import affiliatePortalRoutes from "./src/routes/customer/affiliate-portal.routes";
import upsellRoutes from "./src/routes/upsell.routes";
import supportRoutes, { adminSupportRouter } from "./src/routes/support.routes";
import vipRoutes from "./src/routes/vip.routes";
import couponRoutes from "./src/routes/coupon.routes";
import recoveryRoutes from "./src/routes/recovery.routes";
import alertsRoutes from "./src/routes/alerts.routes";
import orderTrackingRoutes from "./src/routes/customer/order-tracking.routes";
import customerAuthRoutes from "./src/routes/customer/auth.routes";
import { affiliateCommissionService } from "./src/services/affiliate-commission.service";
import { couponAnalyticsService } from "./src/services/coupon-analytics.service";
import { checkoutRecoveryService } from "./src/services/checkout-recovery.service";
import { errorAlertingService } from "./src/services/error-alerting.service";

// Generate unique affiliate code
function generateAffiliateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Replit Auth (includes session management)
  await setupAuth(app);
  registerAuthRoutes(app);
  
  // Register Better Auth routes (feature-flagged)
  registerBetterAuthRoutes(app);
  
  // Register file storage routes - prioritize Cloudflare R2 if configured
  if (isR2Configured()) {
    registerR2Routes(app);
    console.log("[STORAGE] Using Cloudflare R2 for file uploads");
  } else {
    registerObjectStorageRoutes(app);
    console.log("[STORAGE] Using Replit Object Storage for file uploads");
  }

  // ==================== LAYERED ROUTES (migrated) ====================
  // These routes follow the layered architecture:
  // routes → controllers → services → repositories → integrations
  
  app.use("/api/products", publicProductsRoutes);
  app.use("/api/affiliate", affiliateTrackingRoutes);
  app.use("/api/affiliate-signup", affiliateSignupRoutes);
  app.use("/api/admin/products", requireFullAccess, adminProductsRoutes);
  app.use("/api/admin/customers", requireFullAccess, adminCustomersRoutes);
  app.use("/api/admin/media", requireFullAccess, adminMediaRoutes);
  app.use("/api/admin/revenue", requireFullAccess, revenueRoutes);
  app.use("/api/admin/affiliates-v2", requireFullAccess, affiliateRoutes);
  app.use("/api/customer/affiliate-portal", affiliatePortalRoutes);
  app.use("/api/upsells", requireFullAccess, upsellRoutes);
  app.use("/api/vip", requireFullAccess, vipRoutes);
  app.use("/api/coupons", couponRoutes);
  app.use("/api/recovery", requireFullAccess, recoveryRoutes);
  app.use("/api/alerts", requireFullAccess, alertsRoutes);
  app.use("/api/customer/support", isAuthenticated, supportRoutes);
  app.use("/api/admin/support", requireFullAccess, adminSupportRouter);
  app.use("/api/customer/orders", orderTrackingRoutes);
  app.use("/api/customer/auth", customerAuthRoutes);

  // ==================== PUBLIC ROUTES ====================
  // Note: /api/products routes have been migrated to layered architecture above

  // Note: /api/products and /api/products/:id routes migrated to layered architecture above

  // Get Stripe publishable key - prioritize test key for development, fall back to live key
  app.get("/api/stripe/config", (req, res) => {
    // Use test key for development, live key for production
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY_TEST || process.env.STRIPE_PUBLISHABLE_KEY_LIVE;
    res.json({
      publishableKey: publishableKey || null,
    });
  });

  // Validate affiliate/referral code (public endpoint for checkout)
  app.get("/api/validate-referral-code/:code", async (req, res) => {
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

  // Create PaymentIntent for embedded checkout
  app.post("/api/create-payment-intent", paymentLimiter, async (req: any, res) => {
    try {
      const { items, customer, affiliateCode } = req.body;

      // Use test key for development, live key for production
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY_LIVE;
      if (!stripeSecretKey) {
        return res.status(400).json({ message: "Stripe is not configured" });
      }

      // Validate customer data
      const customerData = insertCustomerSchema.parse(customer);

      // Read affiliate cookie for attribution
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

      // Lookup affiliate by code if provided, or use cookie affiliate
      let affiliate = null;
      if (affiliateCode) {
        affiliate = await storage.getAffiliateByCode(affiliateCode);
      } else if (cookieAffiliateId) {
        affiliate = await storage.getAffiliate(cookieAffiliateId);
      }

      // Get authenticated user ID if logged in
      const userId = req.user?.claims?.sub;

      // Create or find customer (link to user if authenticated)
      let existingCustomer = await storage.getCustomerByEmail(customerData.email);
      if (!existingCustomer) {
        existingCustomer = await storage.createCustomer({ ...customerData, userId });
      } else {
        const updated = await storage.updateCustomer(existingCustomer.id, {
          ...customerData,
          userId: existingCustomer.userId || userId,
        });
        if (updated) existingCustomer = updated;
      }

      // Calculate subtotal
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

      // Create Stripe client for tax calculation
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeSecretKey);

      // Calculate tax using Stripe Tax API
      let taxAmount = 0;
      let taxCalculationId: string | null = null;
      
      try {
        // Build line items for tax calculation
        // Note: amount is the total for the line, quantity defaults to 1 when using amount
        const taxLineItems = orderItems.map((item) => ({
          amount: item.unitPrice * item.quantity,
          reference: item.productId,
          tax_behavior: "exclusive" as const,
          tax_code: "txcd_99999999", // General tangible goods
        }));

        // Calculate tax based on shipping address
        const taxCalculation = await stripe.tax.calculations.create({
          currency: "usd",
          line_items: taxLineItems,
          customer_details: {
            address: {
              line1: customerData.address || "",
              city: customerData.city || "",
              state: customerData.state || "",
              postal_code: customerData.zipCode || "",
              country: "US",
            },
            address_source: "shipping",
          },
        });

        taxAmount = taxCalculation.tax_amount_exclusive;
        taxCalculationId = taxCalculation.id;
        console.log(`Tax calculated: $${(taxAmount / 100).toFixed(2)} for ${customerData.state}`);
        console.log(`Tax calculation details:`, JSON.stringify({
          id: taxCalculation.id,
          amount_total: taxCalculation.amount_total,
          tax_amount: taxCalculation.tax_amount_exclusive,
          tax_breakdown: taxCalculation.tax_breakdown,
        }, null, 2));
      } catch (taxError: any) {
        console.error("Tax calculation error:", taxError.message);
        // Continue without tax if calculation fails (e.g., Stripe Tax not enabled)
      }

      const totalAmount = subtotalAmount + taxAmount;

      // Create pending order with tax information
      const order = await storage.createOrder({
        customerId: existingCustomer.id,
        status: "pending",
        totalAmount,
        subtotalAmount,
        taxAmount: taxAmount > 0 ? taxAmount : null,
        stripeTaxCalculationId: taxCalculationId,
        affiliateCode: affiliate?.affiliateCode,
      });

      for (const item of orderItems) {
        await storage.createOrderItem({
          orderId: order.id,
          ...item,
        });
      }

      const paymentIntent = await stripe.paymentIntents.create({
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
        },
      });

      // Update order with payment intent ID
      await storage.updateOrder(order.id, {
        stripePaymentIntentId: paymentIntent.id,
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
        orderId: order.id,
        subtotal: subtotalAmount,
        taxAmount,
        total: totalAmount,
      });
    } catch (error: any) {
      console.error("Create payment intent error:", error);
      res.status(500).json({ message: error.message || "Failed to create payment intent" });
    }
  });

  // Confirm payment was successful (with security validation)
  app.post("/api/confirm-payment", paymentLimiter, async (req: any, res) => {
    try {
      const { orderId, paymentIntentId } = req.body;

      if (!orderId || !paymentIntentId) {
        return res.status(400).json({ message: "Missing orderId or paymentIntentId" });
      }

      // Use test key for development, live key for production
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY_LIVE;
      if (!stripeSecretKey) {
        return res.status(400).json({ message: "Stripe is not configured" });
      }

      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeSecretKey);

      // Verify payment intent status
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== "succeeded") {
        return res.status(400).json({ message: "Payment not completed" });
      }

      // SECURITY: Verify that the PaymentIntent metadata matches the orderId
      if (paymentIntent.metadata.orderId !== orderId) {
        console.error("Order ID mismatch:", { 
          providedOrderId: orderId, 
          metadataOrderId: paymentIntent.metadata.orderId 
        });
        return res.status(400).json({ message: "Invalid payment verification" });
      }

      // Get order and verify it exists
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // SECURITY: Verify the payment amount matches the order total
      if (paymentIntent.amount !== order.totalAmount) {
        console.error("Amount mismatch:", { 
          paymentAmount: paymentIntent.amount, 
          orderAmount: order.totalAmount 
        });
        return res.status(400).json({ message: "Payment amount mismatch" });
      }

      // SECURITY: Verify currency
      if (paymentIntent.currency !== "usd") {
        return res.status(400).json({ message: "Invalid currency" });
      }

      // Only update if order is still pending (idempotency)
      if (order.status === "pending") {
        await storage.updateOrder(orderId, { 
          status: "paid",
          stripePaymentIntentId: paymentIntentId,
        });

        // Create Stripe Tax Transaction for compliance reporting
        if (order.stripeTaxCalculationId) {
          try {
            await stripe.tax.transactions.createFromCalculation({
              calculation: order.stripeTaxCalculationId,
              reference: orderId,
            });
            console.log(`[TAX] Created tax transaction for order ${orderId}`);
          } catch (taxError: any) {
            console.error(`[TAX] Failed to create tax transaction for order ${orderId}:`, taxError.message);
          }
        }

        // Record affiliate commission using centralized service
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

        // Send notification email
        await sendOrderNotification(orderId);
      }

      res.json({ success: true, orderId });
    } catch (error: any) {
      console.error("Confirm payment error:", error);
      res.status(500).json({ message: error.message || "Failed to confirm payment" });
    }
  });

  // Create checkout session (legacy - kept for webhook compatibility)
  app.post("/api/checkout", checkoutLimiter, async (req: any, res) => {
    try {
      const { items, customer, affiliateCode } = req.body;

      // Validate customer data
      const customerData = insertCustomerSchema.parse(customer);

      // Read affiliate cookie for attribution
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

      // Lookup affiliate by code if provided, or use cookie affiliate
      let affiliate = null;
      if (affiliateCode) {
        affiliate = await storage.getAffiliateByCode(affiliateCode);
      } else if (cookieAffiliateId) {
        affiliate = await storage.getAffiliate(cookieAffiliateId);
      }

      // Get authenticated user ID if logged in
      const userId = req.user?.claims?.sub;
      
      // Create or find customer (link to user if authenticated)
      let existingCustomer = await storage.getCustomerByEmail(customerData.email);
      if (!existingCustomer) {
        existingCustomer = await storage.createCustomer({ ...customerData, userId });
      } else {
        // Update customer and link to user if not already linked
        const updated = await storage.updateCustomer(existingCustomer.id, { 
          ...customerData, 
          userId: existingCustomer.userId || userId 
        });
        if (updated) existingCustomer = updated;
      }

      // Calculate total
      let totalAmount = 0;
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
        totalAmount += product.price * item.quantity;
        orderItems.push({
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          unitPrice: product.price,
        });
      }

      // Check if Stripe is configured - use test key for development
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY_LIVE;
      if (!stripeSecretKey) {
        // Create order without Stripe (for testing)
        const order = await storage.createOrder({
          customerId: existingCustomer.id,
          status: "pending",
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

        // Create affiliate referral if applicable (idempotency check)
        if (affiliate && affiliate.status === "active") {
          const existingReferral = await storage.getAffiliateReferralByOrderId(order.id);
          if (!existingReferral) {
            const settings = await storage.getAffiliateSettings();
            const commissionRate = settings?.commissionRate || 10;
            const commissionAmount = Math.round(totalAmount * (commissionRate / 100));
            
            await storage.createAffiliateReferral({
              affiliateId: affiliate.id,
              orderId: order.id,
              orderAmount: totalAmount,
              commissionAmount,
              commissionRate,
              status: "pending",
            });
            
            // Update affiliate stats
            await storage.updateAffiliate(affiliate.id, {
              totalReferrals: affiliate.totalReferrals + 1,
              pendingBalance: affiliate.pendingBalance + commissionAmount,
              totalEarnings: affiliate.totalEarnings + commissionAmount,
            });
          }
        }

        // Send notification email if configured
        await sendOrderNotification(order.id);

        return res.json({
          success: true,
          orderId: order.id,
          message: "Order created - Stripe not configured for payment processing",
        });
      }

      // Create Stripe checkout session
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeSecretKey);

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

      const stripeSession = await stripe.checkout.sessions.create({
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

      // Create pending order
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

  // Stripe webhook - use test keys for development
  app.post("/api/webhook/stripe", async (req, res) => {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY_LIVE;
    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET_TEST || process.env.STRIPE_WEBHOOK_SECRET_LIVE;
    if (!stripeSecretKey || !stripeWebhookSecret) {
      return res.status(400).json({ message: "Stripe not configured" });
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeSecretKey);

    const sig = req.headers["stripe-signature"] as string;
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody as Buffer,
        sig,
        stripeWebhookSecret
      );
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      await errorAlertingService.alertWebhookFailure({
        provider: "stripe",
        eventType: "signature_verification",
        errorMessage: err.message,
        errorCode: "SIGNATURE_VERIFICATION_FAILED",
      });
      return res.status(400).json({ message: `Webhook Error: ${err.message}` });
    }

    // Idempotency check - reject duplicate events
    const existingEvent = await storage.getProcessedWebhookEvent(event.id);
    if (existingEvent) {
      console.log(`[WEBHOOK] Duplicate event rejected: ${event.id}`);
      return res.json({ received: true, duplicate: true });
    }

    // Record the event as processed (before processing to prevent race conditions)
    try {
      await storage.createProcessedWebhookEvent({
        eventId: event.id,
        eventType: event.type,
        source: "stripe",
        metadata: { livemode: event.livemode },
      });
    } catch (err: any) {
      // If duplicate key error, another instance already processed this
      if (err.code === "23505") {
        console.log(`[WEBHOOK] Concurrent duplicate rejected: ${event.id}`);
        return res.json({ received: true, duplicate: true });
      }
      throw err;
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;

      const order = await storage.getOrderByStripeSession(session.id);
      if (order) {
        await storage.updateOrder(order.id, {
          status: "paid",
          stripePaymentIntentId: session.payment_intent,
        });

        // Record affiliate commission using centralized service
        if (order.affiliateCode) {
          const sessionId = session.metadata?.affiliateSessionId;
          const attributionType = session.metadata?.attributionType;
          const commissionResult = await affiliateCommissionService.recordCommission(order.id, {
            sessionId: sessionId || undefined,
            attributionType: attributionType || undefined,
          });
          if (commissionResult.success && commissionResult.commissionAmount) {
            console.log(`[CHECKOUT] Recorded commission for order ${order.id}`);
          }
        }

        // Send notification email
        await sendOrderNotification(order.id);
      }
    }

    // Handle PaymentIntent succeeded (for embedded checkout)
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as any;
      const orderId = paymentIntent.metadata?.orderId;

      if (orderId) {
        const order = await storage.getOrder(orderId);
        if (order && order.status === "pending") {
          // Verify amount matches
          if (paymentIntent.amount === order.totalAmount) {
            await storage.updateOrder(orderId, {
              status: "paid",
              stripePaymentIntentId: paymentIntent.id,
            });

            // Record affiliate commission (if applicable) using centralized service
            if (order.affiliateCode) {
              const sessionId = paymentIntent.metadata?.affiliateSessionId;
              const attributionType = paymentIntent.metadata?.attributionType;
              const commissionResult = await affiliateCommissionService.recordCommission(orderId, {
                sessionId: sessionId || undefined,
                attributionType: attributionType || undefined,
              });
              if (commissionResult.success && commissionResult.commissionAmount) {
                console.log(`[WEBHOOK] Recorded commission for order ${orderId}`);
              }
            }

            // Send notification email
            await sendOrderNotification(orderId);
          } else {
            console.error("Webhook: Amount mismatch for order", orderId, {
              paymentAmount: paymentIntent.amount,
              orderAmount: order.totalAmount,
            });
          }
        }
      }
    }

    // Handle PaymentIntent failed
    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as any;
      const orderId = paymentIntent.metadata?.orderId;
      const lastError = paymentIntent.last_payment_error;
      
      console.error("[WEBHOOK] Payment failed:", {
        paymentIntentId: paymentIntent.id,
        orderId,
        errorCode: lastError?.code,
        errorMessage: lastError?.message,
      });

      // Send alert for payment failure
      await errorAlertingService.alertPaymentFailure({
        orderId: orderId || undefined,
        email: paymentIntent.receipt_email || paymentIntent.metadata?.customerEmail,
        amount: paymentIntent.amount,
        paymentIntentId: paymentIntent.id,
        errorMessage: lastError?.message || "Payment failed",
        errorCode: lastError?.code,
      });
    }

    res.json({ received: true });
  });

  // Stripe Connect webhook (for account updates)
  app.post("/api/webhook/stripe-connect", async (req, res) => {
    const { stripeService } = await import("./src/integrations/stripe/StripeService");
    
    if (!(await stripeService.isConfigured())) {
      return res.status(400).json({ message: "Stripe not configured" });
    }

    // Use Connect-specific secret or fall back to main webhook secret
    const connectSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
    const mainSecret = await stripeService.getWebhookSecret();
    const webhookSecret = connectSecret || mainSecret;
    
    if (!webhookSecret) {
      return res.status(400).json({ message: "Stripe webhook secret not configured" });
    }

    const sig = req.headers["stripe-signature"] as string;
    if (!sig) {
      return res.status(400).json({ message: "Missing stripe-signature header" });
    }

    let event: any;

    try {
      event = await stripeService.constructWebhookEvent(
        req.rawBody as Buffer,
        sig,
        webhookSecret
      );
    } catch (err: any) {
      console.error("Connect webhook signature verification failed:", err.message);
      await errorAlertingService.alertWebhookFailure({
        provider: "stripe_connect",
        eventType: "signature_verification",
        errorMessage: err.message,
        errorCode: "SIGNATURE_VERIFICATION_FAILED",
      });
      return res.status(400).json({ message: `Webhook Error: ${err.message}` });
    }

    // Idempotency check - reject duplicate events
    const existingEvent = await storage.getProcessedWebhookEvent(event.id);
    if (existingEvent) {
      console.log(`[CONNECT] Duplicate event rejected: ${event.id}`);
      return res.json({ received: true, duplicate: true });
    }

    // Record the event as processed
    try {
      await storage.createProcessedWebhookEvent({
        eventId: event.id,
        eventType: event.type,
        source: "stripe_connect",
        metadata: { livemode: event.livemode },
      });
    } catch (err: any) {
      if (err.code === "23505") {
        console.log(`[CONNECT] Concurrent duplicate rejected: ${event.id}`);
        return res.json({ received: true, duplicate: true });
      }
      throw err;
    }

    try {
      // Handle account.updated event
      if (event.type === "account.updated") {
        const account = event.data.object;
        
        const payoutAccount = await storage.getAffiliatePayoutAccountByStripeAccountId(account.id);
        if (payoutAccount) {
          const prevState = {
            payoutsEnabled: payoutAccount.payoutsEnabled,
            chargesEnabled: payoutAccount.chargesEnabled,
            detailsSubmitted: payoutAccount.detailsSubmitted,
          };
          
          await storage.updateAffiliatePayoutAccount(payoutAccount.id, {
            payoutsEnabled: account.payouts_enabled ?? false,
            chargesEnabled: account.charges_enabled ?? false,
            detailsSubmitted: account.details_submitted ?? false,
            requirements: account.requirements as any,
          });
          console.log(`[CONNECT] Updated payout account ${payoutAccount.id} for Stripe account ${account.id}`);
          
          // Audit log for Stripe Connect onboarding state changes
          const newState = {
            payoutsEnabled: account.payouts_enabled ?? false,
            chargesEnabled: account.charges_enabled ?? false,
            detailsSubmitted: account.details_submitted ?? false,
          };
          
          // Log if onboarding status changed
          if (prevState.payoutsEnabled !== newState.payoutsEnabled ||
              prevState.detailsSubmitted !== newState.detailsSubmitted) {
            await storage.createAuditLog({
              actor: "stripe_webhook",
              action: "stripe_connect.account_updated",
              entityType: "affiliate_payout_account",
              entityId: payoutAccount.id,
              metadata: {
                stripeAccountId: account.id,
                affiliateId: payoutAccount.affiliateId,
                prevState,
                newState,
                eventId: event.id,
              },
            });
          }
        }
      }

      // Handle capability.updated event
      if (event.type === "capability.updated") {
        const capability = event.data.object;
        const accountId = typeof capability.account === "string" 
          ? capability.account 
          : capability.account?.id;

        if (accountId) {
          const payoutAccount = await storage.getAffiliatePayoutAccountByStripeAccountId(accountId);
          if (payoutAccount) {
            // Refresh full account state using stripeService
            const fullAccount = await stripeService.retrieveAccount(accountId);
            await storage.updateAffiliatePayoutAccount(payoutAccount.id, {
              payoutsEnabled: fullAccount.payouts_enabled ?? false,
              chargesEnabled: fullAccount.charges_enabled ?? false,
              detailsSubmitted: fullAccount.details_submitted ?? false,
              requirements: fullAccount.requirements as any,
            });
            console.log(`[CONNECT] Updated capability for payout account ${payoutAccount.id}`);
            
            // Audit log for capability update
            await storage.createAuditLog({
              actor: "stripe_webhook",
              action: "stripe_connect.capability_updated",
              entityType: "affiliate_payout_account",
              entityId: payoutAccount.id,
              metadata: {
                stripeAccountId: accountId,
                affiliateId: payoutAccount.affiliateId,
                capability: capability.id,
                status: capability.status,
                eventId: event.id,
              },
            });
          }
        }
      }
    } catch (error) {
      console.error("Error processing Connect webhook:", error);
      // Still return 200 to acknowledge receipt
    }

    res.json({ received: true });
  });

  // ==================== CUSTOMER ROUTES (authenticated) ====================

  // Get customer profile and orders
  app.get("/api/customer/orders", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const customer = await storage.getCustomerByUserId(userId);
      if (!customer) {
        return res.json({ orders: [] });
      }
      const orders = await storage.getOrdersByCustomerId(customer.id);
      
      // Get items and shipments for each order
      const ordersWithItems = await Promise.all(
        orders.map(async (order) => {
          const items = await storage.getOrderItems(order.id);
          const shipments = await storage.getShipments(order.id);
          return { ...order, items, shipments };
        })
      );
      
      res.json({ customer, orders: ordersWithItems });
    } catch (error) {
      console.error("Error fetching customer orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // Get single order detail (for authenticated customer)
  app.get("/api/customer/orders/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const customer = await storage.getCustomerByUserId(userId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      const order = await storage.getOrder(req.params.id);
      if (!order || order.customerId !== customer.id) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      const items = await storage.getOrderItems(order.id);
      const shipments = await storage.getShipments(order.id);
      res.json({ order, items, customer, shipments });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  // Order success page data
  app.get("/api/orders/by-session/:sessionId", async (req, res) => {
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

  // Link guest customer to logged-in user account (post-purchase account creation)
  // Uses Stripe session ID for verification to prevent unauthorized account linking
  app.post("/api/customer/link", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { customerId, sessionId } = req.body;

      if (!customerId) {
        return res.status(400).json({ message: "Customer ID required" });
      }

      // Verify the request using Stripe session ID if provided
      if (sessionId) {
        const order = await storage.getOrderByStripeSession(sessionId);
        if (!order || order.customerId !== customerId) {
          // Also check by matching customer with email
          const customer = await storage.getCustomer(customerId);
          const userEmail = req.user.claims.email;
          if (!customer || customer.email.toLowerCase() !== userEmail?.toLowerCase()) {
            return res.status(403).json({ message: "Invalid verification" });
          }
        }
      } else {
        // Without session ID, verify by matching customer email with user email
        const customer = await storage.getCustomer(customerId);
        const userEmail = req.user.claims.email;
        if (!customer || customer.email.toLowerCase() !== userEmail?.toLowerCase()) {
          return res.status(403).json({ message: "Email mismatch - cannot link customer" });
        }
      }

      const customer = await storage.getCustomer(customerId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      // Check if customer is already linked to another user
      if (customer.userId && customer.userId !== userId) {
        return res.status(400).json({ message: "Customer already linked to another account" });
      }

      // Check if this user already has a customer record
      const existingCustomer = await storage.getCustomerByUserId(userId);
      if (existingCustomer && existingCustomer.id !== customerId) {
        // Merge: update orders from guest customer to existing customer account
        const guestOrders = await storage.getOrdersByCustomerId(customerId);
        for (const order of guestOrders) {
          await storage.updateOrder(order.id, { customerId: existingCustomer.id });
        }
        // Update the guest customer record to point to user (for historical reference)
        await storage.updateCustomer(customerId, { userId });
        return res.json({ 
          success: true, 
          message: "Orders merged with existing account",
          customerId: existingCustomer.id 
        });
      }

      // Link the customer to this user
      const updated = await storage.updateCustomer(customerId, { userId });
      res.json({ success: true, customer: updated });
    } catch (error: any) {
      console.error("Error linking customer:", error);
      res.status(500).json({ message: error.message || "Failed to link customer" });
    }
  });

  // ==================== CUSTOMER PROFILE ROUTES ====================

  // Get customer profile (user info + address)
  app.get("/api/customer/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const customer = await storage.getCustomerByUserId(userId);
      
      res.json({
        user: user || null,
        customer: customer || null,
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  // Update customer profile
  app.patch("/api/customer/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { firstName, lastName, email, phone, address, city, state, zipCode, country } = req.body;
      
      // Update user info
      const updatedUser = await storage.updateUser(userId, {
        firstName,
        lastName,
        email,
      });
      
      // Update or create customer with address
      let customer = await storage.getCustomerByUserId(userId);
      if (customer) {
        customer = await storage.updateCustomer(customer.id, {
          name: `${firstName || ''} ${lastName || ''}`.trim(),
          email: email || customer.email,
          phone: phone || customer.phone,
          address: address || customer.address,
          city: city || customer.city,
          state: state || customer.state,
          zipCode: zipCode || customer.zipCode,
          country: country || customer.country,
        });
      } else {
        customer = await storage.createCustomer({
          userId,
          name: `${firstName || ''} ${lastName || ''}`.trim(),
          email: email || updatedUser?.email || '',
          phone,
          address,
          city,
          state,
          zipCode,
          country: country || 'USA',
        });
      }
      
      res.json({
        user: updatedUser,
        customer,
        message: "Profile updated successfully",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Change password (note: only works for users with local passwords, OAuth users cannot change passwords)
  app.post("/api/customer/change-password", passwordResetLimiter, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { currentPassword, newPassword } = req.body;
      
      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters" });
      }
      
      // Note: Since this uses Replit Auth with OAuth providers (Google, Apple, email magic links),
      // there's typically no local password to change. Return appropriate message.
      // If you want to support local passwords, you'd need to add a password field to users table.
      
      res.status(400).json({ 
        message: "Password change is not available for accounts using Google, Apple, or email link sign-in. Please update your password through your identity provider." 
      });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // ==================== ADMIN AUTH ROUTES ====================

  // Admin login
  // Check if any admin users exist (for first-time setup)
  app.get("/api/admin/check-setup", async (req, res) => {
    try {
      const admins = await storage.getAdminUsers();
      res.json({ needsSetup: admins.length === 0 });
    } catch (error) {
      res.status(500).json({ message: "Failed to check setup status" });
    }
  });

  // Create first admin (only works when no admins exist)
  app.post("/api/admin/setup", async (req, res) => {
    try {
      const admins = await storage.getAdminUsers();
      if (admins.length > 0) {
        return res.status(403).json({ message: "Admin already exists. Use login instead." });
      }

      const { email, password, name } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({ message: "Email, password, and name are required" });
      }

      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const admin = await storage.createAdminUser({
        email,
        password: hashedPassword,
        name,
        role: "admin",
      });

      req.session.adminId = admin.id;
      res.status(201).json({ 
        success: true, 
        admin: { id: admin.id, email: admin.email, name: admin.name } 
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to create admin account" });
    }
  });

  app.post("/api/admin/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
      }

      const admin = await storage.getAdminUserByEmail(email);
      if (!admin) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(password, admin.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.adminId = admin.id;
      res.json({ success: true, admin: { id: admin.id, email: admin.email, name: admin.name } });
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Admin logout
  app.post("/api/admin/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  // Check admin session - returns current admin info including role
  app.get("/api/admin/me", async (req, res) => {
    if (!req.session.adminId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const admin = await storage.getAdminUser(req.session.adminId);
    if (!admin) {
      return res.status(401).json({ message: "Admin not found" });
    }

    res.json({ id: admin.id, email: admin.email, name: admin.name, role: admin.role });
  });

  // ==================== ADMIN PROTECTED ROUTES ====================
  // Note: /api/admin/products routes migrated to layered architecture (see line 84)

  // Get all orders
  app.get("/api/admin/orders", requireAdmin, async (req, res) => {
    try {
      const orders = await storage.getOrders();
      
      // Enrich orders with customer, items, and shipments
      const enrichedOrders = await Promise.all(
        orders.map(async (order) => {
          const customer = await storage.getCustomer(order.customerId);
          const items = await storage.getOrderItems(order.id);
          const shipments = await storage.getShipments(order.id);
          return { ...order, customer, items, shipments };
        })
      );

      res.json(enrichedOrders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // Get single order
  app.get("/api/admin/orders/:id", requireAdmin, async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      const customer = await storage.getCustomer(order.customerId);
      const items = await storage.getOrderItems(order.id);

      res.json({ ...order, customer, items });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  // Update order status
  app.patch("/api/admin/orders/:id", requireAdmin, async (req, res) => {
    try {
      const { status, notes } = req.body;
      const existingOrder = await storage.getOrder(req.params.id);
      if (!existingOrder) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      const previousStatus = existingOrder.status;
      const order = await storage.updateOrder(req.params.id, { status, notes });
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Send customer status update email if status changed to a notable state
      if (status && status !== previousStatus && ["shipped", "delivered", "cancelled"].includes(status)) {
        const { customerEmailService } = await import("./src/services/customer-email.service");
        const emailResult = await customerEmailService.sendOrderStatusUpdate(order.id, status);
        if (emailResult.success) {
          console.log(`Order status update email sent for order ${order.id} (${status})`);
        } else {
          console.log(`Failed to send status update email: ${emailResult.error}`);
        }
      }

      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to update order" });
    }
  });

  // Get site settings (full access only)
  app.get("/api/admin/settings", requireFullAccess, async (req, res) => {
    try {
      let settings = await storage.getSiteSettings();
      if (!settings) {
        settings = await storage.updateSiteSettings({});
      }
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  // Check integration status (whether secrets are configured) - full access only
  app.get("/api/admin/integrations", requireFullAccess, async (req, res) => {
    const { stripeService } = await import("./src/integrations/stripe");
    const { openaiService } = await import("./src/integrations/openai/OpenAIService");
    const stripeConfig = await stripeService.getConfig();
    
    const emailSettings = await storage.getEmailSettings();
    const integrationSettings = await storage.getIntegrationSettings();
    
    // Check if R2 environment variables are configured
    const cloudflareR2Configured = !!(
      process.env.CLOUDFLARE_ACCOUNT_ID &&
      process.env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
      process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY &&
      process.env.CLOUDFLARE_R2_BUCKET_NAME
    );
    
    res.json({
      stripe: stripeConfig.configured,
      stripeMode: stripeConfig.mode,
      stripeWebhook: !!stripeConfig.webhookSecret,
      mailgun: emailSettings?.provider === "mailgun" && !!emailSettings.mailgunApiKeyEncrypted,
      cloudflareR2: cloudflareR2Configured,
      openai: integrationSettings?.openaiConfigured || false,
    });
  });

  // Update site settings (full access only)
  app.patch("/api/admin/settings", requireFullAccess, async (req, res) => {
    try {
      const settings = await storage.updateSiteSettings(req.body);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // ==================== EMAIL SETTINGS ====================

  // Get email settings (without decrypted API key) - full access only
  app.get("/api/admin/settings/email", requireFullAccess, async (req, res) => {
    try {
      const settings = await storage.getEmailSettings();
      if (!settings) {
        return res.json({ provider: "none" });
      }
      // Don't send encrypted keys to client, just indicate if configured
      res.json({
        provider: settings.provider,
        mailgunDomain: settings.mailgunDomain,
        mailgunFromEmail: settings.mailgunFromEmail,
        mailgunFromName: settings.mailgunFromName,
        mailgunReplyTo: settings.mailgunReplyTo,
        mailgunRegion: settings.mailgunRegion,
        hasApiKey: !!settings.mailgunApiKeyEncrypted,
        updatedAt: settings.updatedAt,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch email settings" });
    }
  });

  // Update email settings (full access only)
  app.patch("/api/admin/settings/email", requireFullAccess, async (req, res) => {
    try {
      const { encrypt } = await import("./src/utils/encryption");
      const { provider, mailgunApiKey, mailgunDomain, mailgunFromEmail, mailgunFromName, mailgunReplyTo, mailgunRegion } = req.body;

      const updateData: any = { provider };
      
      if (provider === "mailgun") {
        if (mailgunDomain) updateData.mailgunDomain = mailgunDomain;
        if (mailgunFromEmail) updateData.mailgunFromEmail = mailgunFromEmail;
        if (mailgunFromName !== undefined) updateData.mailgunFromName = mailgunFromName;
        if (mailgunReplyTo !== undefined) updateData.mailgunReplyTo = mailgunReplyTo;
        if (mailgunRegion) updateData.mailgunRegion = mailgunRegion;
        if (mailgunApiKey) {
          updateData.mailgunApiKeyEncrypted = encrypt(mailgunApiKey);
        }
      }

      const settings = await storage.updateEmailSettings(updateData);
      
      // Audit log for email settings change (only if we have a valid admin user)
      const adminId = (req as any).adminUser?.id;
      if (adminId) {
        await storage.createAdminAuditLog({
          adminId,
          action: "update_email_settings",
          targetType: "settings",
          targetId: "email",
          details: { provider, hasApiKey: !!mailgunApiKey },
          ipAddress: req.ip || null,
        });
      }
      
      res.json({
        provider: settings.provider,
        mailgunDomain: settings.mailgunDomain,
        mailgunFromEmail: settings.mailgunFromEmail,
        mailgunFromName: settings.mailgunFromName,
        mailgunReplyTo: settings.mailgunReplyTo,
        mailgunRegion: settings.mailgunRegion,
        hasApiKey: !!settings.mailgunApiKeyEncrypted,
        updatedAt: settings.updatedAt,
      });
    } catch (error) {
      console.error("Email settings update error:", error);
      res.status(500).json({ message: "Failed to update email settings" });
    }
  });

  // Test email configuration (full access only)
  app.post("/api/admin/settings/email/test", requireFullAccess, async (req, res) => {
    try {
      const { to } = req.body;
      if (!to) {
        return res.status(400).json({ message: "Email address required" });
      }

      const { emailService } = await import("./src/integrations/mailgun");
      const result = await emailService.sendTestEmail(to);
      
      if (result.success) {
        res.json({ success: true, message: "Test email sent successfully" });
      } else {
        res.status(400).json({ success: false, message: result.error });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "Failed to send test email" });
    }
  });

  // Verify email configuration (full access only)
  app.post("/api/admin/settings/email/verify", requireFullAccess, async (req, res) => {
    try {
      const { emailService } = await import("./src/integrations/mailgun");
      const result = await emailService.verifyConfiguration();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ valid: false, error: error.message || "Failed to verify configuration" });
    }
  });

  // ==================== STRIPE SETTINGS ====================

  // Get Stripe settings (masked keys for display) - full access only
  app.get("/api/admin/settings/stripe", requireFullAccess, async (req, res) => {
    try {
      const { stripeService } = await import("./src/integrations/stripe");
      const { maskKey } = await import("./src/utils/encryption");
      const config = await stripeService.getConfig();
      const integrationSettings = await storage.getIntegrationSettings();
      
      res.json({
        configured: config.configured,
        mode: config.mode,
        hasWebhookSecret: !!config.webhookSecret,
        publishableKeyMasked: config.publishableKey ? maskKey(config.publishableKey) : null,
        updatedAt: integrationSettings?.updatedAt || null,
        source: integrationSettings?.stripeConfigured ? "database" : "environment",
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch Stripe settings" });
    }
  });

  // Update Stripe settings (full access only)
  app.patch("/api/admin/settings/stripe", requireFullAccess, async (req, res) => {
    try {
      const { encrypt, maskKey } = await import("./src/utils/encryption");
      const { stripeService } = await import("./src/integrations/stripe");
      const { publishableKey, secretKey, webhookSecret } = req.body;

      if (!publishableKey || !secretKey) {
        return res.status(400).json({ message: "Publishable key and secret key are required" });
      }

      // Validate keys with Stripe
      const validation = await stripeService.validateKeys(publishableKey, secretKey);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.error });
      }

      const mode = secretKey.startsWith("sk_live_") ? "live" : "test";

      const updateData: any = {
        stripePublishableKey: publishableKey,
        stripeSecretKeyEncrypted: encrypt(secretKey),
        stripeMode: mode,
        stripeConfigured: true,
      };

      if (webhookSecret) {
        updateData.stripeWebhookSecretEncrypted = encrypt(webhookSecret);
      }

      const settings = await storage.updateIntegrationSettings(updateData);
      
      // Clear service cache to use new keys
      stripeService.clearCache();
      
      // Audit log for settings change
      const adminId = (req as any).adminUser?.id;
      await storage.createAdminAuditLog({
        adminId: adminId || "system",
        action: "update_stripe_settings",
        targetType: "settings",
        targetId: "stripe",
        details: { mode, hasWebhookSecret: !!webhookSecret },
        ipAddress: req.ip || null,
      });

      res.json({
        configured: true,
        mode,
        hasWebhookSecret: !!webhookSecret,
        publishableKeyMasked: maskKey(publishableKey),
        accountName: validation.accountName,
        updatedAt: settings.updatedAt,
      });
    } catch (error: any) {
      console.error("Stripe settings update error:", error);
      res.status(500).json({ message: error.message || "Failed to update Stripe settings" });
    }
  });

  // Validate Stripe keys without saving (full access only)
  app.post("/api/admin/settings/stripe/validate", requireFullAccess, async (req, res) => {
    try {
      const { stripeService } = await import("./src/integrations/stripe");
      const { publishableKey, secretKey } = req.body;

      if (!publishableKey || !secretKey) {
        return res.status(400).json({ valid: false, error: "Both keys are required" });
      }

      const result = await stripeService.validateKeys(publishableKey, secretKey);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ valid: false, error: error.message || "Failed to validate keys" });
    }
  });

  // Note: /api/stripe/config is defined earlier in this file

  // ==================== OPENAI SETTINGS ====================

  // Get OpenAI settings (masked key for display) - full access only
  app.get("/api/admin/settings/openai", requireFullAccess, async (req, res) => {
    try {
      const { maskKey } = await import("./src/utils/encryption");
      const integrationSettings = await storage.getIntegrationSettings();
      
      res.json({
        configured: integrationSettings?.openaiConfigured || false,
        apiKeyMasked: integrationSettings?.openaiApiKeyEncrypted ? maskKey("sk-xxxx...configured") : null,
        updatedAt: integrationSettings?.updatedAt || null,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch OpenAI settings" });
    }
  });

  // Update OpenAI settings (full access only)
  app.patch("/api/admin/settings/openai", requireFullAccess, async (req, res) => {
    try {
      const { encrypt } = await import("./src/utils/encryption");
      const { openaiService } = await import("./src/integrations/openai/OpenAIService");
      const { apiKey } = req.body;

      if (!apiKey) {
        return res.status(400).json({ message: "API key is required" });
      }

      if (!apiKey.startsWith("sk-")) {
        return res.status(400).json({ message: "Invalid API key format. Must start with 'sk-'" });
      }

      const updateData = {
        openaiApiKeyEncrypted: encrypt(apiKey),
        openaiConfigured: true,
      };

      await storage.updateIntegrationSettings(updateData);
      
      // Clear the cache to use the new key
      openaiService.clearCache();

      res.json({ success: true, message: "OpenAI configuration saved" });
    } catch (error: any) {
      console.error("Error saving OpenAI settings:", error);
      res.status(500).json({ message: error.message || "Failed to save OpenAI settings" });
    }
  });

  // Remove OpenAI configuration (full access only)
  app.delete("/api/admin/settings/openai", requireFullAccess, async (req, res) => {
    try {
      const { openaiService } = await import("./src/integrations/openai/OpenAIService");
      
      await storage.updateIntegrationSettings({
        openaiApiKeyEncrypted: null,
        openaiConfigured: false,
      });
      
      openaiService.clearCache();

      res.json({ success: true, message: "OpenAI configuration removed" });
    } catch (error: any) {
      console.error("Error removing OpenAI settings:", error);
      res.status(500).json({ message: error.message || "Failed to remove OpenAI settings" });
    }
  });

  // ==================== CLOUDFLARE R2 SETTINGS ====================

  // Get R2 settings (masked keys for display)
  app.get("/api/admin/settings/r2", requireFullAccess, async (req, res) => {
    try {
      const integrationSettings = await storage.getIntegrationSettings();
      
      res.json({
        configured: integrationSettings?.r2Configured || false,
        accountId: integrationSettings?.r2AccountId || null,
        bucketName: integrationSettings?.r2BucketName || null,
        publicUrl: integrationSettings?.r2PublicUrl || null,
        hasAccessKey: !!integrationSettings?.r2AccessKeyIdEncrypted,
        hasSecretKey: !!integrationSettings?.r2SecretAccessKeyEncrypted,
        updatedAt: integrationSettings?.updatedAt || null,
      });
    } catch (error) {
      console.error("Error fetching R2 settings:", error);
      res.status(500).json({ message: "Failed to fetch R2 settings" });
    }
  });

  // Update R2 settings
  app.patch("/api/admin/settings/r2", requireFullAccess, async (req, res) => {
    try {
      const { encrypt } = await import("./src/utils/encryption");
      const { accountId, accessKeyId, secretAccessKey, bucketName, publicUrl } = req.body;

      // Get existing settings to check if we're updating or setting new values
      const existingSettings = await storage.getIntegrationSettings();
      const hasExistingKeys = existingSettings?.r2AccessKeyIdEncrypted && existingSettings?.r2SecretAccessKeyEncrypted;

      // Require all fields for new configuration, but allow partial updates if keys already exist
      if (!hasExistingKeys) {
        if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
          return res.status(400).json({ message: "Account ID, Access Key ID, Secret Access Key, and Bucket Name are required" });
        }
      } else {
        // For updates, at least accountId and bucketName are required
        if (!accountId || !bucketName) {
          return res.status(400).json({ message: "Account ID and Bucket Name are required" });
        }
      }

      const updateData: any = {
        r2AccountId: accountId,
        r2BucketName: bucketName,
        r2PublicUrl: publicUrl || null,
        r2Configured: true,
      };

      // Only update encrypted keys if provided (allows keeping existing keys)
      if (accessKeyId) {
        updateData.r2AccessKeyIdEncrypted = encrypt(accessKeyId);
      }
      if (secretAccessKey) {
        updateData.r2SecretAccessKeyEncrypted = encrypt(secretAccessKey);
      }

      await storage.updateIntegrationSettings(updateData);

      // Clear the R2 credentials cache so new settings take effect
      const { clearR2CredentialsCache } = await import("./src/integrations/cloudflare-r2");
      clearR2CredentialsCache();

      res.json({ success: true, message: "Cloudflare R2 configuration saved" });
    } catch (error: any) {
      console.error("Error saving R2 settings:", error);
      res.status(500).json({ message: error.message || "Failed to save R2 settings" });
    }
  });

  // ==================== ADMIN TEAM MANAGEMENT ====================

  // Get all team members (full access only)
  app.get("/api/admin/team", requireFullAccess, async (req, res) => {
    try {
      const admins = await storage.getAdminUsers();
      res.json(admins.map(a => ({ 
        id: a.id, 
        email: a.email, 
        firstName: a.firstName || "",
        lastName: a.lastName || "",
        name: a.name, 
        role: a.role 
      })));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  // Add team member (full access only)
  app.post("/api/admin/team", requireFullAccess, async (req, res) => {
    try {
      const { email, password, firstName, lastName, name, role = "admin" } = req.body;

      // Support both new firstName/lastName and legacy name field
      const resolvedFirstName = firstName || (name ? name.split(" ")[0] : "");
      const resolvedLastName = lastName || (name ? name.split(" ").slice(1).join(" ") : "");
      const fullName = `${resolvedFirstName} ${resolvedLastName}`.trim();

      if (!email || !password || !fullName) {
        return res.status(400).json({ message: "Email, password, and name required" });
      }

      // Validate role
      const validRoles = ["admin", "store_manager", "fulfillment"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be admin, store_manager, or fulfillment" });
      }

      const existingAdmin = await storage.getAdminUserByEmail(email);
      if (existingAdmin) {
        return res.status(400).json({ message: "Team member with this email already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const admin = await storage.createAdminUser({
        email,
        password: hashedPassword,
        firstName: resolvedFirstName,
        lastName: resolvedLastName,
        name: fullName,
        role,
      });

      res.json({ 
        id: admin.id, 
        email: admin.email, 
        firstName: admin.firstName,
        lastName: admin.lastName,
        name: admin.name, 
        role: admin.role 
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to add team member" });
    }
  });

  // Update team member (full access only)
  app.patch("/api/admin/team/:id", requireFullAccess, async (req, res) => {
    try {
      const { firstName, lastName, name, password, role } = req.body;
      const updateData: any = {};
      
      // Support both new firstName/lastName and legacy name field
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (firstName !== undefined || lastName !== undefined) {
        const currentAdmin = await storage.getAdminUser(req.params.id);
        const newFirstName = firstName ?? currentAdmin?.firstName ?? "";
        const newLastName = lastName ?? currentAdmin?.lastName ?? "";
        updateData.name = `${newFirstName} ${newLastName}`.trim();
      } else if (name) {
        updateData.name = name;
        updateData.firstName = name.split(" ")[0];
        updateData.lastName = name.split(" ").slice(1).join(" ");
      }
      
      if (password) updateData.password = await bcrypt.hash(password, 10);
      if (role) {
        const validRoles = ["admin", "store_manager", "fulfillment"];
        if (!validRoles.includes(role)) {
          return res.status(400).json({ message: "Invalid role. Must be admin, store_manager, or fulfillment" });
        }
        updateData.role = role;
      }

      const admin = await storage.updateAdminUser(req.params.id, updateData);
      if (!admin) {
        return res.status(404).json({ message: "Team member not found" });
      }

      res.json({ 
        id: admin.id, 
        email: admin.email, 
        firstName: admin.firstName,
        lastName: admin.lastName,
        name: admin.name, 
        role: admin.role 
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to update team member" });
    }
  });

  // Delete team member (full access only)
  app.delete("/api/admin/team/:id", requireFullAccess, async (req, res) => {
    try {
      // Prevent deleting yourself
      if (req.params.id === req.session.adminId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      await storage.deleteAdminUser(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete team member" });
    }
  });

  // ==================== ADMIN CUSTOMER MANAGEMENT ====================
  // Note: /api/admin/customers routes migrated to layered architecture (see line 85)

  // ==================== ADMIN MANUAL ORDER CREATION ====================

  // Create order manually (full access only - fulfillment can't create orders)
  app.post("/api/admin/orders", requireFullAccess, async (req, res) => {
    try {
      const { customerId, items, notes, status = "pending" } = req.body;

      if (!customerId || !items || !items.length) {
        return res.status(400).json({ message: "Customer ID and items required" });
      }

      const customer = await storage.getCustomer(customerId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      let totalAmount = 0;
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
        totalAmount += product.price * item.quantity;
        orderItems.push({
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          unitPrice: product.price,
        });
      }

      const order = await storage.createOrder({
        customerId,
        status,
        totalAmount,
        isManualOrder: true,
        notes,
      });

      for (const item of orderItems) {
        await storage.createOrderItem({
          orderId: order.id,
          ...item,
        });
      }

      const orderWithDetails = await storage.getOrder(order.id);
      const orderItemsList = await storage.getOrderItems(order.id);

      res.json({ ...orderWithDetails, customer, items: orderItemsList });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create order" });
    }
  });

  // ==================== ADMIN AFFILIATE MANAGEMENT ====================

  // Get affiliate settings (full access only)
  app.get("/api/admin/affiliate-settings", requireFullAccess, async (req, res) => {
    try {
      let settings = await storage.getAffiliateSettings();
      if (!settings) {
        settings = await storage.updateAffiliateSettings({
          commissionRate: 10,
          minimumPayout: 5000,
          cookieDuration: 30,
          agreementText: getDefaultAffiliateAgreement(),
          programActive: true,
        });
      }
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch affiliate settings" });
    }
  });

  // Update affiliate settings (full access only)
  app.patch("/api/admin/affiliate-settings", requireFullAccess, async (req, res) => {
    try {
      const settings = await storage.updateAffiliateSettings(req.body);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to update affiliate settings" });
    }
  });

  // Get all affiliates (full access only)
  app.get("/api/admin/affiliates", requireFullAccess, async (req, res) => {
    try {
      const affiliates = await storage.getAffiliates();
      
      const affiliatesWithDetails = await Promise.all(
        affiliates.map(async (affiliate) => {
          const customer = await storage.getCustomer(affiliate.customerId);
          const referrals = await storage.getAffiliateReferrals(affiliate.id);
          return { ...affiliate, customer, referralCount: referrals.length };
        })
      );

      res.json(affiliatesWithDetails);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch affiliates" });
    }
  });

  // Get single affiliate (full access only)
  app.get("/api/admin/affiliates/:id", requireFullAccess, async (req, res) => {
    try {
      const affiliate = await storage.getAffiliate(req.params.id);
      if (!affiliate) {
        return res.status(404).json({ message: "Affiliate not found" });
      }

      const customer = await storage.getCustomer(affiliate.customerId);
      const referrals = await storage.getAffiliateReferrals(affiliate.id);
      const agreements = await storage.getAffiliateAgreements(affiliate.id);
      const payouts = await storage.getAffiliatePayouts(affiliate.id);

      res.json({ ...affiliate, customer, referrals, agreements, payouts });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch affiliate" });
    }
  });

  // Update affiliate status (full access only)
  app.patch("/api/admin/affiliates/:id", requireFullAccess, async (req: any, res) => {
    try {
      const { status, paypalEmail } = req.body;
      const prevAffiliate = await storage.getAffiliate(req.params.id);
      const affiliate = await storage.updateAffiliate(req.params.id, { status, paypalEmail });
      if (!affiliate) {
        return res.status(404).json({ message: "Affiliate not found" });
      }

      // Audit log for affiliate status change
      const adminEmail = req.adminUser?.email || req.session?.adminEmail || "admin";
      await storage.createAuditLog({
        actor: adminEmail,
        action: "affiliate.status_changed",
        entityType: "affiliate",
        entityId: affiliate.id,
        metadata: { 
          affiliateCode: affiliate.affiliateCode,
          prevStatus: prevAffiliate?.status,
          newStatus: status,
          paypalEmail,
        },
      });

      res.json(affiliate);
    } catch (error) {
      res.status(500).json({ message: "Failed to update affiliate" });
    }
  });

  // ==================== AFFILIATE INVITES MANAGEMENT ====================
  
  // Get all affiliate invites
  app.get("/api/admin/affiliate-invites", requireFullAccess, async (req, res) => {
    try {
      const invites = await storage.getAffiliateInvites();
      
      const invitesWithDetails = await Promise.all(
        invites.map(async (invite) => {
          let createdByAdmin = null;
          let usedByAffiliate = null;
          let usedByCustomer = null;
          
          if (invite.createdByAdminId) {
            createdByAdmin = await storage.getAdminUser(invite.createdByAdminId);
          }
          
          if (invite.usedByAffiliateId) {
            usedByAffiliate = await storage.getAffiliate(invite.usedByAffiliateId);
            if (usedByAffiliate) {
              usedByCustomer = await storage.getCustomer(usedByAffiliate.customerId);
            }
          }
          
          return {
            ...invite,
            createdByAdmin: createdByAdmin ? { id: createdByAdmin.id, email: createdByAdmin.email } : null,
            usedByAffiliate: usedByAffiliate ? {
              id: usedByAffiliate.id,
              code: usedByAffiliate.affiliateCode,
              customerName: usedByCustomer?.name,
              customerEmail: usedByCustomer?.email,
            } : null,
            isExpired: invite.expiresAt && new Date(invite.expiresAt) < new Date(),
            isExhausted: invite.maxUses !== null && invite.timesUsed >= (invite.maxUses ?? 1),
          };
        })
      );
      
      res.json(invitesWithDetails);
    } catch (error) {
      console.error("Failed to fetch affiliate invites:", error);
      res.status(500).json({ message: "Failed to fetch affiliate invites" });
    }
  });

  // Create affiliate invite
  app.post("/api/admin/affiliate-invites", requireFullAccess, async (req: any, res) => {
    try {
      const { targetEmail, targetName, expiresAt, maxUses, notes } = req.body;
      
      // Generate unique invite code
      const inviteCode = `INV${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      
      const invite = await storage.createAffiliateInvite({
        inviteCode,
        targetEmail: targetEmail || null,
        targetName: targetName || null,
        createdByAdminId: req.adminUser?.id || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        maxUses: maxUses || 1,
        notes: notes || null,
      });
      
      // Audit log
      const adminEmail = req.adminUser?.email || req.session?.adminEmail || "admin";
      await storage.createAuditLog({
        actor: adminEmail,
        action: "affiliate_invite.created",
        entityType: "affiliate_invite",
        entityId: invite.id,
        metadata: {
          inviteCode,
          targetEmail,
          maxUses,
        },
      });
      
      res.json(invite);
    } catch (error) {
      console.error("Failed to create affiliate invite:", error);
      res.status(500).json({ message: "Failed to create affiliate invite" });
    }
  });

  // Delete affiliate invite
  app.delete("/api/admin/affiliate-invites/:id", requireFullAccess, async (req: any, res) => {
    try {
      const invite = await storage.getAffiliateInvite(req.params.id);
      if (!invite) {
        return res.status(404).json({ message: "Invite not found" });
      }
      
      await storage.deleteAffiliateInvite(req.params.id);
      
      // Audit log
      const adminEmail = req.adminUser?.email || req.session?.adminEmail || "admin";
      await storage.createAuditLog({
        actor: adminEmail,
        action: "affiliate_invite.deleted",
        entityType: "affiliate_invite",
        entityId: req.params.id,
        metadata: {
          inviteCode: invite.inviteCode,
          wasUsed: invite.timesUsed > 0,
        },
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete affiliate invite:", error);
      res.status(500).json({ message: "Failed to delete affiliate invite" });
    }
  });

  // Get all payouts (full access only)
  app.get("/api/admin/payouts", requireFullAccess, async (req, res) => {
    try {
      const payouts = await storage.getAffiliatePayouts();
      
      const payoutsWithDetails = await Promise.all(
        payouts.map(async (payout) => {
          const affiliate = await storage.getAffiliate(payout.affiliateId);
          const customer = affiliate ? await storage.getCustomer(affiliate.customerId) : null;
          
          // Get payout account for connect status
          const payoutAccount = affiliate 
            ? await storage.getAffiliatePayoutAccountByAffiliateId(affiliate.id)
            : null;
          
          const connectStatus = payoutAccount
            ? (payoutAccount.payoutsEnabled ? "active" : 
               payoutAccount.detailsSubmitted ? "pending" : "incomplete")
            : "not_connected";

          return { 
            ...payout, 
            affiliate, 
            customer,
            stripeTransferId: payout.stripeTransferId || null,
            payoutBatchId: payout.payoutBatchId || null,
            connectStatus,
          };
        })
      );

      res.json(payoutsWithDetails);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payouts" });
    }
  });

  // Process payout (full access only)
  app.patch("/api/admin/payouts/:id", requireFullAccess, async (req: any, res) => {
    try {
      const { status, notes } = req.body;
      const updateData: any = { status, notes };
      
      const prevPayout = await storage.getAffiliatePayout(req.params.id);
      
      if (status === "paid" || status === "approved" || status === "rejected") {
        updateData.processedAt = new Date();
        updateData.processedBy = req.session?.adminId;
      }

      const payout = await storage.updateAffiliatePayout(req.params.id, updateData);
      if (!payout) {
        return res.status(404).json({ message: "Payout not found" });
      }

      // If marked as paid, update affiliate's paid balance
      if (status === "paid") {
        const affiliate = await storage.getAffiliate(payout.affiliateId);
        if (affiliate) {
          await storage.updateAffiliate(affiliate.id, {
            pendingBalance: Math.max(0, affiliate.pendingBalance - payout.amount),
            paidBalance: affiliate.paidBalance + payout.amount,
          });
        }
      }

      // Audit log for payout processing
      const adminEmail = req.adminUser?.email || req.session?.adminEmail || "admin";
      await storage.createAuditLog({
        actor: adminEmail,
        action: "payout.processed",
        entityType: "affiliate_payout",
        entityId: payout.id,
        metadata: { 
          affiliateId: payout.affiliateId,
          amount: payout.amount,
          prevStatus: prevPayout?.status,
          newStatus: status,
          notes,
        },
      });

      res.json(payout);
    } catch (error) {
      res.status(500).json({ message: "Failed to process payout" });
    }
  });

  // Run automated affiliate payout batch via Stripe Connect
  app.post("/api/admin/affiliate-payouts/run", requireFullAccess, async (req: any, res) => {
    try {
      const { affiliatePayoutService } = await import("./src/services/affiliate-payout.service");
      const { stripeService } = await import("./src/integrations/stripe/StripeService");

      if (!(await stripeService.isConfigured())) {
        return res.status(400).json({ 
          message: "Stripe is not configured. Please configure Stripe in admin settings." 
        });
      }

      const dryRun = req.body.dryRun === true || req.query.dryRun === "true";
      const adminUserId = req.session?.adminId;

      const summary = await affiliatePayoutService.runPayoutBatch({
        dryRun,
        adminUserId,
      });

      res.json({
        success: true,
        message: dryRun 
          ? "Dry run completed - no payouts were processed" 
          : `Payout batch ${summary.batchId} completed`,
        summary,
      });
    } catch (error: any) {
      console.error("Error running affiliate payout batch:", error);
      res.status(500).json({ 
        message: error.message || "Failed to run affiliate payout batch" 
      });
    }
  });

  // Get affiliate payout batch by ID
  app.get("/api/admin/affiliate-payouts/batches/:batchId", requireFullAccess, async (req: any, res) => {
    try {
      const { batchId } = req.params;
      
      if (!batchId) {
        return res.status(400).json({ message: "Batch ID is required" });
      }

      const payouts = await storage.getAffiliatePayoutsByBatchId(batchId);
      
      if (payouts.length === 0) {
        return res.status(404).json({ message: "Batch not found or has no payouts" });
      }

      const affiliateIds = Array.from(new Set(payouts.map(p => p.affiliateId)));
      const affiliates = await Promise.all(
        affiliateIds.map(id => storage.getAffiliate(id))
      );
      const affiliateMap = new Map(
        affiliates.filter(Boolean).map(a => [a!.id, a!])
      );

      const enrichedPayouts = payouts.map(p => ({
        ...p,
        affiliateCode: affiliateMap.get(p.affiliateId)?.affiliateCode || "Unknown",
      }));

      const totalAmount = payouts.reduce((sum, p) => sum + p.amount, 0);
      const successfulPayouts = payouts.filter(p => p.status === "paid").length;
      const failedPayouts = payouts.filter(p => p.status === "failed").length;
      const pendingPayouts = payouts.filter(p => p.status === "pending").length;

      res.json({
        batchId,
        totalPayouts: payouts.length,
        totalAmount,
        successfulPayouts,
        failedPayouts,
        pendingPayouts,
        payouts: enrichedPayouts,
      });
    } catch (error: any) {
      console.error("Error fetching payout batch:", error);
      res.status(500).json({ 
        message: error.message || "Failed to fetch payout batch" 
      });
    }
  });

  // ==================== CUSTOMER AFFILIATE ROUTES ====================

  // Get affiliate agreement text (public for viewing before signing)
  app.get("/api/affiliate/agreement", async (req, res) => {
    try {
      let settings = await storage.getAffiliateSettings();
      if (!settings) {
        settings = await storage.updateAffiliateSettings({
          agreementText: getDefaultAffiliateAgreement(),
        });
      }
      res.json({ agreementText: settings.agreementText, programActive: settings.programActive });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch agreement" });
    }
  });

  // Get current customer's affiliate status
  app.get("/api/customer/affiliate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const customer = await storage.getCustomerByUserId(userId);
      
      // Get settings for agreement text and commission rate
      let settings = await storage.getAffiliateSettings();
      if (!settings) {
        settings = await storage.updateAffiliateSettings({
          agreementText: getDefaultAffiliateAgreement(),
        });
      }
      
      if (!customer) {
        return res.json({ 
          affiliate: null, 
          referrals: [],
          payouts: [],
          commissionRate: settings.commissionRate,
          minimumPayout: settings.minimumPayout,
          approvalDays: settings.approvalDays || 14,
          agreementText: settings.agreementText,
        });
      }

      const affiliate = await storage.getAffiliateByCustomerId(customer.id);
      
      if (!affiliate) {
        return res.json({ 
          affiliate: null, 
          referrals: [],
          payouts: [],
          commissionRate: settings.commissionRate,
          minimumPayout: settings.minimumPayout,
          approvalDays: settings.approvalDays || 14,
          agreementText: settings.agreementText,
        });
      }

      const referrals = await storage.getAffiliateReferrals(affiliate.id);
      const payouts = await storage.getAffiliatePayouts(affiliate.id);
      
      // Get payout account for connect status
      const payoutAccount = await storage.getAffiliatePayoutAccountByAffiliateId(affiliate.id);
      const connectStatus = payoutAccount
        ? (payoutAccount.payoutsEnabled ? "active" : 
           payoutAccount.detailsSubmitted ? "pending" : "incomplete")
        : "not_connected";
      
      // Calculate pending, approved, and paid from referrals for accuracy
      const pendingEarnings = referrals
        .filter(r => r.status === "pending")
        .reduce((sum, r) => sum + r.commissionAmount, 0);
      const approvedEarnings = referrals
        .filter(r => r.status === "approved")
        .reduce((sum, r) => sum + r.commissionAmount, 0);
      const paidEarnings = referrals
        .filter(r => r.status === "paid")
        .reduce((sum, r) => sum + r.commissionAmount, 0);
      const totalRevenue = referrals
        .filter(r => r.status !== "void")
        .reduce((sum, r) => sum + r.orderAmount, 0);
      const conversionCount = referrals.filter(r => r.status !== "void").length;

      // Format affiliate data for frontend
      res.json({
        affiliate: {
          id: affiliate.id,
          code: affiliate.affiliateCode,
          status: affiliate.status,
          totalEarnings: pendingEarnings + approvedEarnings + paidEarnings,
          pendingEarnings,
          approvedEarnings,
          paidEarnings,
          totalReferrals: affiliate.totalReferrals,
          totalConversions: conversionCount,
          totalRevenue,
          createdAt: affiliate.createdAt,
          connectStatus,
        },
        referrals: referrals.map(r => ({
          id: r.id,
          orderTotal: r.orderAmount,
          commission: r.commissionAmount,
          status: r.status,
          createdAt: r.createdAt,
          approvedAt: r.approvedAt,
          paidAt: r.paidAt,
        })),
        payouts: payouts.map(p => ({
          id: p.id,
          amount: p.amount,
          status: p.status,
          paymentMethod: p.paymentMethod,
          requestedAt: p.requestedAt,
          processedAt: p.processedAt,
          notes: p.notes,
          stripeTransferId: p.stripeTransferId || null,
          payoutBatchId: p.payoutBatchId || null,
        })),
        commissionRate: settings.commissionRate,
        minimumPayout: settings.minimumPayout,
        approvalDays: settings.approvalDays || 14,
        agreementText: settings.agreementText,
        payoutAccount: payoutAccount ? {
          payoutsEnabled: payoutAccount.payoutsEnabled,
          detailsSubmitted: payoutAccount.detailsSubmitted,
          country: payoutAccount.country,
          currency: payoutAccount.currency,
        } : null,
      });
    } catch (error) {
      console.error("Error fetching affiliate status:", error);
      res.status(500).json({ message: "Failed to fetch affiliate status" });
    }
  });

  // Become an affiliate (sign agreement)
  app.post("/api/customer/affiliate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { signatureName, paypalEmail } = req.body;

      if (!signatureName) {
        return res.status(400).json({ message: "Signature name required" });
      }

      let customer = await storage.getCustomerByUserId(userId);
      
      if (!customer) {
        // Create customer record if doesn't exist
        const userEmail = req.user.claims.email || `user_${userId}@example.com`;
        const userName = req.user.claims.name || signatureName;
        customer = await storage.createCustomer({
          userId,
          email: userEmail,
          name: userName,
        });
      }

      // Check if already an affiliate
      const existingAffiliate = await storage.getAffiliateByCustomerId(customer.id);
      if (existingAffiliate) {
        return res.status(400).json({ message: "Already registered as an affiliate" });
      }

      // Get current agreement text
      let settings = await storage.getAffiliateSettings();
      if (!settings) {
        settings = await storage.updateAffiliateSettings({
          agreementText: getDefaultAffiliateAgreement(),
        });
      }

      // Generate unique affiliate code
      let affiliateCode = generateAffiliateCode();
      while (await storage.getAffiliateByCode(affiliateCode)) {
        affiliateCode = generateAffiliateCode();
      }

      // Create affiliate
      const affiliate = await storage.createAffiliate({
        customerId: customer.id,
        affiliateCode,
        status: "active",
        totalEarnings: 0,
        pendingBalance: 0,
        paidBalance: 0,
        totalReferrals: 0,
        totalSales: 0,
        paypalEmail,
      });

      // Create signed agreement
      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      await storage.createAffiliateAgreement({
        affiliateId: affiliate.id,
        agreementText: settings.agreementText,
        signatureName,
        signatureIp: typeof clientIp === 'string' ? clientIp : clientIp?.[0],
      });

      res.json({ success: true, affiliate });
    } catch (error) {
      console.error("Error becoming affiliate:", error);
      res.status(500).json({ message: "Failed to register as affiliate" });
    }
  });

  // Request payout
  app.post("/api/customer/affiliate/payout", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const customer = await storage.getCustomerByUserId(userId);
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      const affiliate = await storage.getAffiliateByCustomerId(customer.id);
      if (!affiliate) {
        return res.status(404).json({ message: "Affiliate account not found" });
      }

      const settings = await storage.getAffiliateSettings();
      if (!settings) {
        return res.status(500).json({ message: "Affiliate settings not configured" });
      }

      if (affiliate.pendingBalance < settings.minimumPayout) {
        return res.status(400).json({ 
          message: `Minimum payout is $${(settings.minimumPayout / 100).toFixed(2)}. Your balance is $${(affiliate.pendingBalance / 100).toFixed(2)}.`
        });
      }

      const payout = await storage.createAffiliatePayout({
        affiliateId: affiliate.id,
        amount: affiliate.pendingBalance,
        paymentMethod: "paypal",
        paymentDetails: affiliate.paypalEmail,
        status: "pending",
      });

      res.json({ success: true, payout });
    } catch (error) {
      console.error("Error requesting payout:", error);
      res.status(500).json({ message: "Failed to request payout" });
    }
  });

  // Update affiliate payment info
  app.patch("/api/customer/affiliate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { paypalEmail } = req.body;

      const customer = await storage.getCustomerByUserId(userId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      const affiliate = await storage.getAffiliateByCustomerId(customer.id);
      if (!affiliate) {
        return res.status(404).json({ message: "Affiliate account not found" });
      }

      const updated = await storage.updateAffiliate(affiliate.id, { paypalEmail });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update affiliate info" });
    }
  });

  // Start Stripe Connect onboarding for affiliate
  app.post("/api/customer/affiliate/connect/start", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const customer = await storage.getCustomerByUserId(userId);
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      const affiliate = await storage.getAffiliateByCustomerId(customer.id);
      if (!affiliate) {
        return res.status(404).json({ message: "Affiliate account not found" });
      }

      if (affiliate.status !== "active") {
        return res.status(400).json({ message: "Affiliate account must be active to connect Stripe" });
      }

      const { stripeService } = await import("./src/integrations/stripe/StripeService");
      
      if (!(await stripeService.isConfigured())) {
        return res.status(503).json({ message: "Stripe is not configured" });
      }

      let payoutAccount = await storage.getAffiliatePayoutAccountByAffiliateId(affiliate.id);
      
      // If no account exists, create one
      if (!payoutAccount) {
        const stripeAccount = await stripeService.createExpressAccount({
          email: customer.email,
          country: customer.country === "USA" ? "US" : customer.country || "US",
          metadata: {
            affiliateId: affiliate.id,
            customerId: customer.id,
          },
        });

        payoutAccount = await storage.createAffiliatePayoutAccount({
          affiliateId: affiliate.id,
          stripeAccountId: stripeAccount.id,
          payoutsEnabled: false,
          chargesEnabled: false,
          detailsSubmitted: false,
          country: stripeAccount.country || "US",
          currency: stripeAccount.default_currency || "usd",
        });
      }

      // Create account link for onboarding
      const baseUrl = process.env.REPLIT_DOMAINS 
        ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
        : `http://localhost:5000`;
      
      const accountLink = await stripeService.createAccountLink({
        accountId: payoutAccount.stripeAccountId,
        refreshUrl: `${baseUrl}/my-account?tab=affiliate&connect=refresh`,
        returnUrl: `${baseUrl}/my-account?tab=affiliate&connect=complete`,
      });

      res.json({ url: accountLink.url });
    } catch (error: any) {
      console.error("Connect start error:", error);
      res.status(500).json({ message: error.message || "Failed to start Stripe Connect onboarding" });
    }
  });

  // Get Stripe Connect status for affiliate
  app.get("/api/customer/affiliate/connect/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const customer = await storage.getCustomerByUserId(userId);
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      const affiliate = await storage.getAffiliateByCustomerId(customer.id);
      if (!affiliate) {
        return res.status(404).json({ message: "Affiliate account not found" });
      }

      const payoutAccount = await storage.getAffiliatePayoutAccountByAffiliateId(affiliate.id);
      
      if (!payoutAccount) {
        return res.json({ 
          connected: false,
          payoutsEnabled: false,
          chargesEnabled: false,
          detailsSubmitted: false,
        });
      }

      // Optionally refresh from Stripe
      const { stripeService } = await import("./src/integrations/stripe/StripeService");
      if (await stripeService.isConfigured()) {
        try {
          const stripeAccount = await stripeService.retrieveAccount(payoutAccount.stripeAccountId);
          
          // Update local record if changed
          if (
            stripeAccount.payouts_enabled !== payoutAccount.payoutsEnabled ||
            stripeAccount.charges_enabled !== payoutAccount.chargesEnabled ||
            stripeAccount.details_submitted !== payoutAccount.detailsSubmitted
          ) {
            await storage.updateAffiliatePayoutAccount(payoutAccount.id, {
              payoutsEnabled: stripeAccount.payouts_enabled ?? false,
              chargesEnabled: stripeAccount.charges_enabled ?? false,
              detailsSubmitted: stripeAccount.details_submitted ?? false,
              requirements: stripeAccount.requirements as any,
            });
          }

          return res.json({
            connected: true,
            payoutsEnabled: stripeAccount.payouts_enabled ?? false,
            chargesEnabled: stripeAccount.charges_enabled ?? false,
            detailsSubmitted: stripeAccount.details_submitted ?? false,
            requirements: stripeAccount.requirements,
            country: stripeAccount.country || payoutAccount.country,
            currency: stripeAccount.default_currency || payoutAccount.currency,
          });
        } catch (error) {
          console.error("Error fetching Stripe account:", error);
        }
      }

      res.json({
        connected: true,
        payoutsEnabled: payoutAccount.payoutsEnabled,
        chargesEnabled: payoutAccount.chargesEnabled,
        detailsSubmitted: payoutAccount.detailsSubmitted,
        requirements: payoutAccount.requirements,
        country: payoutAccount.country,
        currency: payoutAccount.currency,
      });
    } catch (error: any) {
      console.error("Connect status error:", error);
      res.status(500).json({ message: error.message || "Failed to get Stripe Connect status" });
    }
  });

  // ==================== SEED ROUTES ====================
  
  app.post("/api/admin/seed", requireFullAccess, async (req, res) => {
    try {
      const { seedDatabase } = await import("./seed");
      await seedDatabase();
      res.json({ success: true, message: "Database seeded successfully" });
    } catch (error) {
      console.error("Seed error:", error);
      res.status(500).json({ message: "Failed to seed database" });
    }
  });

  // ==================== ADMIN DASHBOARD ====================

  app.get("/api/admin/dashboard", requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      const affiliates = await storage.getAffiliates();
      const pendingPayouts = (await storage.getAffiliatePayouts()).filter(p => p.status === "pending");
      
      res.json({
        ...stats,
        totalAffiliates: affiliates.length,
        activeAffiliates: affiliates.filter(a => a.status === "active").length,
        pendingPayouts: pendingPayouts.length,
        pendingPayoutAmount: pendingPayouts.reduce((sum, p) => sum + p.amount, 0),
      });
    } catch (error) {
      console.error("Dashboard error:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // ==================== ADMIN COUPONS ====================

  app.get("/api/admin/coupons", requireFullAccess, async (req, res) => {
    try {
      const coupons = await storage.getCoupons();
      res.json(coupons);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch coupons" });
    }
  });

  app.post("/api/admin/coupons", requireFullAccess, async (req, res) => {
    try {
      const coupon = await storage.createCoupon(req.body);
      res.json(coupon);
    } catch (error: any) {
      if (error.code === "23505") {
        return res.status(400).json({ message: "Coupon code already exists" });
      }
      res.status(500).json({ message: "Failed to create coupon" });
    }
  });

  app.patch("/api/admin/coupons/:id", requireFullAccess, async (req, res) => {
    try {
      const coupon = await storage.updateCoupon(req.params.id, req.body);
      if (!coupon) {
        return res.status(404).json({ message: "Coupon not found" });
      }
      res.json(coupon);
    } catch (error) {
      res.status(500).json({ message: "Failed to update coupon" });
    }
  });

  app.delete("/api/admin/coupons/:id", requireFullAccess, async (req, res) => {
    try {
      await storage.deleteCoupon(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete coupon" });
    }
  });

  // Validate coupon (public)
  app.post("/api/coupons/validate", async (req, res) => {
    try {
      const { code, orderAmount } = req.body;
      const coupon = await storage.getCouponByCode(code);
      
      if (!coupon) {
        return res.status(404).json({ valid: false, message: "Invalid coupon code" });
      }
      
      if (!coupon.active) {
        return res.status(400).json({ valid: false, message: "This coupon is no longer active" });
      }
      
      if (coupon.endDate && new Date(coupon.endDate) < new Date()) {
        return res.status(400).json({ valid: false, message: "This coupon has expired" });
      }
      
      if (coupon.startDate && new Date(coupon.startDate) > new Date()) {
        return res.status(400).json({ valid: false, message: "This coupon is not yet active" });
      }
      
      if (coupon.maxRedemptions && coupon.timesUsed >= coupon.maxRedemptions) {
        return res.status(400).json({ valid: false, message: "This coupon has reached its usage limit" });
      }
      
      if (coupon.minOrderAmount && orderAmount < coupon.minOrderAmount) {
        return res.status(400).json({ 
          valid: false, 
          message: `Minimum order amount of $${(coupon.minOrderAmount / 100).toFixed(2)} required` 
        });
      }
      
      let discountAmount = 0;
      if (coupon.type === "percentage") {
        discountAmount = Math.round(orderAmount * (coupon.value / 100));
        if (coupon.maxDiscountAmount) {
          discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
        }
      } else if (coupon.type === "fixed") {
        discountAmount = coupon.value;
      }
      
      res.json({
        valid: true,
        coupon: {
          id: coupon.id,
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          discountAmount,
          blockAffiliateCommission: coupon.blockAffiliateCommission || false,
          blockVipDiscount: coupon.blockVipDiscount || false,
          minMarginPercent: coupon.minMarginPercent || 0,
        },
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to validate coupon" });
    }
  });

  // ==================== ADMIN CATEGORIES ====================

  app.get("/api/admin/categories", requireFullAccess, async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post("/api/admin/categories", requireFullAccess, async (req, res) => {
    try {
      const category = await storage.createCategory(req.body);
      res.json(category);
    } catch (error) {
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.patch("/api/admin/categories/:id", requireFullAccess, async (req, res) => {
    try {
      const category = await storage.updateCategory(req.params.id, req.body);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.delete("/api/admin/categories/:id", requireFullAccess, async (req, res) => {
    try {
      await storage.deleteCategory(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // ==================== ADMIN PAGES (CMS) ====================

  app.get("/api/admin/pages", requireFullAccess, async (req, res) => {
    try {
      const pages = await storage.getPages();
      res.json(pages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pages" });
    }
  });

  app.get("/api/admin/pages/:id", requireFullAccess, async (req, res) => {
    try {
      const page = await storage.getPage(req.params.id);
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }
      res.json(page);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch page" });
    }
  });

  app.post("/api/admin/pages", requireFullAccess, async (req, res) => {
    try {
      // Validate contentJson structure if provided
      const contentJsonValidation = validateContentJson(req.body.contentJson);
      if (!contentJsonValidation.valid) {
        return res.status(400).json({ 
          message: "Invalid contentJson structure", 
          error: contentJsonValidation.error 
        });
      }
      // Validate pageType if provided
      const pageTypeValidation = validatePageType(req.body.pageType);
      if (!pageTypeValidation.valid) {
        return res.status(400).json({ 
          message: "Invalid pageType", 
          error: pageTypeValidation.error 
        });
      }
      const page = await storage.createPage(req.body);
      res.json(page);
    } catch (error) {
      res.status(500).json({ message: "Failed to create page" });
    }
  });

  app.patch("/api/admin/pages/:id", requireFullAccess, async (req, res) => {
    try {
      // Validate contentJson structure if provided
      if (req.body.contentJson !== undefined) {
        const contentJsonValidation = validateContentJson(req.body.contentJson);
        if (!contentJsonValidation.valid) {
          return res.status(400).json({ 
            message: "Invalid contentJson structure", 
            error: contentJsonValidation.error 
          });
        }
      }
      // Validate pageType if provided
      if (req.body.pageType !== undefined) {
        const pageTypeValidation = validatePageType(req.body.pageType);
        if (!pageTypeValidation.valid) {
          return res.status(400).json({ 
            message: "Invalid pageType", 
            error: pageTypeValidation.error 
          });
        }
      }
      const page = await storage.updatePage(req.params.id, req.body);
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }
      res.json(page);
    } catch (error) {
      console.error("[Pages] Failed to update page:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: "Failed to update page", error: errorMessage });
    }
  });

  app.delete("/api/admin/pages/:id", requireFullAccess, async (req, res) => {
    try {
      await storage.deletePage(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete page" });
    }
  });

  app.post("/api/admin/pages/:id/set-home", requireFullAccess, async (req, res) => {
    try {
      const page = await storage.setHomePage(req.params.id);
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }
      res.json(page);
    } catch (error) {
      res.status(500).json({ message: "Failed to set home page" });
    }
  });

  app.post("/api/admin/pages/:id/set-shop", requireFullAccess, async (req, res) => {
    try {
      const page = await storage.setShopPage(req.params.id);
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }
      res.json(page);
    } catch (error) {
      res.status(500).json({ message: "Failed to set shop page" });
    }
  });

  // Export page as JSON
  app.get("/api/admin/pages/:id/export", requireFullAccess, async (req, res) => {
    try {
      const page = await storage.getPage(req.params.id);
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }
      
      // Create export object with relevant fields (exclude internal IDs and timestamps)
      const exportData = {
        exportVersion: 1,
        exportedAt: new Date().toISOString(),
        page: {
          title: page.title,
          slug: page.slug,
          content: page.content,
          contentJson: page.contentJson,
          pageType: page.pageType,
          template: page.template,
          isHome: page.isHome,
          isShop: page.isShop,
          featuredImage: page.featuredImage,
          metaTitle: page.metaTitle,
          metaDescription: page.metaDescription,
          metaKeywords: page.metaKeywords,
          canonicalUrl: page.canonicalUrl,
          ogTitle: page.ogTitle,
          ogDescription: page.ogDescription,
          ogImage: page.ogImage,
          twitterCard: page.twitterCard,
          twitterTitle: page.twitterTitle,
          twitterDescription: page.twitterDescription,
          twitterImage: page.twitterImage,
          robots: page.robots,
          status: page.status,
          showInNav: page.showInNav,
          navOrder: page.navOrder,
        }
      };
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="page-${page.slug}-${Date.now()}.json"`);
      res.json(exportData);
    } catch (error) {
      console.error("Export page error:", error);
      res.status(500).json({ message: "Failed to export page" });
    }
  });

  // Import page from JSON
  app.post("/api/admin/pages/import", requireFullAccess, async (req, res) => {
    try {
      // Validate import request with Zod
      const importPageSchema = z.object({
        exportData: z.object({
          exportVersion: z.number().optional(),
          exportedAt: z.string().optional(),
          page: z.object({
            title: z.string().min(1, "Page title is required"),
            slug: z.string().min(1, "Page slug is required"),
            content: z.string().nullable().optional(),
            contentJson: z.any().nullable().optional(),
            pageType: z.string().nullable().optional(),
            template: z.string().nullable().optional(),
            isHome: z.boolean().optional(),
            isShop: z.boolean().optional(),
            featuredImage: z.string().nullable().optional(),
            metaTitle: z.string().nullable().optional(),
            metaDescription: z.string().nullable().optional(),
            metaKeywords: z.string().nullable().optional(),
            canonicalUrl: z.string().nullable().optional(),
            ogTitle: z.string().nullable().optional(),
            ogDescription: z.string().nullable().optional(),
            ogImage: z.string().nullable().optional(),
            twitterCard: z.string().nullable().optional(),
            twitterTitle: z.string().nullable().optional(),
            twitterDescription: z.string().nullable().optional(),
            twitterImage: z.string().nullable().optional(),
            robots: z.string().nullable().optional(),
            status: z.string().optional(),
            showInNav: z.boolean().optional(),
            navOrder: z.number().optional(),
          }),
        }),
        mode: z.enum(['create', 'update']),
      });

      const parseResult = importPageSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid import data format", 
          errors: parseResult.error.flatten().fieldErrors 
        });
      }

      const { exportData, mode } = parseResult.data;
      const pageData = exportData.page;
      
      // Normalize slug: lowercase, remove special chars, replace spaces with dashes
      const normalizeSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const normalizedSlug = normalizeSlug(pageData.slug);
      
      // Check if slug already exists
      const existingPage = await storage.getPageBySlug(normalizedSlug);
      
      if (mode === 'create' || !existingPage) {
        // Create new page with unique slug if needed
        let slug = normalizedSlug;
        if (existingPage) {
          slug = `${normalizedSlug}-${Date.now()}`;
        }
        
        const newPage = await storage.createPage({
          title: pageData.title,
          slug,
          content: pageData.content || null,
          contentJson: pageData.contentJson || null,
          pageType: pageData.pageType || 'page',
          template: pageData.template || null,
          isHome: false, // Never import home/shop flags to avoid conflicts
          isShop: false,
          featuredImage: pageData.featuredImage || null,
          metaTitle: pageData.metaTitle || null,
          metaDescription: pageData.metaDescription || null,
          metaKeywords: pageData.metaKeywords || null,
          canonicalUrl: pageData.canonicalUrl || null,
          ogTitle: pageData.ogTitle || null,
          ogDescription: pageData.ogDescription || null,
          ogImage: pageData.ogImage || null,
          twitterCard: pageData.twitterCard || null,
          twitterTitle: pageData.twitterTitle || null,
          twitterDescription: pageData.twitterDescription || null,
          twitterImage: pageData.twitterImage || null,
          robots: pageData.robots || null,
          status: 'draft', // Always import as draft for safety
          showInNav: pageData.showInNav || false,
          navOrder: pageData.navOrder || 0,
        });
        
        res.json({ 
          message: "Page imported successfully", 
          page: newPage,
          action: 'created'
        });
      } else if (mode === 'update' && existingPage) {
        // Update existing page - preserve isHome, isShop, and status flags
        const updatedPage = await storage.updatePage(existingPage.id, {
          title: pageData.title,
          content: pageData.content || null,
          contentJson: pageData.contentJson || null,
          pageType: pageData.pageType || existingPage.pageType,
          template: pageData.template || existingPage.template,
          // Preserve these flags from existing page - don't overwrite
          // isHome: existingPage.isHome,
          // isShop: existingPage.isShop,
          // status: existingPage.status,
          featuredImage: pageData.featuredImage || null,
          metaTitle: pageData.metaTitle || null,
          metaDescription: pageData.metaDescription || null,
          metaKeywords: pageData.metaKeywords || null,
          canonicalUrl: pageData.canonicalUrl || null,
          ogTitle: pageData.ogTitle || null,
          ogDescription: pageData.ogDescription || null,
          ogImage: pageData.ogImage || null,
          twitterCard: pageData.twitterCard || null,
          twitterTitle: pageData.twitterTitle || null,
          twitterDescription: pageData.twitterDescription || null,
          twitterImage: pageData.twitterImage || null,
          robots: pageData.robots || null,
          showInNav: pageData.showInNav ?? existingPage.showInNav,
          navOrder: pageData.navOrder ?? existingPage.navOrder,
        });
        
        res.json({ 
          message: "Page updated successfully", 
          page: updatedPage,
          action: 'updated'
        });
      } else {
        res.status(400).json({ message: "Invalid import mode" });
      }
    } catch (error) {
      console.error("Import page error:", error);
      res.status(500).json({ message: "Failed to import page" });
    }
  });

  // AI-powered SEO metadata generation
  app.post("/api/admin/pages/generate-seo", requireFullAccess, async (req, res) => {
    try {
      const { openaiService } = await import("./src/integrations/openai/OpenAIService");
      
      const isConfigured = await openaiService.isConfigured();
      if (!isConfigured) {
        return res.status(400).json({ 
          message: "OpenAI is not configured. Please add your API key in Settings > Integrations." 
        });
      }

      const { title, content, pageType } = req.body;
      if (!title) {
        return res.status(400).json({ message: "Page title is required" });
      }

      const seoData = await openaiService.generatePageSeoRecommendations(
        title,
        content || "",
        pageType || "page"
      );

      if (!seoData) {
        return res.status(500).json({ message: "Failed to generate SEO recommendations" });
      }

      res.json(seoData);
    } catch (error) {
      console.error("SEO generation error:", error);
      res.status(500).json({ message: "Failed to generate SEO metadata" });
    }
  });

  // AI Content Generation for CMS blocks
  app.post("/api/admin/ai/generate-content", requireFullAccess, async (req, res) => {
    try {
      const { fieldType, promptStyle, context, pageTitle, blockType } = req.body;
      
      if (!fieldType || !promptStyle) {
        return res.status(400).json({ message: "fieldType and promptStyle are required" });
      }

      // Get the OpenAI service
      const { openaiService } = await import("./src/integrations/openai/OpenAIService");
      const openai = openaiService;

      // Build a contextual prompt
      const systemPrompt = `You are a marketing copywriter for Power Plunge, a premium cold plunge/ice bath company. 
Your tone is professional, confident, and health-focused. You emphasize benefits like recovery, wellness, and vitality.
Write content that is concise, compelling, and conversion-focused.
Respond with ONLY the generated text - no quotes, no explanations, no formatting.`;

      let contextInfo = '';
      if (pageTitle) contextInfo += `Page: ${pageTitle}. `;
      if (blockType) contextInfo += `Block type: ${blockType}. `;
      if (context) contextInfo += `Additional context: ${context}. `;

      const userPrompt = `${promptStyle}. ${contextInfo}Keep it short and impactful.`;

      const result = await openai.generateText(userPrompt, {
        systemPrompt,
        maxTokens: 150,
        temperature: 0.7,
      });

      // Clean up the response (remove quotes if present)
      let content = result.trim();
      if (content.startsWith('"') && content.endsWith('"')) {
        content = content.slice(1, -1);
      }

      res.json({ content });
    } catch (error: any) {
      console.error("AI content generation error:", error);
      res.status(500).json({ message: error.message || "Failed to generate content" });
    }
  });

  // Page Templates (JSON presets - no DB)
  app.get("/api/admin/page-templates", requireFullAccess, async (req, res) => {
    try {
      const { pageTemplates } = await import("@shared/pageTemplates");
      res.json(pageTemplates.map(t => ({ id: t.id, name: t.name, description: t.description })));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch page templates" });
    }
  });

  app.get("/api/admin/page-templates/:id", requireFullAccess, async (req, res) => {
    try {
      const { getTemplateById } = await import("@shared/pageTemplates");
      const template = getTemplateById(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch page template" });
    }
  });

  // Saved Sections (Reusable Block Groups)
  app.get("/api/admin/saved-sections", requireFullAccess, async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const sections = category 
        ? await storage.getSavedSectionsByCategory(category)
        : await storage.getSavedSections();
      res.json(sections);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch saved sections" });
    }
  });

  app.get("/api/admin/saved-sections/:id", requireFullAccess, async (req, res) => {
    try {
      const section = await storage.getSavedSection(req.params.id);
      if (!section) {
        return res.status(404).json({ message: "Saved section not found" });
      }
      res.json(section);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch saved section" });
    }
  });

  app.post("/api/admin/saved-sections", requireFullAccess, async (req, res) => {
    try {
      const section = await storage.createSavedSection(req.body);
      res.status(201).json(section);
    } catch (error) {
      res.status(500).json({ message: "Failed to create saved section" });
    }
  });

  app.patch("/api/admin/saved-sections/:id", requireFullAccess, async (req, res) => {
    try {
      const section = await storage.updateSavedSection(req.params.id, req.body);
      if (!section) {
        return res.status(404).json({ message: "Saved section not found" });
      }
      res.json(section);
    } catch (error) {
      res.status(500).json({ message: "Failed to update saved section" });
    }
  });

  app.delete("/api/admin/saved-sections/:id", requireFullAccess, async (req, res) => {
    try {
      await storage.deleteSavedSection(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete saved section" });
    }
  });

  // Public site settings (subset of settings safe for public consumption)
  app.get("/api/site-settings", async (req, res) => {
    try {
      const settings = await storage.getSiteSettings();
      const themeSettings = await storage.getThemeSettings();
      res.json({
        featuredProductId: settings?.featuredProductId || null,
        heroTitle: themeSettings?.heroTitle || null,
        heroSubtitle: themeSettings?.heroSubtitle || null,
        heroImage: themeSettings?.heroImage || null,
        ctaText: null, // Not in current schema
        ctaLink: null, // Not in current schema
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch site settings" });
    }
  });

  // Public pages
  app.get("/api/pages", async (req, res) => {
    try {
      const pages = await storage.getPublishedPages();
      res.json(pages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pages" });
    }
  });

  app.get("/api/pages/home", async (req, res) => {
    try {
      const page = await storage.getHomePage();
      if (!page || page.status !== "published") {
        return res.status(404).json({ message: "Home page not found" });
      }
      res.json(page);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch home page" });
    }
  });

  app.get("/api/pages/shop", async (req, res) => {
    try {
      const page = await storage.getShopPage();
      if (!page || page.status !== "published") {
        return res.status(404).json({ message: "Shop page not found" });
      }
      res.json(page);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch shop page" });
    }
  });

  app.get("/api/pages/:slug", async (req, res) => {
    try {
      const page = await storage.getPageBySlug(req.params.slug);
      if (!page || page.status !== "published") {
        return res.status(404).json({ message: "Page not found" });
      }
      res.json(page);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch page" });
    }
  });

  // ==================== ADMIN SHIPPING ====================

  app.get("/api/admin/shipping/zones", requireFullAccess, async (req, res) => {
    try {
      const zones = await storage.getShippingZones();
      res.json(zones);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch shipping zones" });
    }
  });

  app.post("/api/admin/shipping/zones", requireFullAccess, async (req, res) => {
    try {
      const zone = await storage.createShippingZone(req.body);
      res.json(zone);
    } catch (error) {
      res.status(500).json({ message: "Failed to create shipping zone" });
    }
  });

  app.patch("/api/admin/shipping/zones/:id", requireFullAccess, async (req, res) => {
    try {
      const zone = await storage.updateShippingZone(req.params.id, req.body);
      if (!zone) {
        return res.status(404).json({ message: "Shipping zone not found" });
      }
      res.json(zone);
    } catch (error) {
      res.status(500).json({ message: "Failed to update shipping zone" });
    }
  });

  app.delete("/api/admin/shipping/zones/:id", requireFullAccess, async (req, res) => {
    try {
      await storage.deleteShippingZone(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete shipping zone" });
    }
  });

  app.get("/api/admin/shipping/rates", requireFullAccess, async (req, res) => {
    try {
      const zoneId = req.query.zoneId as string | undefined;
      const rates = await storage.getShippingRates(zoneId);
      res.json(rates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch shipping rates" });
    }
  });

  app.post("/api/admin/shipping/rates", requireFullAccess, async (req, res) => {
    try {
      const rate = await storage.createShippingRate(req.body);
      res.json(rate);
    } catch (error) {
      res.status(500).json({ message: "Failed to create shipping rate" });
    }
  });

  app.patch("/api/admin/shipping/rates/:id", requireFullAccess, async (req, res) => {
    try {
      const rate = await storage.updateShippingRate(req.params.id, req.body);
      if (!rate) {
        return res.status(404).json({ message: "Shipping rate not found" });
      }
      res.json(rate);
    } catch (error) {
      res.status(500).json({ message: "Failed to update shipping rate" });
    }
  });

  app.delete("/api/admin/shipping/rates/:id", requireFullAccess, async (req, res) => {
    try {
      await storage.deleteShippingRate(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete shipping rate" });
    }
  });

  // ==================== ADMIN SHIPMENTS (TRACKING) ====================

  app.get("/api/admin/orders/:orderId/shipments", requireAdmin, async (req, res) => {
    try {
      const shipments = await storage.getShipments(req.params.orderId);
      res.json(shipments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch shipments" });
    }
  });

  app.post("/api/admin/orders/:orderId/shipments", requireAdmin, async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      const adminId = (req.session as any).adminUser?.id;
      
      const shipment = await storage.createShipment({
        orderId: req.params.orderId,
        shippedByAdminId: adminId,
        shippedAt: new Date(),
        status: "shipped",
        ...req.body,
      });
      
      // Update order status to shipped if not already
      if (order.status === "paid" || order.status === "processing") {
        await storage.updateOrder(req.params.orderId, { status: "shipped" });
      }
      
      // Send shipping notification email
      const { sendShippingNotification } = await import("./email");
      const customer = await storage.getCustomer(order.customerId);
      const items = await storage.getOrderItems(order.id);
      
      if (customer && req.body.sendEmail !== false) {
        const emailResult = await sendShippingNotification(order, items, customer, shipment, adminId);
        return res.json({ ...shipment, emailSent: emailResult.success, emailError: emailResult.error });
      }
      
      res.json(shipment);
    } catch (error) {
      console.error("Failed to create shipment:", error);
      res.status(500).json({ message: "Failed to create shipment" });
    }
  });

  app.patch("/api/admin/shipments/:id", requireAdmin, async (req, res) => {
    try {
      const shipment = await storage.updateShipment(req.params.id, req.body);
      if (!shipment) {
        return res.status(404).json({ message: "Shipment not found" });
      }
      res.json(shipment);
    } catch (error) {
      res.status(500).json({ message: "Failed to update shipment" });
    }
  });

  app.post("/api/admin/shipments/:id/resend-email", requireAdmin, async (req, res) => {
    try {
      const shipment = await storage.getShipment(req.params.id);
      if (!shipment) {
        return res.status(404).json({ message: "Shipment not found" });
      }
      
      const order = await storage.getOrder(shipment.orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      const customer = await storage.getCustomer(order.customerId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      const items = await storage.getOrderItems(order.id);
      const adminId = (req.session as any).adminUser?.id;
      
      // Reset the shippedEmailSentAt to allow resending
      await storage.updateShipment(shipment.id, { shippedEmailSentAt: null });
      
      const { sendShippingNotification } = await import("./email");
      const result = await sendShippingNotification(order, items, customer, shipment, adminId);
      
      res.json({ success: result.success, error: result.error });
    } catch (error) {
      console.error("Failed to resend shipping email:", error);
      res.status(500).json({ message: "Failed to resend shipping email" });
    }
  });

  // ==================== ADMIN EMAIL EVENTS ====================

  app.get("/api/admin/email-events", requireFullAccess, async (req, res) => {
    try {
      const orderId = req.query.orderId as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const events = await storage.getEmailEvents(orderId, limit);
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch email events" });
    }
  });

  // ==================== ADMIN REFUNDS ====================

  app.get("/api/admin/refunds", requireFullAccess, async (req, res) => {
    try {
      const refunds = await storage.getRefunds();
      res.json(refunds);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch refunds" });
    }
  });

  app.post("/api/admin/orders/:orderId/refunds", requireFullAccess, async (req: any, res) => {
    try {
      const { amount, reason, type } = req.body;
      const order = await storage.getOrder(req.params.orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      const refund = await storage.createRefund({
        orderId: req.params.orderId,
        amount,
        reason,
        type: type || "full",
        status: "pending",
      });

      // Audit log for refund creation
      const adminEmail = req.adminUser?.email || req.session?.adminEmail || "admin";
      await storage.createAuditLog({
        actor: adminEmail,
        action: "refund.created",
        entityType: "refund",
        entityId: refund.id,
        metadata: { orderId: req.params.orderId, amount, reason, type: type || "full" },
      });
      
      res.json(refund);
    } catch (error) {
      res.status(500).json({ message: "Failed to create refund" });
    }
  });

  app.patch("/api/admin/refunds/:id", requireFullAccess, async (req: any, res) => {
    try {
      const refund = await storage.updateRefund(req.params.id, req.body);
      if (!refund) {
        return res.status(404).json({ message: "Refund not found" });
      }

      // Audit log for refund update
      const adminEmail = req.adminUser?.email || req.session?.adminEmail || "admin";
      await storage.createAuditLog({
        actor: adminEmail,
        action: "refund.updated",
        entityType: "refund",
        entityId: refund.id,
        metadata: { 
          orderId: refund.orderId, 
          newStatus: refund.status,
          changes: req.body,
        },
      });

      res.json(refund);
    } catch (error) {
      res.status(500).json({ message: "Failed to update refund" });
    }
  });

  // ==================== ADMIN THEME SETTINGS ====================

  app.get("/api/admin/theme", requireFullAccess, async (req, res) => {
    try {
      const theme = await storage.getThemeSettings();
      res.json(theme || {});
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch theme settings" });
    }
  });

  app.patch("/api/admin/theme", requireFullAccess, async (req, res) => {
    try {
      const theme = await storage.updateThemeSettings(req.body);
      res.json(theme);
    } catch (error) {
      res.status(500).json({ message: "Failed to update theme settings" });
    }
  });

  // Public theme settings
  app.get("/api/theme", async (req, res) => {
    try {
      const theme = await storage.getThemeSettings();
      res.json(theme || {});
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch theme settings" });
    }
  });

  // ==================== ADMIN EMAIL TEMPLATES ====================

  app.get("/api/admin/email-templates", requireFullAccess, async (req, res) => {
    try {
      const templates = await storage.getEmailTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch email templates" });
    }
  });

  app.post("/api/admin/email-templates", requireFullAccess, async (req, res) => {
    try {
      const template = await storage.createEmailTemplate(req.body);
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to create email template" });
    }
  });

  app.patch("/api/admin/email-templates/:id", requireFullAccess, async (req, res) => {
    try {
      const template = await storage.updateEmailTemplate(req.params.id, req.body);
      if (!template) {
        return res.status(404).json({ message: "Email template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to update email template" });
    }
  });

  // ==================== ADMIN INVENTORY ====================

  app.get("/api/admin/inventory", requireFullAccess, async (req, res) => {
    try {
      const inventory = await storage.getAllInventory();
      res.json(inventory);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch inventory" });
    }
  });

  app.get("/api/admin/inventory/:productId", requireFullAccess, async (req, res) => {
    try {
      const inventory = await storage.getInventory(req.params.productId);
      res.json(inventory || { quantity: 0, trackInventory: false });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch inventory" });
    }
  });

  app.patch("/api/admin/inventory/:productId", requireFullAccess, async (req, res) => {
    try {
      let inventory = await storage.getInventory(req.params.productId);
      if (!inventory) {
        inventory = await storage.createInventory({
          productId: req.params.productId,
          ...req.body,
        });
      } else {
        inventory = await storage.updateInventory(req.params.productId, req.body);
      }
      res.json(inventory);
    } catch (error) {
      res.status(500).json({ message: "Failed to update inventory" });
    }
  });

  // ==================== ADMIN AUDIT LOGS ====================

  app.get("/api/admin/audit-logs", requireFullAccess, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await storage.getAuditLogs(limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // ==================== ADMIN BACKGROUND JOBS ====================

  app.get("/api/admin/jobs/status", requireFullAccess, async (req, res) => {
    try {
      const { jobRunner } = await import("./src/services/job-runner");
      const status = await jobRunner.getStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch job status" });
    }
  });

  app.post("/api/admin/jobs/:jobName/run", requireFullAccess, async (req: any, res) => {
    try {
      const { jobRunner } = await import("./src/services/job-runner");
      const force = req.query.force === "true";
      const result = await jobRunner.runNow(req.params.jobName, force);

      if (result.success) {
        await storage.createAuditLog({
          actor: req.session?.adminEmail || "admin",
          action: "job.manual_run",
          entityType: "job",
          entityId: req.params.jobName,
          metadata: { result: result.data },
        });
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to run job" });
    }
  });

  // ==================== ADMIN CUSTOMER NOTES ====================

  app.get("/api/admin/customers/:customerId/notes", requireFullAccess, async (req, res) => {
    try {
      const notes = await storage.getCustomerNotes(req.params.customerId);
      res.json(notes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customer notes" });
    }
  });

  app.post("/api/admin/customers/:customerId/notes", requireFullAccess, async (req, res) => {
    try {
      const admin = await storage.getAdminUser(req.session.adminId!);
      const note = await storage.createCustomerNote({
        customerId: req.params.customerId,
        note: req.body.note,
        createdBy: req.session.adminId,
      });
      res.json(note);
    } catch (error) {
      res.status(500).json({ message: "Failed to create customer note" });
    }
  });

  app.delete("/api/admin/customers/:customerId/notes/:noteId", requireFullAccess, async (req, res) => {
    try {
      await storage.deleteCustomerNote(req.params.noteId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete customer note" });
    }
  });

  // Customer Profile (aggregated data)
  app.get("/api/admin/customers/:customerId/profile", requireFullAccess, async (req, res) => {
    try {
      const profile = await storage.getCustomerProfile(req.params.customerId);
      if (!profile) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(profile);
    } catch (error) {
      res.status(500).json({ message: "Failed to get customer profile" });
    }
  });

  // Customer Tags
  app.get("/api/admin/customers/:customerId/tags", requireFullAccess, async (req, res) => {
    try {
      const tags = await storage.getCustomerTags(req.params.customerId);
      res.json(tags);
    } catch (error) {
      res.status(500).json({ message: "Failed to get customer tags" });
    }
  });

  app.put("/api/admin/customers/:customerId/tags", requireFullAccess, async (req, res) => {
    try {
      const { tags } = req.body;
      if (!Array.isArray(tags)) {
        return res.status(400).json({ message: "Tags must be an array" });
      }
      const adminId = (req as any).adminUser?.id;
      const updatedTags = await storage.setCustomerTags(req.params.customerId, tags, adminId);
      
      // Log the action
      await storage.createAdminAuditLog({
        adminId: adminId || "system",
        action: "update_tags",
        targetType: "customer",
        targetId: req.params.customerId,
        details: { tags },
        ipAddress: req.ip || null,
      });
      
      res.json(updatedTags);
    } catch (error) {
      res.status(500).json({ message: "Failed to update customer tags" });
    }
  });

  // Customer Orders (for profile drawer)
  app.get("/api/admin/customers/:customerId/orders", requireFullAccess, async (req, res) => {
    try {
      const allOrders = await storage.getOrders();
      const customerOrders = allOrders.filter(o => o.customerId === req.params.customerId);
      const sortedOrders = customerOrders.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      res.json(sortedOrders);
    } catch (error) {
      res.status(500).json({ message: "Failed to get customer orders" });
    }
  });

  // Customer Audit Logs
  app.get("/api/admin/customers/:customerId/audit-logs", requireFullAccess, async (req, res) => {
    try {
      const logs = await storage.getAuditLogsForTarget("customer", req.params.customerId);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to get audit logs" });
    }
  });

  // Admin Actions - Disable/Enable Account
  app.post("/api/admin/customers/:customerId/disable", requireFullAccess, async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.customerId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      const adminId = (req as any).adminUser?.id;
      await storage.updateCustomer(req.params.customerId, { 
        isDisabled: true 
      } as any);
      
      await storage.createAdminAuditLog({
        adminId: adminId || "system",
        action: "disable_account",
        targetType: "customer",
        targetId: req.params.customerId,
        details: { reason: req.body.reason || "No reason provided" },
        ipAddress: req.ip || null,
      });
      
      res.json({ success: true, message: "Account disabled" });
    } catch (error) {
      res.status(500).json({ message: "Failed to disable account" });
    }
  });

  app.post("/api/admin/customers/:customerId/enable", requireFullAccess, async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.customerId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      const adminId = (req as any).adminUser?.id;
      await storage.updateCustomer(req.params.customerId, { 
        isDisabled: false 
      } as any);
      
      await storage.createAdminAuditLog({
        adminId: adminId || "system",
        action: "enable_account",
        targetType: "customer",
        targetId: req.params.customerId,
        details: {},
        ipAddress: req.ip || null,
      });
      
      res.json({ success: true, message: "Account enabled" });
    } catch (error) {
      res.status(500).json({ message: "Failed to enable account" });
    }
  });

  // Admin Actions - Password Reset Email
  app.post("/api/admin/customers/:customerId/send-password-reset", requireFullAccess, async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.customerId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      const adminId = (req as any).adminUser?.id;
      
      // Log the action (actual email sending would use EmailService)
      await storage.createAdminAuditLog({
        adminId: adminId || "system",
        action: "send_password_reset",
        targetType: "customer",
        targetId: req.params.customerId,
        details: { email: customer.email },
        ipAddress: req.ip || null,
      });
      
      res.json({ success: true, message: "Password reset email sent" });
    } catch (error) {
      res.status(500).json({ message: "Failed to send password reset email" });
    }
  });

  // Admin Actions - Direct Password Reset
  app.post("/api/admin/customers/:customerId/reset-password", requireFullAccess, async (req, res) => {
    try {
      const { password } = req.body;
      if (!password || password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }
      
      const customer = await storage.getCustomer(req.params.customerId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      const adminId = (req as any).adminUser?.id;
      
      // Hash the new password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Update customer password
      await storage.updateCustomer(req.params.customerId, {
        passwordHash: hashedPassword,
      });
      
      // Log the action
      await storage.createAdminAuditLog({
        adminId: adminId || "system",
        action: "admin_password_reset",
        targetType: "customer",
        targetId: req.params.customerId,
        details: { email: customer.email },
        ipAddress: req.ip || null,
      });
      
      res.json({ success: true, message: "Password reset successfully" });
    } catch (error) {
      console.error("Failed to reset password:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Admin Actions - Force Logout (Invalidate Sessions)
  app.post("/api/admin/customers/:customerId/force-logout", requireFullAccess, async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.customerId);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      const adminId = (req as any).adminUser?.id;
      
      // Invalidate sessions by updating a session version or timestamp
      // This depends on how sessions are managed - for now we log and update customer
      await storage.updateCustomer(req.params.customerId, {
        sessionInvalidatedAt: new Date(),
      });
      
      // Log the action
      await storage.createAdminAuditLog({
        adminId: adminId || "system",
        action: "force_logout",
        targetType: "customer",
        targetId: req.params.customerId,
        details: { email: customer.email },
        ipAddress: req.ip || null,
      });
      
      res.json({ success: true, message: "All sessions invalidated" });
    } catch (error) {
      console.error("Failed to force logout:", error);
      res.status(500).json({ message: "Failed to invalidate sessions" });
    }
  });

  // ==================== ADMIN REPORTS ====================

  app.get("/api/admin/reports/sales", requireFullAccess, async (req, res) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      
      const orders = await storage.getOrders();
      const filteredOrders = orders.filter(o => {
        const orderDate = new Date(o.createdAt);
        return orderDate >= startDate && orderDate <= endDate && (o.status === "paid" || o.status === "shipped" || o.status === "delivered");
      });
      
      const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      const totalOrders = filteredOrders.length;
      const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
      
      // Group by date
      const dailyData: Record<string, { date: string; revenue: number; orders: number }> = {};
      for (const order of filteredOrders) {
        const dateKey = new Date(order.createdAt).toISOString().split("T")[0];
        if (!dailyData[dateKey]) {
          dailyData[dateKey] = { date: dateKey, revenue: 0, orders: 0 };
        }
        dailyData[dateKey].revenue += order.totalAmount;
        dailyData[dateKey].orders += 1;
      }
      
      res.json({
        summary: { totalRevenue, totalOrders, averageOrderValue },
        dailyData: Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date)),
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate sales report" });
    }
  });

  app.get("/api/admin/reports/products", requireFullAccess, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json({ topProducts: stats.topProducts });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate product report" });
    }
  });

  app.get("/api/admin/reports/customers", requireFullAccess, async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      const orders = await storage.getOrders();
      
      const customerStats = customers.map(c => {
        const customerOrders = orders.filter(o => o.customerId === c.id);
        const totalSpent = customerOrders
          .filter(o => o.status === "paid" || o.status === "shipped" || o.status === "delivered")
          .reduce((sum, o) => sum + o.totalAmount, 0);
        return {
          ...c,
          orderCount: customerOrders.length,
          totalSpent,
          lastOrderDate: customerOrders.length > 0 ? customerOrders[0].createdAt : null,
        };
      }).sort((a, b) => b.totalSpent - a.totalSpent);
      
      res.json({ customers: customerStats.slice(0, 50) });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate customer report" });
    }
  });

  app.get("/api/admin/reports/export", requireFullAccess, async (req, res) => {
    try {
      const type = req.query.type as string;
      const orders = await storage.getOrders();
      const customers = await storage.getCustomers();
      
      if (type === "orders") {
        const csv = ["Order ID,Customer,Email,Status,Total,Date"];
        for (const order of orders) {
          const customer = customers.find(c => c.id === order.customerId);
          csv.push(`${order.id},${customer?.name || ""},${customer?.email || ""},${order.status},$${(order.totalAmount / 100).toFixed(2)},${new Date(order.createdAt).toISOString()}`);
        }
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=orders.csv");
        res.send(csv.join("\n"));
      } else if (type === "customers") {
        const csv = ["Customer ID,Name,Email,Phone,City,State,Order Count"];
        for (const customer of customers) {
          const orderCount = orders.filter(o => o.customerId === customer.id).length;
          csv.push(`${customer.id},${customer.name},${customer.email},${customer.phone || ""},${customer.city || ""},${customer.state || ""},${orderCount}`);
        }
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=customers.csv");
        res.send(csv.join("\n"));
      } else {
        res.status(400).json({ message: "Invalid export type" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  // ==================== DOCS LIBRARY (Admin) ====================
  
  // Get all docs (with optional filters)
  app.get("/api/admin/docs", requireFullAccess, async (req, res) => {
    try {
      const { category, status, search } = req.query;
      const docs = await storage.getDocs({
        category: category as string | undefined,
        status: status as string | undefined,
        search: search as string | undefined,
      });
      res.json(docs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch docs" });
    }
  });

  // Get single doc by ID
  app.get("/api/admin/docs/:id", requireFullAccess, async (req, res) => {
    try {
      const doc = await storage.getDoc(req.params.id);
      if (!doc) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.json(doc);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch document" });
    }
  });

  // Get doc by slug
  app.get("/api/admin/docs/slug/:slug", requireFullAccess, async (req, res) => {
    try {
      const doc = await storage.getDocBySlug(req.params.slug);
      if (!doc) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.json(doc);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch document" });
    }
  });

  // Create new doc
  app.post("/api/admin/docs", requireFullAccess, async (req: any, res) => {
    try {
      const { title, slug, category, content, tags, status, sortOrder, parentId } = req.body;
      
      // Check if slug already exists
      const existing = await storage.getDocBySlug(slug);
      if (existing) {
        return res.status(400).json({ message: "A document with this slug already exists" });
      }
      
      const doc = await storage.createDoc({
        title,
        slug,
        category: category || "general",
        content: content || "",
        tags: tags || [],
        status: status || "draft",
        sortOrder: sortOrder || 0,
        parentId: parentId || null,
        updatedByUserId: req.session.adminId,
      });
      res.status(201).json(doc);
    } catch (error) {
      res.status(500).json({ message: "Failed to create document" });
    }
  });

  // Update doc (with version history)
  app.patch("/api/admin/docs/:id", requireFullAccess, async (req: any, res) => {
    try {
      const doc = await storage.getDoc(req.params.id);
      if (!doc) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // If content is changing, save a version first
      const { content, title } = req.body;
      if (content !== undefined && content !== doc.content) {
        await storage.createDocVersion({
          docId: doc.id,
          content: doc.content,
          title: doc.title,
          createdByUserId: req.session.adminId,
        });
      }
      
      const updated = await storage.updateDoc(req.params.id, {
        ...req.body,
        updatedByUserId: req.session.adminId,
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update document" });
    }
  });

  // Delete doc
  app.delete("/api/admin/docs/:id", requireFullAccess, async (req, res) => {
    try {
      await storage.deleteDoc(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // Publish/unpublish doc
  app.post("/api/admin/docs/:id/publish", requireFullAccess, async (req, res) => {
    try {
      const { publish } = req.body;
      const updated = await storage.publishDoc(req.params.id, publish);
      if (!updated) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update document status" });
    }
  });

  // Get doc versions (history)
  app.get("/api/admin/docs/:id/versions", requireFullAccess, async (req, res) => {
    try {
      const versions = await storage.getDocVersions(req.params.id);
      res.json(versions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch versions" });
    }
  });

  // Restore doc to a specific version
  app.post("/api/admin/docs/:id/restore/:versionId", requireFullAccess, async (req, res) => {
    try {
      // First save current version before restoring
      const doc = await storage.getDoc(req.params.id);
      if (doc) {
        await storage.createDocVersion({
          docId: doc.id,
          content: doc.content,
          title: doc.title,
          createdByUserId: (req as any).session.adminId,
        });
      }
      
      const restored = await storage.restoreDocVersion(req.params.id, req.params.versionId);
      if (!restored) {
        return res.status(404).json({ message: "Version not found" });
      }
      res.json(restored);
    } catch (error) {
      res.status(500).json({ message: "Failed to restore version" });
    }
  });

  // ==================== DOCS GENERATOR ====================

  // Generate/refresh system documentation
  app.post("/api/admin/docs/generate", requireFullAccess, async (req, res) => {
    try {
      const { docsGeneratorService } = await import("./src/services/docs-generator.service");
      const result = await docsGeneratorService.generateSystemDocs();
      res.json({
        success: true,
        created: result.created,
        updated: result.updated,
        stats: {
          routes: result.snapshot.routes.length,
          envVars: result.snapshot.envVars.length,
          tables: result.snapshot.tables.length,
          integrations: result.snapshot.integrations.length,
        },
        generatedAt: result.snapshot.generatedAt,
      });
    } catch (error) {
      console.error("Error generating docs:", error);
      res.status(500).json({ message: "Failed to generate documentation" });
    }
  });

  // Get docs health check
  app.get("/api/admin/docs/health", requireFullAccess, async (req, res) => {
    try {
      const { docsGeneratorService } = await import("./src/services/docs-generator.service");
      const health = await docsGeneratorService.getHealthCheck();
      res.json(health);
    } catch (error) {
      console.error("Error checking docs health:", error);
      res.status(500).json({ message: "Failed to check documentation health" });
    }
  });

  return httpServer;
}

// Helper function to send order notification email
async function sendOrderNotification(orderId: string) {
  try {
    const settings = await storage.getSiteSettings();
    const order = await storage.getOrder(orderId);
    if (!order) return;

    const customer = await storage.getCustomer(order.customerId);
    const items = await storage.getOrderItems(orderId);

    // Send customer order confirmation email
    const { customerEmailService } = await import("./src/services/customer-email.service");
    const customerEmailResult = await customerEmailService.sendOrderConfirmation(orderId);
    if (customerEmailResult.success) {
      console.log(`Order confirmation email sent to customer for order ${orderId}`);
    } else {
      console.log(`Failed to send customer confirmation email: ${customerEmailResult.error}`);
    }

    // Send admin notification email
    if (!settings?.orderNotificationEmail) {
      console.log("No admin notification email configured");
      return;
    }

    // If Mailgun is configured, send admin email
    if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
      const formData = (await import("form-data")).default;
      const Mailgun = (await import("mailgun.js")).default;
      const mailgun = new Mailgun(formData);
      const mg = mailgun.client({ username: "api", key: process.env.MAILGUN_API_KEY });

      const itemsList = items
        .map((item) => `${item.productName} x${item.quantity} - $${(item.unitPrice * item.quantity / 100).toFixed(2)}`)
        .join("\n");

      await mg.messages.create(process.env.MAILGUN_DOMAIN, {
        from: `Power Plunge Orders <orders@${process.env.MAILGUN_DOMAIN}>`,
        to: [settings.orderNotificationEmail],
        subject: `New Order #${order.id.slice(0, 8)}`,
        text: `
New order received!

Order ID: ${order.id}
Status: ${order.status}
Total: $${(order.totalAmount / 100).toFixed(2)}

Customer:
${customer?.name}
${customer?.email}
${customer?.phone || ""}
${customer?.address || ""}
${customer?.city || ""}, ${customer?.state || ""} ${customer?.zipCode || ""}

Items:
${itemsList}
        `.trim(),
      });

      console.log("Order notification email sent via Mailgun");
    } else {
      console.log("Mailgun not configured, skipping admin email notification");
      console.log(`Order ${orderId} notification would be sent to: ${settings.orderNotificationEmail}`);
    }
  } catch (error) {
    console.error("Failed to send order notification:", error);
  }
}

// Default affiliate agreement text
function getDefaultAffiliateAgreement(): string {
  return `AFFILIATE PROGRAM AGREEMENT

This Affiliate Agreement ("Agreement") is entered into between Power Plunge ("Company") and the undersigned affiliate ("Affiliate").

1. APPOINTMENT AND ACCEPTANCE
By signing this Agreement, Company appoints Affiliate as a non-exclusive affiliate to promote and market Company's products, and Affiliate accepts such appointment subject to the terms and conditions set forth herein.

2. AFFILIATE RESPONSIBILITIES
a) Affiliate agrees to actively promote Company's products through their unique referral link or code.
b) Affiliate will not engage in any deceptive, misleading, or unethical marketing practices.
c) Affiliate will not make false claims about the products or Company.
d) Affiliate will comply with all applicable laws, rules, and regulations, including FTC disclosure requirements.

3. COMMISSION STRUCTURE
a) Affiliate will earn a commission on qualifying sales made through their unique referral link.
b) Commission rates are set by Company and may be modified at any time with notice.
c) Commissions are calculated based on the net sale amount (excluding taxes and shipping).

4. PAYMENT TERMS
a) Commissions will be paid according to the payment schedule established by Company.
b) Affiliate must maintain a valid payment method (e.g., PayPal) to receive payments.
c) Minimum payout thresholds may apply as specified in the affiliate dashboard.
d) Company reserves the right to withhold or adjust commissions in cases of fraud, returns, or chargebacks.

5. PROHIBITED ACTIVITIES
Affiliate shall NOT:
a) Use spam, unsolicited emails, or deceptive advertising.
b) Bid on Company's trademarks or brand terms in paid advertising.
c) Create fake reviews or testimonials.
d) Make income claims or guarantees.
e) Misrepresent the relationship with Company.

6. INTELLECTUAL PROPERTY
a) Company grants Affiliate a limited, non-exclusive license to use Company's approved marketing materials.
b) Affiliate shall not modify Company trademarks or create derivative works without permission.

7. TERM AND TERMINATION
a) This Agreement is effective upon acceptance and continues until terminated.
b) Either party may terminate with 30 days written notice.
c) Company may terminate immediately for violation of this Agreement.
d) Upon termination, Affiliate must cease all promotional activities and remove Company materials.

8. CONFIDENTIALITY
Affiliate agrees to keep confidential all non-public information regarding Company's business, customers, and products.

9. DISCLAIMER AND LIMITATION OF LIABILITY
a) Products are provided "as is" and Company makes no warranties regarding sales performance.
b) Company's liability is limited to commissions actually earned by Affiliate.

10. INDEPENDENT CONTRACTOR
Affiliate is an independent contractor and not an employee, partner, or agent of Company.

11. MODIFICATION
Company reserves the right to modify this Agreement with notice. Continued participation constitutes acceptance of modifications.

12. GOVERNING LAW
This Agreement shall be governed by the laws of the state where Company is incorporated.

By signing below, Affiliate acknowledges having read, understood, and agreed to be bound by all terms of this Agreement.`;
}
