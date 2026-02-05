import type { Request, Response, NextFunction } from "express";
import { db } from "../../db";
import { adminUsers } from "@shared/schema";
import { eq } from "drizzle-orm";

declare module "express-session" {
  interface SessionData {
    adminId?: string;
    adminRole?: string;
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.adminId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

// Middleware to require specific roles (admin, store_manager, or fulfillment)
// Fulfillment role can only access order-related endpoints
export function requireRole(...allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.adminId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const [admin] = await db
        .select({ role: adminUsers.role })
        .from(adminUsers)
        .where(eq(adminUsers.id, req.session.adminId));

      if (!admin) {
        return res.status(401).json({ message: "Admin not found" });
      }

      // Admin role has access to everything
      if (admin.role === "admin") {
        return next();
      }

      // Check if user's role is in allowed roles
      if (allowedRoles.includes(admin.role)) {
        return next();
      }

      return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
    } catch (error) {
      return res.status(500).json({ message: "Error checking permissions" });
    }
  };
}

// Shorthand middlewares for common role combinations
export const requireFullAccess = requireRole("admin", "store_manager");
export const requireOrderAccess = requireRole("admin", "store_manager", "fulfillment");

export { isAuthenticated } from "../integrations/replit/auth";
