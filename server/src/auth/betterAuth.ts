import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { db } from "../../db";
import {
  betterAuthUser,
  betterAuthSession,
  betterAuthAccount,
  betterAuthVerification,
} from "@shared/models/better-auth";
import { getBetterAuthBaseURL, getBetterAuthTrustedOrigins } from "./betterAuthConfig";
import { sendBetterAuthMagicLink, sendBetterAuthPasswordReset } from "./betterAuthEmail";

const isProduction = process.env.NODE_ENV === "production";

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
  baseURL: getBetterAuthBaseURL(),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    autoSignIn: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendBetterAuthPasswordReset({
        email: user.email,
        name: user.name,
        url,
      });
    },
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
  trustedOrigins: getBetterAuthTrustedOrigins(),
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
  plugins: [
    magicLink({
      expiresIn: 60 * 15,
      sendMagicLink: async ({ email, url }) => {
        await sendBetterAuthMagicLink({ email, url });
      },
    }),
  ],
});

export type BetterAuthSession = typeof auth.$Infer.Session;
export type BetterAuthUser = typeof auth.$Infer.Session.user;
