import type { Request, Response, NextFunction } from "express";
import type { AdminUser } from "@shared/schema";
import {
  BETTER_AUTH_FULL_ACCESS_ROLES,
  BETTER_AUTH_ORDER_ACCESS_ROLES,
} from "@shared/auth/roles";
import {
  attachAdminAuthContext,
  getAdminAuthContext,
  serializeAdmin,
} from "../auth/adminBetterAuth";

type SerializedAdminUser = ReturnType<typeof serializeAdmin>;

declare module "express-session" {
  interface SessionData {
    adminId?: string;
    adminRole?: string;
    adminEmail?: string;
    adminUser?: SerializedAdminUser;
  }
}

declare module "express-serve-static-core" {
  interface Request {
    adminId?: string;
    adminUser?: SerializedAdminUser;
  }
}

function isAllowedRole(admin: AdminUser, allowedRoles: readonly string[]) {
  if (admin.role === "admin" || admin.role === "super_admin") {
    return true;
  }

  return allowedRoles.includes(admin.role);
}

export function requireRole(...allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const context = await getAdminAuthContext(req);
      if (!context) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (!isAllowedRole(context.admin, allowedRoles)) {
        return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
      }

      attachAdminAuthContext(req, context);
      next();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error checking permissions";
      if (message.includes("Better Auth is not configured")) {
        return res.status(503).json({ message });
      }
      return res.status(500).json({ message: "Error checking permissions" });
    }
  };
}

export const requireAdmin = requireRole(...BETTER_AUTH_FULL_ACCESS_ROLES);
export const requireFullAccess = requireRole(...BETTER_AUTH_FULL_ACCESS_ROLES);
export const requireOrderAccess = requireRole(...BETTER_AUTH_ORDER_ACCESS_ROLES);

export { isAuthenticated } from "../integrations/replit/auth";
