import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export interface CustomerSession {
  customerId: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  customerSession?: CustomerSession;
}

const SESSION_SECRET = process.env.SESSION_SECRET;
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;

if (!SESSION_SECRET) {
  console.error("CRITICAL: SESSION_SECRET is not set. Customer authentication will fail.");
}

export function createSessionToken(customerId: string, email: string): string {
  if (!SESSION_SECRET) {
    throw new Error("SESSION_SECRET is not configured");
  }
  
  const expiresAt = Date.now() + SESSION_DURATION;
  const payload = JSON.stringify({ customerId, email, expiresAt });
  const signature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payload)
    .digest("hex");
  return Buffer.from(`${payload}.${signature}`).toString("base64");
}

export function verifySessionToken(token: string): { valid: boolean; customerId?: string; email?: string } {
  if (!SESSION_SECRET) {
    return { valid: false };
  }
  
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const lastDotIndex = decoded.lastIndexOf(".");
    if (lastDotIndex === -1) return { valid: false };

    const payload = decoded.slice(0, lastDotIndex);
    const signature = decoded.slice(lastDotIndex + 1);

    const expectedSignature = crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(payload)
      .digest("hex");

    if (signature !== expectedSignature) return { valid: false };

    const data = JSON.parse(payload);
    if (Date.now() > data.expiresAt) return { valid: false };

    return { valid: true, customerId: data.customerId, email: data.email };
  } catch {
    return { valid: false };
  }
}

export function requireCustomerAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const token = authHeader.slice(7);
  const result = verifySessionToken(token);

  if (!result.valid) {
    return res.status(401).json({ message: "Invalid or expired session" });
  }

  req.customerSession = { customerId: result.customerId!, email: result.email! };
  next();
}
