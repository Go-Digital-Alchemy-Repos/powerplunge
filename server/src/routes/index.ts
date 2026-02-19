/**
 * =============================================================================
 * LAYERED ROUTE ARCHITECTURE
 * =============================================================================
 * 
 * This module registers all modular routes following the layered architecture:
 * 
 * LAYER STRUCTURE:
 * - routes: Define endpoints, attach middleware, call controller
 * - controllers: Parse/validate inputs, call service, return response
 * - services: Business logic, calls repos + integrations
 * - repositories: DB queries only
 * - integrations: External SDK wrapper only (Stripe/Mailgun/etc.)
 * 
 * ROUTE ORGANIZATION:
 * - /api/admin/* → Admin-only routes (require admin auth)
 * - /api/* → Public routes (no auth required)
 * - /api/customer/* → Customer routes (require customer auth)
 * =============================================================================
 */

import type { Express } from "express";
import { setupAuth, registerAuthRoutes } from "../integrations/replit/auth";
import { registerObjectStorageRoutes } from "../integrations/replit/object-storage";
import { registerR2Routes, isR2Configured } from "../integrations/cloudflare-r2";
import { errorHandler } from "../middleware";
import { runtime } from "../config/runtime";
import { setupLocalDevAuth, setupAuthDisabledRoutes } from "../config/local-auth-stub";
import adminRoutes from "./admin";
import publicRoutes from "./public";

export async function registerLayeredRoutes(app: Express): Promise<void> {
  // Setup auth: Replit OIDC when on Replit, local stub or disabled otherwise
  if (runtime.shouldEnableReplitOIDC) {
    await setupAuth(app);
    registerAuthRoutes(app);
  } else if (runtime.enableDevAuth) {
    setupLocalDevAuth(app);
  } else {
    setupAuthDisabledRoutes(app);
  }
  
  // Register both R2 and Object Storage routes; R2 checks credentials per-request
  registerR2Routes(app);
  registerObjectStorageRoutes(app);

  // Mount layered route modules
  app.use("/api", publicRoutes);
  app.use("/api/admin", adminRoutes);

  // Error handler must be last
  app.use(errorHandler);
}

export { adminRoutes, publicRoutes };
