import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../../db";
import {
  betterAuthUser,
  betterAuthSession,
  betterAuthAccount,
  betterAuthVerification,
} from "@shared/models/better-auth";

const isProduction = process.env.NODE_ENV === "production";
const baseUrl = process.env.BETTER_AUTH_BASE_URL || process.env.APP_URL || `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: betterAuthUser,
      session: betterAuthSession,
      account: betterAuthAccount,
      verification: betterAuthVerification,
    },
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: baseUrl,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    autoSignIn: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  advanced: {
    cookiePrefix: "powerplunge",
    useSecureCookies: isProduction,
    crossSubDomainCookies: {
      enabled: false,
    },
  },
  trustedOrigins: process.env.REPLIT_DOMAINS?.split(",") || [],
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "customer",
        input: false,
      },
      adminUserId: {
        type: "string",
        required: false,
        input: false,
      },
      customerId: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },
});

export type BetterAuthSession = typeof auth.$Infer.Session;
export type BetterAuthUser = typeof auth.$Infer.Session.user;
