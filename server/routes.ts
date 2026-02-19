import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { readFileSync } from "fs";
import { pool } from "./db";
import { validateEnv } from "./src/config/env-validation";
import { storage } from "./storage";

// Canonical imports from server/src/
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./src/integrations/replit/auth";
import { runtime } from "./src/config/runtime";
import { setupLocalDevAuth, setupAuthDisabledRoutes } from "./src/config/local-auth-stub";
import { registerObjectStorageRoutes } from "./src/integrations/replit/object-storage";
import { registerR2Routes, isR2Configured } from "./src/integrations/cloudflare-r2";
import { requireAdmin, errorHandler, requireFullAccess, requireOrderAccess } from "./src/middleware";
import { registerBetterAuthRoutes } from "./src/auth/betterAuthRoutes";
import { affiliateTrackLimiter } from "./src/middleware/rate-limiter";

// Previously-migrated route modules
import publicProductsRoutes from "./src/routes/public/products.routes";
import affiliateTrackingRoutes from "./src/routes/public/affiliate-tracking.routes";
import affiliateSignupRoutes from "./src/routes/public/affiliate-signup.routes";
import adminProductsRoutes from "./src/routes/admin/products.routes";
import adminCustomersRoutes from "./src/routes/admin/customers.routes";
import adminMediaRoutes from "./src/routes/admin/media.routes";
import revenueRoutes from "./src/routes/admin/revenue.routes";
import affiliateRoutes from "./src/routes/admin/affiliates-v2.routes";
import affiliatePortalRoutes from "./src/routes/customer/affiliate-portal.routes";
import upsellRoutes from "./src/routes/admin/upsells.routes";
import supportRoutes, { adminSupportRouter } from "./src/routes/admin/support.routes";
import adminSupportSettingsRoutes from "./src/routes/admin/support-settings.routes";
import docsRouter from "./src/routes/admin/docs.router";
import cmsRouter from "./src/routes/admin/cms.router";
import cmsSidebarsRouter from "./src/routes/admin/cms-sidebars.routes";
import cmsMenusRoutes from "./src/routes/admin/cms-menus.routes";
import siteSettingsRouter from "./src/routes/admin/cms-site-settings.routes";
import cmsPostsRouter from "./src/routes/admin/cms-posts-v2.routes";
import vipRoutes from "./src/routes/admin/vip.routes";
import couponRoutes from "./src/routes/admin/coupon-analytics.routes";
import recoveryRoutes from "./src/routes/admin/recovery.routes";
import alertsRoutes from "./src/routes/admin/alerts.routes";
import orderTrackingRoutes from "./src/routes/customer/order-tracking.routes";
import customerAuthRoutes from "./src/routes/customer/auth.routes";
import publicOrderStatusRoutes from "./src/routes/public/order-status.routes";
import publicCmsPagesRoutes from "./src/routes/public/cms-pages.routes";
import publicCmsThemeRoutes from "./src/routes/public/cms-theme.routes";
import publicCmsSettingsRoutes from "./src/routes/public/cms-settings.routes";
import publicCmsSectionsRoutes from "./src/routes/public/cms-sections.routes";
import publicCmsSidebarsRoutes from "./src/routes/public/cms-sidebars.routes";
import { publicMenuRoutes } from "./src/routes/public/blog.routes";
import publicBlogRoutes from "./src/routes/public/blog-v2.routes";
import publicGoogleReviewsRoutes from "./src/routes/public/google-reviews.routes";
import publicNewsletterRoutes from "./src/routes/public/newsletter.routes";
import publicContactRoutes from "./src/routes/public/contact.routes";

