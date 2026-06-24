#!/usr/bin/env npx tsx
import { spawn } from "node:child_process";
import { userInfo } from "node:os";

const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error("Usage: npm run with:local-auth-env -- <command> [...args]");
  process.exit(1);
}

const e2ePort = process.env.E2E_PORT ?? "5001";
const baseUrl = process.env.E2E_BASE_URL ?? `http://localhost:${e2ePort}`;
const localDatabaseUrl =
  process.env.LOCAL_DATABASE_URL ??
  `postgres://${encodeURIComponent(userInfo().username)}@localhost:5432/powerplunge`;

const env = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL ?? localDatabaseUrl,
  PORT: process.env.PORT ?? e2ePort,
  NODE_ENV: process.env.NODE_ENV ?? "development",
  USE_BETTER_AUTH: process.env.USE_BETTER_AUTH ?? "true",
  VITE_USE_BETTER_AUTH: process.env.VITE_USE_BETTER_AUTH ?? "true",
  BETTER_AUTH_SECRET:
    process.env.BETTER_AUTH_SECRET ?? "dev-test-secret-dev-test-secret-dev-test-secret",
  SESSION_SECRET: process.env.SESSION_SECRET ?? "dev-session-secret-dev-session-secret",
  BETTER_AUTH_BASE_URL: process.env.BETTER_AUTH_BASE_URL ?? baseUrl,
  PUBLIC_SITE_URL: process.env.PUBLIC_SITE_URL ?? baseUrl,
  ENABLE_DEV_AUTH: process.env.ENABLE_DEV_AUTH ?? "true",
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
