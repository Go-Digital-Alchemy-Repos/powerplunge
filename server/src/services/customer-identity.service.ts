import { Request } from "express";
import { storage } from "../../storage";
import type { CustomerSession } from "../middleware/customer-auth.middleware";
import type { Customer } from "@shared/schema";
import { getCustomerAuthContext } from "../auth/customerBetterAuth";

export type IdentitySource = "platform" | "customer_token" | "both";

export interface ResolvedIdentity {
  customerId: string;
  customer: Customer;
  source: IdentitySource;
  platformUserId?: string;
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
    const platformUserId = req.user?.claims?.sub as string | undefined;
    const customerSession = await this.extractCustomerSession(req);

    if (!platformUserId && !customerSession) {
      return {
        ok: false,
        error: {
          code: "NO_IDENTITY",
          message: "No authentication credentials provided",
          httpStatus: 401,
        },
      };
    }

    if (platformUserId && !customerSession) {
      return this.resolveFromPlatform(platformUserId);
    }

    if (!platformUserId && customerSession) {
      return this.resolveFromCustomerToken(customerSession);
    }

    return this.resolveBoth(platformUserId!, customerSession!);
  }

  async resolveOrNull(req: any): Promise<ResolvedIdentity | null> {
    const result = await this.resolve(req);
    return result.ok ? result.identity : null;
  }

  private async extractCustomerSession(req: any): Promise<CustomerSession | null> {
    if (req.customerSession) {
      return req.customerSession;
    }

    try {
      const context = await getCustomerAuthContext(req as Request);
      if (!context) return null;
      req.customerSession = {
        customerId: context.customer.id,
        email: context.customer.email,
      };
      req.betterAuthSession = context.betterAuthSession;
      return req.customerSession;
    } catch {
      return null;
    }
  }

  private async resolveFromPlatform(userId: string): Promise<IdentityResult> {
    const customer = await storage.getCustomerByUserId(userId);
    if (!customer) {
      return {
        ok: false,
        error: {
          code: "CUSTOMER_NOT_FOUND",
          message: "No customer record found for authenticated user",
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
        source: "platform",
        platformUserId: userId,
      },
    };
  }

  private async resolveFromCustomerToken(session: CustomerSession): Promise<IdentityResult> {
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
        source: "customer_token",
      },
    };
  }

  private async resolveBoth(userId: string, session: CustomerSession): Promise<IdentityResult> {
    const [platformCustomer, tokenCustomer] = await Promise.all([
      storage.getCustomerByUserId(userId),
      storage.getCustomer(session.customerId),
    ]);

    if (!tokenCustomer) {
      if (platformCustomer) {
        if (platformCustomer.mergedIntoCustomerId) {
          return this.rejectMergedAccount();
        }
        if (platformCustomer.isDisabled) {
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
            customerId: platformCustomer.id,
            customer: platformCustomer,
            source: "platform",
            platformUserId: userId,
          },
        };
      }
      return {
        ok: false,
        error: {
          code: "CUSTOMER_NOT_FOUND",
          message: "Customer not found",
          httpStatus: 404,
        },
      };
    }

    if (tokenCustomer.mergedIntoCustomerId) {
      return this.rejectMergedAccount();
    }

    if (!platformCustomer) {
      if (tokenCustomer.isDisabled) {
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
          customerId: tokenCustomer.id,
          customer: tokenCustomer,
          source: "customer_token",
        },
      };
    }

    if (platformCustomer.mergedIntoCustomerId) {
      return this.rejectMergedAccount();
    }

    if (platformCustomer.id === tokenCustomer.id) {
      if (platformCustomer.isDisabled) {
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
          customerId: platformCustomer.id,
          customer: platformCustomer,
          source: "both",
          platformUserId: userId,
        },
      };
    }

    return {
      ok: false,
      error: {
        code: "IDENTITY_CONFLICT",
        message: "Platform identity and session token refer to different customers. Please sign out and sign in again.",
        httpStatus: 409,
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
}

export const customerIdentityService = new CustomerIdentityService();
