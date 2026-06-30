#!/usr/bin/env npx tsx

import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

export type StagingSmokeOptions = {
  baseUrl: string;
  mailgunSendTo: string | null;
  mailgunPollTimeoutMs: number;
  mailgunPollIntervalMs: number;
  skipHttp: boolean;
  skipDb: boolean;
  skipMailgun: boolean;
  stripeWebhookE2e: boolean;
  allowE2eMutation: boolean;
};

export type SmokeTask = {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  sideEffect: string;
};

const defaultBaseUrl = "https://staging.powerplunge.com";
const defaultMailgunPollTimeoutMs = 90_000;
const defaultMailgunPollIntervalMs = 5_000;

function printUsage(): void {
  console.log(`Usage: npm run staging:smoke -- [options]

Options:
  --base-url <url>              Target app URL (default: STAGING_SMOKE_BASE_URL, SMOKE_BASE_URL, PUBLIC_SITE_URL, or ${defaultBaseUrl})
  --mailgun-send-to <email>     Required unless --skip-mailgun; Mailgun test-mode probe recipient
  --mailgun-poll-timeout-ms <n> Mailgun event polling timeout (default: ${defaultMailgunPollTimeoutMs})
  --mailgun-poll-interval-ms <n> Mailgun event polling interval (default: ${defaultMailgunPollIntervalMs})
  --skip-http                   Skip HTTP API smoke checks
  --skip-db                     Skip DB schema/invariant checks
  --skip-mailgun                Skip Mailgun provider probe
  --stripe-webhook-e2e          Run local/internal Stripe webhook E2E order/email assertions
  --allow-e2e-mutation          Required with --stripe-webhook-e2e; creates/deletes test data
  --help                        Show this message

Examples:
  npm run staging:smoke -- --mailgun-send-to qa@example.com
  npm run staging:smoke -- --base-url http://powerplunge.localhost --mailgun-send-to qa@example.com --stripe-webhook-e2e --allow-e2e-mutation

Notes:
  - Default checks are HTTP read-only, DB read-only, and a Mailgun o:testmode=yes provider probe.
  - --stripe-webhook-e2e is for local/internal servers with E2E_TEST_MODE=true and E2E_EMAIL_MODE=outbox.
  - This script never runs a real Mailgun delivery probe; it always passes --test-mode to mailgun:live:check.`);
}

function readFlagValue(argv: string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${flag}.`);
  }
  return value;
}

function parsePositiveInteger(value: string, flag: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flag} must be a positive integer.`);
  }
  return parsed;
}

function defaultOptionBaseUrl(): string {
  return (
    process.env.STAGING_SMOKE_BASE_URL?.trim()
    || process.env.SMOKE_BASE_URL?.trim()
    || process.env.PUBLIC_SITE_URL?.trim()
    || process.env.BASE_URL?.trim()
    || defaultBaseUrl
  ).replace(/\/+$/, "");
}

