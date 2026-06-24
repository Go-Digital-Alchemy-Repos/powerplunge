import type { Request, Response, NextFunction } from "express";
import {
  attachCustomerAuthContext,
  getCustomerAuthContext,
} from "../auth/customerBetterAuth";

export interface CustomerSession {
  customerId: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  customerSession?: CustomerSession;
}

export async function requireCustomerAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const context = await getCustomerAuthContext(req);
    if (!context) {
      return res.status(401).json({ message: "Authentication required" });
    }

    attachCustomerAuthContext(req, context);
    next();
  } catch (error: any) {
    const message = error instanceof Error ? error.message : "Authentication failed";
    if (message.includes("Better Auth is not configured")) {
      return res.status(503).json({ message });
    }
    if (error?.statusCode === 409) {
      return res.status(409).json({
        message,
        mergedInto: error.mergedInto,
      });
    }
    if (error?.statusCode === 403) {
      return res.status(403).json({ message });
    }
    return res.status(401).json({ message: "Authentication required" });
  }
}
