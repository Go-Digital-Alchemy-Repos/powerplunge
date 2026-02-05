import { Request, Response, NextFunction } from "express";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  message?: string;
}

const limiters = new Map<string, Map<string, RateLimitEntry>>();

function getClientKey(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = typeof forwarded === "string" 
    ? forwarded.split(",")[0].trim() 
    : req.socket.remoteAddress || "unknown";
  return ip;
}

function cleanupExpiredEntries(store: Map<string, RateLimitEntry>, now: number) {
  const keysToDelete: string[] = [];
  store.forEach((entry, key) => {
    if (now > entry.resetTime) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => store.delete(key));
}

export function createRateLimiter(config: RateLimitConfig) {
  const { windowMs, maxRequests, message = "Too many requests, please try again later" } = config;
  const storeKey = `${windowMs}-${maxRequests}`;
  
  if (!limiters.has(storeKey)) {
    limiters.set(storeKey, new Map());
  }
  const store = limiters.get(storeKey)!;

  // Cleanup every 60 seconds
  setInterval(() => cleanupExpiredEntries(store, Date.now()), 60000);

  return (req: Request, res: Response, next: NextFunction) => {
    const clientKey = getClientKey(req);
    const now = Date.now();

    let entry = store.get(clientKey);

    if (!entry || now > entry.resetTime) {
      entry = { count: 1, resetTime: now + windowMs };
      store.set(clientKey, entry);
      return next();
    }

    entry.count++;

    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      res.setHeader("X-RateLimit-Limit", String(maxRequests));
      res.setHeader("X-RateLimit-Remaining", "0");
      res.setHeader("X-RateLimit-Reset", String(Math.ceil(entry.resetTime / 1000)));
      return res.status(429).json({ 
        error: "RATE_LIMIT_EXCEEDED",
        message,
        retryAfter,
      });
    }

    res.setHeader("X-RateLimit-Limit", String(maxRequests));
    res.setHeader("X-RateLimit-Remaining", String(maxRequests - entry.count));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(entry.resetTime / 1000)));
    next();
  };
}

// Pre-configured limiters for common use cases
export const checkoutLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
  message: "Too many checkout attempts. Please wait a moment.",
});

export const paymentLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 15,
  message: "Too many payment requests. Please wait a moment.",
});

export const affiliateTrackLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30,
  message: "Too many tracking requests.",
});

export const passwordResetLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  message: "Too many password reset attempts. Please try again later.",
});

export const generalApiLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  message: "Too many requests. Please slow down.",
});