export function parseArgs(argv: string[]): StagingSmokeOptions {
  const options: StagingSmokeOptions = {
    baseUrl: defaultOptionBaseUrl(),
    mailgunSendTo: process.env.STAGING_SMOKE_MAILGUN_SEND_TO?.trim() || null,
    mailgunPollTimeoutMs: defaultMailgunPollTimeoutMs,
    mailgunPollIntervalMs: defaultMailgunPollIntervalMs,
    skipHttp: false,
    skipDb: false,
    skipMailgun: false,
    stripeWebhookE2e: false,
    allowE2eMutation: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--base-url") {
      options.baseUrl = readFlagValue(argv, index, "--base-url").replace(/\/+$/, "");
      index += 1;
      continue;
    }

    if (arg === "--mailgun-send-to") {
      options.mailgunSendTo = readFlagValue(argv, index, "--mailgun-send-to").trim();
      index += 1;
      continue;
    }

    if (arg === "--mailgun-poll-timeout-ms") {
      options.mailgunPollTimeoutMs = parsePositiveInteger(
        readFlagValue(argv, index, "--mailgun-poll-timeout-ms"),
        "--mailgun-poll-timeout-ms",
      );
      index += 1;
      continue;
    }

    if (arg === "--mailgun-poll-interval-ms") {
      options.mailgunPollIntervalMs = parsePositiveInteger(
        readFlagValue(argv, index, "--mailgun-poll-interval-ms"),
        "--mailgun-poll-interval-ms",
      );
      index += 1;
      continue;
    }

    if (arg === "--skip-http") {
      options.skipHttp = true;
      continue;
    }

    if (arg === "--skip-db") {
      options.skipDb = true;
      continue;
    }

    if (arg === "--skip-mailgun") {
      options.skipMailgun = true;
      continue;
    }

    if (arg === "--stripe-webhook-e2e") {
      options.stripeWebhookE2e = true;
      continue;
    }

    if (arg === "--allow-e2e-mutation") {
      options.allowE2eMutation = true;
      continue;
    }

    if (arg === "--help") {
      printUsage();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function requireLocalInternalBaseUrl(baseUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error(`Invalid --base-url: ${baseUrl}`);
  }

  const hostname = parsed.hostname.toLowerCase();
  const isInternal =
    hostname === "localhost"
    || hostname === "127.0.0.1"
    || hostname === "::1"
    || hostname.endsWith(".localhost");

  if (!isInternal) {
    throw new Error("--stripe-webhook-e2e is only allowed against localhost/internal E2E targets.");
  }
}

function portFromBaseUrl(baseUrl: string): string | undefined {
  try {
    const parsed = new URL(baseUrl);
    if (parsed.port) return parsed.port;
    if (parsed.protocol === "http:") return "80";
    if (parsed.protocol === "https:") return "443";
  } catch {
    return undefined;
  }
  return undefined;
}

export function buildSmokeTasks(options: StagingSmokeOptions): SmokeTask[] {
  if (!options.skipMailgun && !options.mailgunSendTo) {
    throw new Error("Set STAGING_SMOKE_MAILGUN_SEND_TO or pass --mailgun-send-to, or use --skip-mailgun.");
  }

  if (options.stripeWebhookE2e) {
    if (!options.allowE2eMutation) {
      throw new Error("--stripe-webhook-e2e requires --allow-e2e-mutation.");
    }
    requireLocalInternalBaseUrl(options.baseUrl);
  }

  const tasks: SmokeTask[] = [];

  if (!options.skipHttp) {
    tasks.push({
      name: "HTTP API smoke",
      command: "npx",
      args: ["tsx", "scripts/smoke/apiSmoke.ts"],
      env: { SMOKE_BASE_URL: options.baseUrl },
      sideEffect: "Read-only HTTP requests.",
    });
  }

  if (!options.skipDb) {
    tasks.push({
      name: "DB schema/invariants",
      command: "npx",
      args: ["tsx", "scripts/db/verifySchema.ts"],
      sideEffect: "Read-only database checks.",
    });
  }

  if (!options.skipMailgun) {
    tasks.push({
      name: "Mailgun test-mode provider probe",
      command: "npm",
      args: [
        "run",
        "mailgun:live:check",
        "--",
        "--require-inbound",
        "--send-to",
        options.mailgunSendTo!,
        "--test-mode",
        "--poll-events",
        "--poll-timeout-ms",
        String(options.mailgunPollTimeoutMs),
        "--poll-interval-ms",
        String(options.mailgunPollIntervalMs),
      ],
      sideEffect: "Calls Mailgun with o:testmode=yes; delivery is suppressed.",
    });
  }

  if (options.stripeWebhookE2e) {
    const e2ePort = portFromBaseUrl(options.baseUrl);
    tasks.push({
      name: "Stripe webhook E2E order/email assertions",
      command: "npm",
      args: [
        "run",
        "with:test-env",
        "--",
        "npx",
        "playwright",
        "test",
        "e2e/customer-stripe-webhook-success.spec.ts",
        "--project=chromium",
      ],
      env: {
        E2E_BASE_URL: options.baseUrl,
        ...(e2ePort ? { E2E_PORT: e2ePort } : {}),
        E2E_TEST_MODE: "true",
        E2E_EMAIL_MODE: "outbox",
      },
      sideEffect: "Creates/deletes E2E products, customers, pending orders, processed webhook rows, and email-outbox messages in the target test database.",
    });
  }

  return tasks;
}

function formatCommand(task: SmokeTask): string {
  return [task.command, ...task.args].join(" ");
}

async function runTask(task: SmokeTask): Promise<number> {
  console.log(`\n=== ${task.name} ===`);
  console.log(`Side effect: ${task.sideEffect}`);
  console.log(`Command: ${formatCommand(task)}`);

  return new Promise((resolve) => {
    const child = spawn(task.command, task.args, {
      cwd: process.cwd(),
      env: { ...process.env, ...task.env },
      stdio: "inherit",
    });

    child.on("error", (error) => {
      console.error(`${task.name} failed to start: ${error.message}`);
      resolve(1);
    });

    child.on("close", (code) => {
      resolve(code ?? 1);
    });
  });
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const tasks = buildSmokeTasks(options);

  console.log("=== Power Plunge Staging Smoke ===");
  console.log(`Base URL: ${options.baseUrl}`);
  console.log(`Checks: ${tasks.map((task) => task.name).join(", ") || "<none>"}`);

  for (const task of tasks) {
    const code = await runTask(task);
    if (code !== 0) {
      console.error(`\nFAILED: ${task.name} exited with code ${code}.`);
      process.exit(code);
    }
  }

  console.log("\nPASS: staging smoke completed.");
}

function isDirectRun(): boolean {
  const entrypoint = process.argv[1];
  return !!entrypoint && import.meta.url === pathToFileURL(entrypoint).href;
}

if (isDirectRun()) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  });
}
