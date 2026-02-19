import "./src/config/load-env";
import { logRuntimeOnce } from "./src/config/runtime";
logRuntimeOnce();

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
import { pool } from "./db";
import { clearAllRateLimitTimers } from "./src/middleware/rate-limiter";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

process.on("unhandledRejection", (reason, promise) => {
  console.error("[PROCESS] Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("[PROCESS] Uncaught exception:", err);
  gracefulShutdown("uncaughtException");
});

let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[SHUTDOWN] ${signal} received — starting graceful shutdown...`);

  const forceTimeout = setTimeout(() => {
    console.error("[SHUTDOWN] Forced exit after timeout");
    process.exit(1);
  }, 10000);

  try {
    const { jobRunner } = await import("./src/services/job-runner");
    jobRunner.stop();
    console.log("[SHUTDOWN] Job runner stopped");
  } catch {}

  clearAllRateLimitTimers();

  await new Promise<void>((resolve) => {
    httpServer.close(() => {
      console.log("[SHUTDOWN] HTTP server closed");
      resolve();
    });
  });

  try {
    await pool.end();
    console.log("[SHUTDOWN] Database pool drained");
  } catch (err) {
    console.error("[SHUTDOWN] Error draining pool:", err);
  }

  clearTimeout(forceTimeout);
  console.log("[SHUTDOWN] Graceful shutdown complete");
  process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

app.use(securityHeadersMiddleware);
app.use(corsMiddleware);
app.use(compression());

app.use(
  express.json({
    limit: "2mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: "1mb" }));
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

app.get("/api/health", async (_req: Request, res: Response) => {
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    res.json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      db: "connected",
    });
  } catch (err: any) {
    res.status(503).json({
      status: "degraded",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      db: "disconnected",
      error: err.message,
    });
  }
});

app.use(serverTimingMiddleware);
app.use(requestLoggerMiddleware);

(async () => {
  try {
    enforceEnv();
  } catch (err) {
    console.error("[STARTUP] Environment validation failed:", err);
    process.exit(1);
  }

  // Run database migrations BEFORE accepting traffic
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

  try {
    const { runSupportSettingsMigration } = await import("./src/migrations/addSupportSettingsColumns");
    await runSupportSettingsMigration();
  } catch (error) {
    console.error("[MIGRATION] Failed to run support settings migration:", error);
  }

  try {
    const { runMailgunWebhookSigningKeyMigration } = await import("./src/migrations/addMailgunWebhookSigningKey");
    await runMailgunWebhookSigningKeyMigration();
  } catch (error) {
    console.error("[MIGRATION] Failed to run mailgun webhook signing key migration:", error);
  }

  try {
    const { addMetaMarketingColumns } = await import("./src/migrations/addMetaMarketingColumns");
    await addMetaMarketingColumns();
  } catch (error) {
    console.error("[MIGRATION] Failed to run Meta marketing migration:", error);
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

  // Seed test admin users in development only
  if (process.env.NODE_ENV !== "production") {
    try {
      const { seedTestAdminUsers, seedTestAffiliateAccount, seedTestCustomerAccount } = await import("./seed");
      await seedTestAdminUsers();
      log("Test admin users verified");
      await seedTestAffiliateAccount();
      log("Test affiliate account verified");
      await seedTestCustomerAccount();
      log("Test customer account verified");
    } catch (error) {
      console.error("[SEED] Failed to seed test admin users:", error);
    }
  }

  const { initializeSocketServer } = await import("./src/realtime/socketServer");
  initializeSocketServer(httpServer);

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

  // Use the centralized runtime config for the default port.
  // On Replit the default is 5000; locally / Codex it is 5001.
  // PORT env var always wins when set.
  const { runtime } = await import("./src/config/runtime");
  const port = runtime.defaultBackendPort;
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    async () => {
      log(`serving on port ${port}`);

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
})().catch((err) => {
  console.error("[STARTUP] Fatal error during server initialization:", err);
  process.exit(1);
});
