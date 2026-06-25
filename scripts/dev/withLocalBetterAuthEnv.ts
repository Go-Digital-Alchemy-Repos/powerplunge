#!/usr/bin/env npx tsx
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { userInfo } from "node:os";
import { resolve } from "node:path";
import { config as dotenvConfig, parse as dotenvParse } from "dotenv";

const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error("Usage: npm run with:local-auth-env -- <command> [...args]");
  process.exit(1);
}

const envFile = resolve(process.cwd(), process.env.LOCAL_TEST_ENV_FILE ?? ".env.test.local");
const hasEnvFile = existsSync(envFile);
const envFileValues = hasEnvFile ? dotenvParse(readFileSync(envFile)) : {};
if (hasEnvFile) {
  dotenvConfig({ path: envFile, override: false, quiet: true });
}

const e2ePort = process.env.E2E_PORT ?? "5001";
const baseUrl = process.env.E2E_BASE_URL ?? `http://localhost:${e2ePort}`;
const localDatabaseUrl =
  process.env.LOCAL_DATABASE_URL ??
  envFileValues.DATABASE_URL ??
  `postgres://${encodeURIComponent(userInfo().username)}@localhost:5432/powerplunge`;

function isLocalDatabase(url: string) {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

function databaseHost(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

const databaseIsLocal = isLocalDatabase(localDatabaseUrl);
const expectedRemoteHost =
  process.env.LOCAL_TEST_DATABASE_HOST ?? envFileValues.LOCAL_TEST_DATABASE_HOST;
const actualRemoteHost = databaseHost(localDatabaseUrl);
const localTestDatabaseFlag =
  process.env.LOCAL_TEST_DATABASE ?? envFileValues.LOCAL_TEST_DATABASE;

if (!databaseIsLocal && localTestDatabaseFlag !== "true") {
  console.error(
    "Refusing remote DATABASE_URL without LOCAL_TEST_DATABASE=true. " +
      "Run npm run env:test:hydrate or use LOCAL_DATABASE_URL for an explicit local test database.",
  );
  process.exit(1);
}

if (!databaseIsLocal && !expectedRemoteHost) {
  console.error(
    "Refusing remote DATABASE_URL without LOCAL_TEST_DATABASE_HOST. " +
      "Pin the expected local test database host before running mutating local commands.",
  );
  process.exit(1);
}

if (!databaseIsLocal && expectedRemoteHost && actualRemoteHost !== expectedRemoteHost) {
  console.error(
    `Refusing remote DATABASE_URL host ${actualRemoteHost}; expected local test host ${expectedRemoteHost}.`,
  );
  process.exit(1);
}

const env = {
  ...process.env,
  DATABASE_URL: localDatabaseUrl,
  PORT: process.env.PORT ?? e2ePort,
  NODE_ENV: process.env.NODE_ENV ?? "development",
  BETTER_AUTH_SECRET:
    process.env.BETTER_AUTH_SECRET ?? "dev-test-secret-dev-test-secret-dev-test-secret",
  SESSION_SECRET: process.env.SESSION_SECRET ?? "dev-session-secret-dev-session-secret",
  BETTER_AUTH_BASE_URL: process.env.BETTER_AUTH_BASE_URL ?? baseUrl,
  PUBLIC_SITE_URL: process.env.PUBLIC_SITE_URL ?? baseUrl,
  E2E_TEST_MODE: process.env.E2E_TEST_MODE ?? "true",
  E2E_EMAIL_MODE: process.env.E2E_EMAIL_MODE ?? "outbox",
  MAILGUN_API_KEY: process.env.MAILGUN_API_KEY ?? "",
  MAILGUN_DOMAIN: process.env.MAILGUN_DOMAIN ?? "",
};

const child = spawn(command, args, {
  env,
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`Command terminated by signal ${signal}`);
    process.exit(1);
  }

  process.exit(code ?? 1);
});
