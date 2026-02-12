import { Request, Response, NextFunction } from "express";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
  name?: string;
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
  const { windowMs, maxRequests, message = "Too many requests, please try again later", name } = config;
  const storeKey = name || `${windowMs}-${maxRequests}`;
  
  if (!limiters.has(storeKey)) {
    limiters.set(storeKey, new Map());
  }
  const store = limiters.get(storeKey)!;

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

      console.warn(
        `[RATE_LIMIT] ${req.method} ${req.path} blocked | limiter=${storeKey} count=${entry.count} limit=${maxRequests}`
      );

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

export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  name: "auth",
  message: "Too many login attempts. Please try again in 15 minutes.",
});

export const smsVerificationLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  name: "sms-verification",
  message: "Too many verification attempts. Please try again later.",
});

export const checkoutLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  name: "checkout",
  message: "Too many checkout attempts. Please wait a moment.",
});

export const paymentLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 15,
  name: "payment",
  message: "Too many payment requests. Please wait a moment.",
});

export const affiliateTrackLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  name: "affiliate-track",
  message: "Too many tracking requests.",
});

export const passwordResetLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  name: "password-reset",
  message: "Too many password reset attempts. Please try again later.",
});

export const affiliateSignupLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  name: "affiliate-signup",
  message: "Too many signup attempts. Please try again later.",
});

export const smsPhoneLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 5,
  name: "sms-phone-hourly",
  message: "Too many verification requests for this number. Please try again later.",
});

export const smsSendLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 3,
  name: "sms-send-per-minute",
  message: "Please wait before requesting another code.",
});

export const generalApiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
  name: "general-api",
  message: "Too many requests. Please slow down.",
});
