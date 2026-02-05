import type { Request, Response, NextFunction } from "express";
import { auth } from "../auth/betterAuth";
import { fromNodeHeaders } from "better-auth/node";
import { db } from "../../db";
import { adminUsers } from "@shared/schema";
import { eq } from "drizzle-orm";

declare module "express-serve-static-core" {
  interface Request {
    betterAuthSession?: {
      session: {
        id: string;
        userId: string;
        token: string;
        expiresAt: Date;
        createdAt?: Date;
        updatedAt?: Date;
        ipAddress?: string | null;
        userAgent?: string | null;
      };
      user: {
        id: string;
        email: string;
        name: string;
        role?: string | null;
        adminUserId?: string | null;
        customerId?: string | null;
        emailVerified?: boolean;
        image?: string | null;
        createdAt?: Date;
        updatedAt?: Date;
      };
    };
  }
}

export async function getBetterAuthSession(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    return session;
  } catch (error) {
    console.error("[BETTER_AUTH] Error getting session:", error);
    return null;
  }
}

export function requireBetterAuthSession() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const session = await getBetterAuthSession(req);

    if (!session) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    req.betterAuthSession = session;
    next();
  };
}

export function requireBetterAuthRole(...allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const session = await getBetterAuthSession(req);

    if (!session) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userRole = (session.user as any).role || "customer";
    const adminUserId = (session.user as any).adminUserId;

    const isPrivilegedRole = ["admin", "superadmin", "store_manager", "fulfillment"].includes(userRole);
    if (isPrivilegedRole) {
      if (!adminUserId) {
        console.warn(`[BETTER_AUTH] User ${session.user.email} has role ${userRole} but no linked adminUserId`);
        return res.status(403).json({ message: "Forbidden: Admin account not properly linked" });
      }
      
      const [linkedAdmin] = await db
        .select()
        .from(adminUsers)
        .where(eq(adminUsers.id, adminUserId));
      
      if (!linkedAdmin) {
        console.warn(`[BETTER_AUTH] User ${session.user.email} has adminUserId ${adminUserId} but admin record not found`);
        return res.status(403).json({ message: "Forbidden: Admin account not found" });
      }
    }

    if (userRole === "superadmin" || userRole === "admin") {
      req.betterAuthSession = session;
      return next();
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
    }

    req.betterAuthSession = session;
    next();
  };
}

export const requireBetterAuthAdmin = requireBetterAuthRole("admin", "superadmin", "store_manager");
export const requireBetterAuthSuperAdmin = requireBetterAuthRole("superadmin");
export const requireBetterAuthFullAccess = requireBetterAuthRole("admin", "superadmin", "store_manager");
export const requireBetterAuthOrderAccess = requireBetterAuthRole("admin", "superadmin", "store_manager", "fulfillment");

export async function linkBetterAuthToAdminUser(betterAuthUserId: string, adminEmail: string): Promise<boolean> {
  try {
    const [adminUser] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, adminEmail));

    if (adminUser) {
      return true;
    }
    return false;
  } catch (error) {
    console.error("[BETTER_AUTH] Error linking admin user:", error);
    return false;
  }
}
