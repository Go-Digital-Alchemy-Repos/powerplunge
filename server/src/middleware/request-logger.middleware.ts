import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

const SENSITIVE_PATHS = [
  "/api/auth",
  "/api/login",
  "/api/admin/login",
  "/api/create-payment-intent",
  "/api/stripe/webhook",
];

function isSensitivePath(path: string): boolean {
  return SENSITIVE_PATHS.some(p => path.startsWith(p));
}

/**
 * Sanitizes request body for logging, redacting sensitive fields.
 * Reserved for future debug logging when LOG_REQUEST_BODIES=true.
 */
export function sanitizeBody(body: any, path: string): string {
  if (!body || typeof body !== "object") return "";
  if (isSensitivePath(path)) return "[REDACTED]";
  
  const sanitized = { ...body };
  const sensitiveKeys = ["password", "token", "secret", "key", "authorization", "card", "cvv", "ssn"];
  
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
      sanitized[key] = "[REDACTED]";
    }
  }
  
  return JSON.stringify(sanitized);
}

export function requestLoggerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Accept inbound X-Request-Id for cross-service correlation, or generate new
  const inboundRequestId = req.headers["x-request-id"];
  req.requestId = typeof inboundRequestId === "string" && inboundRequestId.length > 0
    ? inboundRequestId
    : randomUUID();
  
  const start = Date.now();
  const { method, path, requestId } = req;
  
  res.setHeader("X-Request-Id", requestId);
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    
    if (path.startsWith("/api")) {
      const logData = {
        requestId,
        method,
        path,
        statusCode,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      };
      
      const logLevel = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";
      const logMessage = `[${logLevel.toUpperCase()}] ${method} ${path} ${statusCode} ${duration}ms [${requestId}]`;
      
      if (logLevel === "error") {
        console.error(logMessage, logData);
      } else if (logLevel === "warn") {
        console.warn(logMessage);
      } else {
        console.log(logMessage);
      }
    }
  });
  
  next();
}
