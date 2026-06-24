import type { Express, Request, Response, NextFunction } from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./betterAuth";
import { assertBetterAuthReady, isBetterAuthEnabled } from "./betterAuthConfig";

export function registerBetterAuthRoutes(app: Express): void {
  app.get("/api/auth/feature-flag", (_req: Request, res: Response) => {
    res.json({ enabled: isBetterAuthEnabled() && !!process.env.BETTER_AUTH_SECRET });
  });

  if (!isBetterAuthEnabled()) {
    console.log("[BETTER_AUTH] Feature flag disabled - skipping route registration");
    return;
  }

  assertBetterAuthReady();

  console.log("[BETTER_AUTH] Registering auth routes at /api/auth/*");

  const handler = toNodeHandler(auth);

  app.all("/api/auth/*", (req: Request, res: Response, next: NextFunction) => {
    const originalUrl = req.originalUrl;
    
    if (originalUrl === "/api/auth/user" && !originalUrl.includes("/api/auth/get-session")) {
      return next();
    }

    handler(req, res);
  });
}

export { auth };