// Newly-extracted route modules
import paymentsRoutes from "./src/routes/public/payments.routes";
import stripeWebhookRoutes from "./src/routes/webhooks/stripe.routes";
import twilioWebhookRoutes from "./src/routes/webhooks/twilio.routes";
import mailgunInboundRoutes from "./src/routes/webhooks/mailgun-inbound.routes";
import customerProfileRoutes from "./src/routes/customer/profile.routes";
import customerAffiliateRoutes, { publicAffiliateRoutes } from "./src/routes/customer/affiliates.routes";
import adminAuthRoutes from "./src/routes/admin/auth.routes";
import adminOrdersRoutes from "./src/routes/admin/orders.routes";
import adminSettingsRoutes, { integrationsStatusRoutes } from "./src/routes/admin/settings.routes";
import adminIntegrationsSocialRoutes from "./src/routes/admin/integrations-social.routes";
import adminTeamRoutes from "./src/routes/admin/team.routes";
import adminAffiliatesRoutes from "./src/routes/admin/affiliates.routes";
import adminCouponsRoutes, { publicCouponRoutes } from "./src/routes/admin/coupons.routes";
import adminCategoriesRoutes from "./src/routes/admin/categories.routes";
import adminShippingRoutes, { shipmentRoutes, shipmentManagementRoutes } from "./src/routes/admin/shipping.routes";
import adminOperationsRoutes, { refundOrderRoutes, dashboardRoutes } from "./src/routes/admin/operations.routes";
import adminCustomerMgmtRoutes from "./src/routes/admin/customer-management.routes";
import adminReportsRoutes from "./src/routes/admin/reports.routes";
import adminAnalyticsRoutes from "./src/routes/admin/analytics.routes";
import adminNotificationsRoutes from "./src/routes/admin/notifications.routes";
import customerNotificationsRoutes from "./src/routes/customer/notifications.routes";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup auth: Replit OIDC when on Replit, local stub or disabled otherwise
  if (runtime.shouldEnableReplitOIDC) {
    await setupAuth(app);
    registerAuthRoutes(app);
  } else if (runtime.enableDevAuth) {
    setupLocalDevAuth(app);
  } else {
    setupAuthDisabledRoutes(app);
  }
  
  // Register Better Auth routes (feature-flagged)
  registerBetterAuthRoutes(app);
  
  // Register file storage routes
  // R2 routes always registered; credentials checked per-request (supports env vars or database config)
  registerR2Routes(app);
  // Also register Object Storage routes as fallback
  registerObjectStorageRoutes(app);
  console.log("[STORAGE] R2 and Object Storage routes registered (R2 credentials checked per-request)");

  // ==================== OPERATIONAL ENDPOINTS ====================
  let pkgVersion = "0.0.0";
  try {
    const pkg = JSON.parse(readFileSync("package.json", "utf-8"));
    pkgVersion = pkg.version || "0.0.0";
  } catch {}


  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/ready", async (_req, res) => {
    const issues: string[] = [];

    const envResult = validateEnv();
    for (const { name } of envResult.missing) {
      issues.push(`missing required env var: ${name}`);
    }

    if (process.env.DATABASE_URL) {
      try {
        const result = await pool.query("SELECT 1");
        if (!result) issues.push("database query returned no result");
      } catch (err: any) {
        issues.push(`database unreachable: ${err.message || "unknown error"}`);
      }
    }

    if (issues.length > 0) {
      return res.status(503).json({ ready: false, issues });
    }
    res.json({ ready: true });
  });

  app.get("/version", (_req, res) => {
    res.json({
      version: pkgVersion,
      commit: process.env.COMMIT_SHA || "unknown",
      buildTime: process.env.BUILD_TIME || "unknown",
    });
  });

  // ==================== LAYERED ROUTES (previously migrated) ====================
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
  app.use("/api/admin/support/settings", requireFullAccess, adminSupportSettingsRoutes);
  app.use("/api/admin/support", requireAdmin, adminSupportRouter);
  app.use("/api/admin/docs", requireFullAccess, docsRouter);
  app.use("/api/admin/cms", requireFullAccess, cmsPostsRouter);
  app.use("/api/admin/cms", requireFullAccess, cmsRouter);
  app.use("/api/admin/cms/menus", requireFullAccess, cmsMenusRoutes);
  app.use("/api/admin/cms/sidebars", requireFullAccess, cmsSidebarsRouter);
  app.use("/api/admin/cms/site-settings", requireFullAccess, siteSettingsRouter);
  app.use("/api/customer/orders", orderTrackingRoutes);
  app.use("/api/customer/auth", customerAuthRoutes);
  app.use("/api/customer/notifications", customerNotificationsRoutes);
  app.use("/api/admin/notifications", adminNotificationsRoutes);
  app.use("/api/orders", publicOrderStatusRoutes);

  // CMS routes (public)
  app.use("/api/pages", publicCmsPagesRoutes);
  app.use("/api/theme", publicCmsThemeRoutes);
  app.use("/api/site-settings", publicCmsSettingsRoutes);
  app.use("/api/sections", publicCmsSectionsRoutes);
  app.use("/api/sidebars", publicCmsSidebarsRoutes);

  // Public blog + menu routes (additive, no auth)
  app.use("/api/blog", publicBlogRoutes);
  app.use("/api/menus", publicMenuRoutes);
  app.use("/api/google-reviews", publicGoogleReviewsRoutes);
  app.use("/api/newsletter", publicNewsletterRoutes);
  app.use("/api/contact", publicContactRoutes);

  app.get("/api/health/config", (req, res) => {
    res.json({ cmsEnabled: true });
  });

  if (process.env.NODE_ENV !== "production") {
    const { getTimingReport, resetTimings } = await import("./src/middleware/server-timing.middleware");
    app.get("/api/health/timings", (req, res) => {
      const report = getTimingReport();
      res.json({ top10: report.slice(0, 10), all: report });
    });
    app.post("/api/health/timings/reset", (req, res) => {
      resetTimings();
      res.json({ ok: true });
    });
  }

  // ==================== NEWLY-EXTRACTED ROUTES ====================

  // Public routes (no auth)
  app.use("/api", paymentsRoutes);
  app.use("/api/webhook", stripeWebhookRoutes);
  app.use("/api/webhooks/twilio", twilioWebhookRoutes);
  app.use("/api/webhooks/mailgun", mailgunInboundRoutes);
  app.use("/api/affiliate", publicAffiliateRoutes);
  app.use("/api/coupons", publicCouponRoutes);

  // Customer routes (isAuthenticated)
  app.use("/api/customer", isAuthenticated, customerProfileRoutes);
  app.use("/api/customer", isAuthenticated, customerAffiliateRoutes);

  // Admin auth routes (no middleware - handles own auth)
  app.use("/api/admin", adminAuthRoutes);

  // Admin routes (requireAdmin - accessible by all admin roles)
  app.use("/api/admin/orders", requireAdmin, adminOrdersRoutes);
  app.use("/api/admin/orders", requireAdmin, shipmentRoutes);
  app.use("/api/admin/dashboard", requireAdmin, dashboardRoutes);
  app.use("/api/admin/shipments", requireAdmin, shipmentManagementRoutes);

  // Admin routes (requireFullAccess - blocks fulfillment role)
  app.use("/api/admin/settings", requireFullAccess, adminSettingsRoutes);
  app.use("/api/admin/integrations", requireFullAccess, integrationsStatusRoutes);
  app.use("/api/admin", requireFullAccess, adminIntegrationsSocialRoutes);
  app.use("/api/admin/team", requireFullAccess, adminTeamRoutes);
  app.use("/api/admin", requireFullAccess, adminAffiliatesRoutes);
  app.use("/api/admin/coupons", requireFullAccess, adminCouponsRoutes);
  app.use("/api/admin/categories", requireFullAccess, adminCategoriesRoutes);
  app.use("/api/admin/shipping", requireFullAccess, adminShippingRoutes);
  app.use("/api/admin", requireFullAccess, adminOperationsRoutes);
  app.use("/api/admin/orders", requireFullAccess, refundOrderRoutes);
  app.use("/api/admin/customers", requireOrderAccess, adminCustomerMgmtRoutes);
  app.use("/api/admin/reports", requireFullAccess, adminReportsRoutes);
  app.use("/api/admin/analytics", requireFullAccess, adminAnalyticsRoutes);

  return httpServer;
}
