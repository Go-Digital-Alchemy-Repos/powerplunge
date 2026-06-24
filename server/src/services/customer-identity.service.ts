import { Request } from "express";
import { storage } from "../../storage";
import type { CustomerSession } from "../middleware/customer-auth.middleware";
import type { Customer } from "@shared/schema";
import { getCustomerAuthContext } from "../auth/customerBetterAuth";

export type IdentitySource = "better_auth";

export interface ResolvedIdentity {
  customerId: string;
  customer: Customer;
  source: IdentitySource;
}

export interface IdentityError {
  code: "NO_IDENTITY" | "CUSTOMER_NOT_FOUND" | "IDENTITY_CONFLICT" | "DISABLED_ACCOUNT" | "MERGED_ACCOUNT";
  message: string;
  httpStatus: number;
}

export type IdentityResult =
  | { ok: true; identity: ResolvedIdentity }
  | { ok: false; error: IdentityError };

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export class CustomerIdentityService {
  async resolve(req: any): Promise<IdentityResult> {
    let customerSession: CustomerSession | null;
    try {
      customerSession = await this.extractCustomerSession(req);
    } catch (error) {
      return {
        ok: false,
        error: this.errorFromAuthError(error),
      };
    }

    if (!customerSession) {
      return {
        ok: false,
        error: {
          code: "NO_IDENTITY",
          message: "No authentication credentials provided",
          httpStatus: 401,
        },
      };
    }

    return this.resolveFromBetterAuthSession(customerSession);
  }

  async resolveOrNull(req: any): Promise<ResolvedIdentity | null> {
    const result = await this.resolve(req);
    return result.ok ? result.identity : null;
  }

  private async extractCustomerSession(req: any): Promise<CustomerSession | null> {
    if (req.customerSession) {
      return req.customerSession;
    }

    const context = await getCustomerAuthContext(req as Request);
    if (!context) return null;
    req.customerSession = {
      customerId: context.customer.id,
      email: context.customer.email,
    };
    req.betterAuthSession = context.betterAuthSession;
    return req.customerSession;
  }

  private async resolveFromBetterAuthSession(session: CustomerSession): Promise<IdentityResult> {
    const customer = await storage.getCustomer(session.customerId);
    if (!customer) {
      return {
        ok: false,
        error: {
          code: "CUSTOMER_NOT_FOUND",
          message: "Customer not found",
          httpStatus: 404,
        },
      };
    }

    if (customer.mergedIntoCustomerId) {
      return this.rejectMergedAccount();
    }

    if (customer.isDisabled) {
      return {
        ok: false,
        error: {
          code: "DISABLED_ACCOUNT",
          message: "This account has been disabled",
          httpStatus: 403,
        },
      };
    }

    return {
      ok: true,
      identity: {
        customerId: customer.id,
        customer,
        source: "better_auth",
      },
    };
  }

  private rejectMergedAccount(): IdentityResult {
    return {
      ok: false,
      error: {
        code: "MERGED_ACCOUNT",
        message: "This account has been merged. Please use your primary account.",
        httpStatus: 409,
      },
    };
  }

  private errorFromAuthError(error: unknown): IdentityError {
    const message = error instanceof Error ? error.message : "Authentication failed";
    const statusCode = typeof (error as any)?.statusCode === "number" ? (error as any).statusCode : undefined;

    if (message.includes("Better Auth is not configured")) {
      return {
        code: "NO_IDENTITY",
        message,
        httpStatus: 503,
      };
    }

    if (statusCode === 409) {
      return {
        code: "MERGED_ACCOUNT",
        message,
        httpStatus: 409,
      };
    }

    if (statusCode === 403) {
      return {
        code: "DISABLED_ACCOUNT",
        message,
        httpStatus: 403,
      };
    }

    return {
      code: "NO_IDENTITY",
      message: "Authentication failed",
      httpStatus: 401,
    };
  }
}

export const customerIdentityService = new CustomerIdentityService();
