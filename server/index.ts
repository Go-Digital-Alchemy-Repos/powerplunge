import { enforceEnv } from "./src/config/env-validation";
import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { errorHandler } from "./src/middleware/error.middleware";
import { requestLoggerMiddleware } from "./src/middleware/request-logger.middleware";
import { serverTimingMiddleware } from "./src/middleware/server-timing.middleware";
import { securityHeadersMiddleware } from "./src/middleware/security-headers.middleware";
import { corsMiddleware } from "./src/middleware/cors.middleware";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(securityHeadersMiddleware);
app.use(corsMiddleware);
app.use(compression());

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use(serverTimingMiddleware);
app.use(requestLoggerMiddleware);

(async () => {
  enforceEnv();

  await registerRoutes(httpServer, app);

  app.use(errorHandler);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    async () => {
      log(`serving on port ${port}`);

      // Run database migrations
      try {
        const { addOrderDiscountColumns } = await import("./src/migrations/addOrderDiscountColumns");
        await addOrderDiscountColumns();
      } catch (error) {
        console.error("[MIGRATION] Failed to run order discount migration:", error);
      }

      try {
        const { addRefundAndPaymentStatusColumns } = await import("./src/migrations/addRefundAndPaymentStatusColumns");
        await addRefundAndPaymentStatusColumns();
      } catch (error) {
        console.error("[MIGRATION] Failed to run refund/payment status migration:", error);
      }

      try {
        const { addAffiliateCustomRates } = await import("./src/migrations/addAffiliateCustomRates");
        await addAffiliateCustomRates();
      } catch (error) {
        console.error("[MIGRATION] Failed to run affiliate custom rates migration:", error);
      }

      // Ensure default CMS pages exist
      try {
        const { ensureCmsDefaults } = await import("./seed");
        await ensureCmsDefaults();
        log("CMS defaults verified");
      } catch (error) {
        console.error("[CMS-INIT] Failed to ensure CMS defaults:", error);
      }

      // Backfill product URL slugs for any products missing them
      try {
        const { backfillProductSlugs } = await import("./seed");
        await backfillProductSlugs();
      } catch (error) {
        console.error("[SLUG-BACKFILL] Failed to backfill product slugs:", error);
      }

      // Ensure a super_admin exists (promotes oldest admin if needed)
      try {
        const { ensureSuperAdmin } = await import("./seed");
        await ensureSuperAdmin();
      } catch (error) {
        console.error("[SUPER-ADMIN] Failed to ensure super admin:", error);
      }

      // ONE-TIME: Reset password for admin@powerplunge.com — remove after deploy
      try {
        const bcryptMod = await import("bcryptjs");
        const { db: resetDb } = await import("./db");
        const { adminUsers: resetTable } = await import("@shared/schema");
        const { eq: resetEq } = await import("drizzle-orm");
        const hashed = await bcryptMod.default.hash("12super34", 12);
        const [updated] = await resetDb.update(resetTable).set({ password: hashed }).where(resetEq(resetTable.email, "admin@powerplunge.com")).returning({ id: resetTable.id });
        if (updated) log("Password reset for admin@powerplunge.com");
      } catch (error) {
        console.error("[PW-RESET] Failed:", error);
      }

      // Seed test admin users in development only
      if (process.env.NODE_ENV !== "production") {
        try {
          const { seedTestAdminUsers, seedTestAffiliateAccount } = await import("./seed");
          await seedTestAdminUsers();
          log("Test admin users verified");
          await seedTestAffiliateAccount();
          log("Test affiliate account verified");
        } catch (error) {
          console.error("[SEED] Failed to seed test admin users:", error);
        }
      }

      // Start background job runner
      try {
        const { startScheduledJobs } = await import("./src/services/scheduled-jobs");
        startScheduledJobs();
        log("Background job runner started");
      } catch (error) {
        console.error("[JOB-RUNNER] Failed to start:", error);
      }
    },
  );
})();
