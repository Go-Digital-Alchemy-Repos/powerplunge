import type { Request, Response, NextFunction } from "express";

const isProduction = process.env.NODE_ENV === "production";

function getAllowedOrigins(): string[] | null {
  if (!isProduction) return null;

  const origins: string[] = [];

  if (process.env.PUBLIC_SITE_URL) {
    origins.push(process.env.PUBLIC_SITE_URL.replace(/\/+$/, ""));
  }
  if (process.env.CORS_ALLOWED_ORIGINS) {
    for (const o of process.env.CORS_ALLOWED_ORIGINS.split(",")) {
      const trimmed = o.trim().replace(/\/+$/, "");
      if (trimmed) origins.push(trimmed);
    }
  }

  if (process.env.REPLIT_DEV_DOMAIN) {
    origins.push(`https://${process.env.REPLIT_DEV_DOMAIN}`);
  }
  if (process.env.REPLIT_DEPLOYMENT_URL) {
    origins.push(process.env.REPLIT_DEPLOYMENT_URL.replace(/\/+$/, ""));
  }

  return origins.length > 0 ? origins : null;
}

const allowedOrigins = getAllowedOrigins();

export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;

  if (!isProduction) {
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
  } else if (origin && allowedOrigins) {
    if (allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
}
