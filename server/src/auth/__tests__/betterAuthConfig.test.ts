import { afterEach, describe, expect, it } from "vitest";
import {
  assertBetterAuthReady,
  getBetterAuthBaseURL,
  getBetterAuthTrustedOrigins,
} from "../betterAuthConfig";

const ORIGINAL_ENV = { ...process.env };

function resetEnv(overrides: NodeJS.ProcessEnv = {}) {
  process.env = { ...ORIGINAL_ENV, ...overrides };
  for (const key of [
    "BETTER_AUTH_SECRET",
    "BETTER_AUTH_BASE_URL",
    "PUBLIC_SITE_URL",
    "BASE_URL",
    "APP_URL",
    "E2E_BASE_URL",
    "REPLIT_DOMAINS",
    "REPLIT_DEV_DOMAIN",
    "REPL_SLUG",
    "REPL_OWNER",
    "CORS_ALLOWED_ORIGINS",
    "PORT",
  ]) {
    if (!(key in overrides)) delete process.env[key];
  }
}

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("betterAuthConfig", () => {
  it("uses explicit Better Auth base URL first", () => {
    resetEnv({
      BETTER_AUTH_BASE_URL: "https://auth.example.test/",
      PUBLIC_SITE_URL: "https://public.example.test",
    });

    expect(getBetterAuthBaseURL()).toBe("https://auth.example.test");
  });

  it("falls back to local dev URL outside production", () => {
    resetEnv({ NODE_ENV: "development", PORT: "5123" });

    expect(getBetterAuthBaseURL()).toBe("http://localhost:5123");
  });

  it("collects configured and local trusted origins", () => {
    resetEnv({
      NODE_ENV: "development",
      PUBLIC_SITE_URL: "https://powerplunge.example",
      CORS_ALLOWED_ORIGINS: "https://admin.example, https://shop.example",
    });

    expect(getBetterAuthTrustedOrigins()).toEqual(
      expect.arrayContaining([
        "https://powerplunge.example",
        "https://admin.example",
        "https://shop.example",
        "http://localhost:5001",
        "http://localhost:5002",
      ]),
    );
  });

  it("fails explicitly without a secret", () => {
    resetEnv();

    expect(() => assertBetterAuthReady()).toThrow(/BETTER_AUTH_SECRET/);
  });
});
