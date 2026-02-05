import type { Express, Request, Response, NextFunction } from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./betterAuth";

const USE_BETTER_AUTH = process.env.USE_BETTER_AUTH === "true";

export function registerBetterAuthRoutes(app: Express): void {
  app.get("/api/auth/feature-flag", (_req: Request, res: Response) => {
    res.json({ enabled: USE_BETTER_AUTH });
  });

  if (!USE_BETTER_AUTH) {
    console.log("[BETTER_AUTH] Feature flag disabled - skipping route registration");
    return;
  }

  if (!process.env.BETTER_AUTH_SECRET) {
    console.error("[BETTER_AUTH] BETTER_AUTH_SECRET is not set - auth will not work");
    return;
  }

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
