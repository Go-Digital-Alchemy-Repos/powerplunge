import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { errorHandler } from "./src/middleware/error.middleware";
import { requestLoggerMiddleware } from "./src/middleware/request-logger.middleware";
import { serverTimingMiddleware } from "./src/middleware/server-timing.middleware";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

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

      // Ensure default CMS pages exist
      try {
        const { ensureCmsDefaults } = await import("./seed");
        await ensureCmsDefaults();
        log("CMS defaults verified");
      } catch (error) {
        console.error("[CMS-INIT] Failed to ensure CMS defaults:", error);
      }

      // Seed test admin users in development only
      if (process.env.NODE_ENV !== "production") {
        try {
          const { seedTestAdminUsers } = await import("./seed");
          await seedTestAdminUsers();
          log("Test admin users verified");
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
