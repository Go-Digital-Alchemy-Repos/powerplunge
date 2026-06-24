import type { Express, Request, Response } from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./betterAuth";
import { assertBetterAuthReady } from "./betterAuthConfig";

export function registerBetterAuthRoutes(app: Express): void {
  assertBetterAuthReady();

  console.log("[BETTER_AUTH] Registering auth routes at /api/auth/*");

  const handler = toNodeHandler(auth);

  app.all("/api/auth/*", (req: Request, res: Response) => {
    handler(req, res);
  });
}

export { auth };
