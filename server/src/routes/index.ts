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
import adminRoutes from "./admin";
import publicRoutes from "./public";

export async function registerLayeredRoutes(app: Express): Promise<void> {
  // Setup Replit Auth
  await setupAuth(app);
  registerAuthRoutes(app);
  
  // Register Cloudflare R2 routes if configured, otherwise use Replit object storage
  if (isR2Configured()) {
    registerR2Routes(app);
    console.log("[STORAGE] Using Cloudflare R2 for file uploads");
  } else {
    registerObjectStorageRoutes(app);
    console.log("[STORAGE] Using Replit Object Storage for file uploads");
  }

  // Mount layered route modules
  app.use("/api", publicRoutes);
  app.use("/api/admin", adminRoutes);

  // Error handler must be last
  app.use(errorHandler);
}

export { adminRoutes, publicRoutes };
