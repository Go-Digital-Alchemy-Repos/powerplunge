import { afterEach, describe, expect, it } from "vitest";
import { validateEnv } from "../env-validation";

const ORIGINAL_ENV = { ...process.env };

const TEST_KEYS = [
  "APP_SECRETS_ENCRYPTION_KEY",
  "APP_URL",
  "BASE_URL",
  "BETTER_AUTH_BASE_URL",
  "BETTER_AUTH_SECRET",
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_R2_ACCESS_KEY_ID",
  "CLOUDFLARE_R2_BUCKET_NAME",
  "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
  "CORS_ALLOWED_ORIGINS",
  "DATABASE_URL",
  "IP_HASH_SALT",
  "MAILGUN_API_KEY",
  "MAILGUN_DOMAIN",
  "NODE_ENV",
  "PUBLIC_SITE_URL",
  "REPLIT_DEPLOYMENT_URL",
  "REPLIT_DEV_DOMAIN",
  "REPLIT_DOMAINS",
  "REPL_OWNER",
  "REPL_SLUG",
  "SESSION_SECRET",
  "STRIPE_CONNECT_WEBHOOK_SECRET",
  "STRIPE_PUBLISHABLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_PHONE_NUMBER",
];

function resetEnv(overrides: NodeJS.ProcessEnv = {}) {
  process.env = { ...ORIGINAL_ENV, ...overrides };
  for (const key of TEST_KEYS) {
    if (!(key in overrides)) delete process.env[key];
  }
}

function baseRequiredEnv(): NodeJS.ProcessEnv {
  return {
    DATABASE_URL: "postgres://user:pass@example.test/db",
    SESSION_SECRET: "session-secret",
    STRIPE_SECRET_KEY: "sk_test_example",
    STRIPE_PUBLISHABLE_KEY: "pk_test_example",
    STRIPE_WEBHOOK_SECRET: "whsec_example",
    BETTER_AUTH_SECRET: "better-auth-secret",
  };
}

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("env validation", () => {
  it("does not warn that DB-managed provider fallbacks disable features", () => {
    resetEnv({
      ...baseRequiredEnv(),
      APP_SECRETS_ENCRYPTION_KEY: "encryption-key",
      IP_HASH_SALT: "ip-hash-salt",
      PUBLIC_SITE_URL: "https://www.powerplunge.com",
    });

    const result = validateEnv();

    expect(result.ok).toBe(true);
    expect(result.warnings).toHaveLength(0);
    expect(result.disabledFeatures).toHaveLength(0);
    expect(result.databaseBackedFallbacks.map((entry) => entry.name)).toEqual(
      expect.arrayContaining([
        "MAILGUN_API_KEY",
        "MAILGUN_DOMAIN",
        "STRIPE_CONNECT_WEBHOOK_SECRET",
        "TWILIO_ACCOUNT_SID",
        "TWILIO_AUTH_TOKEN",
        "TWILIO_PHONE_NUMBER",
        "CLOUDFLARE_ACCOUNT_ID",
        "CLOUDFLARE_R2_ACCESS_KEY_ID",
        "CLOUDFLARE_R2_BUCKET_NAME",
        "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
      ]),
    );
  });

  it("still warns for bootstrap/security env vars that cannot come from database settings", () => {
    resetEnv({
      ...baseRequiredEnv(),
      PUBLIC_SITE_URL: "https://www.powerplunge.com",
    });

    const result = validateEnv();

    expect(result.warnings.map((entry) => entry.name)).toEqual(
      expect.arrayContaining(["APP_SECRETS_ENCRYPTION_KEY", "IP_HASH_SALT"]),
    );
  });

  it("requires encrypted-secret and IP-hash bootstrap vars in production", () => {
    resetEnv({
      ...baseRequiredEnv(),
      NODE_ENV: "production",
      PUBLIC_SITE_URL: "https://www.powerplunge.com",
    });

    const result = validateEnv();

    expect(result.missing.map((entry) => entry.name)).toEqual(
      expect.arrayContaining(["APP_SECRETS_ENCRYPTION_KEY", "IP_HASH_SALT"]),
    );
  });

  it("accepts the canonical public URL as CORS coverage", () => {
    resetEnv({
      ...baseRequiredEnv(),
      APP_SECRETS_ENCRYPTION_KEY: "encryption-key",
      IP_HASH_SALT: "ip-hash-salt",
      PUBLIC_SITE_URL: "https://www.powerplunge.com",
    });

    const result = validateEnv();

    expect(result.warnings.map((entry) => entry.name)).not.toContain("CORS_ALLOWED_ORIGINS");
  });

  it("does not treat app URL as CORS coverage because middleware does not read it", () => {
    resetEnv({
      ...baseRequiredEnv(),
      APP_SECRETS_ENCRYPTION_KEY: "encryption-key",
      APP_URL: "https://www.powerplunge.com",
      IP_HASH_SALT: "ip-hash-salt",
    });

    const result = validateEnv();

    expect(result.warnings.map((entry) => entry.name)).toContain("CORS_ALLOWED_ORIGINS");
  });

  it("accepts Better Auth Replit fallbacks", () => {
    resetEnv({
      ...baseRequiredEnv(),
      APP_SECRETS_ENCRYPTION_KEY: "encryption-key",
      CORS_ALLOWED_ORIGINS: "https://www.powerplunge.com",
      IP_HASH_SALT: "ip-hash-salt",
      REPL_SLUG: "powerplunge",
      REPL_OWNER: "digital-alchemy",
    });

    const result = validateEnv();

    expect(result.warnings.map((entry) => entry.name)).not.toContain("BETTER_AUTH_BASE_URL");
  });
});
