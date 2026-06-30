#!/usr/bin/env npx tsx

import "../server/src/config/load-env";
import { randomUUID } from "crypto";
import { pathToFileURL } from "url";

type Options = {
  sendTo: string | null;
  requireInbound: boolean;
  json: boolean;
  testMode: boolean;
  pollEvents: boolean;
  pollTimeoutMs: number;
  pollIntervalMs: number;
};

type CheckStatus = "pass" | "warn" | "fail";

type CheckResult = {
  status: CheckStatus;
  label: string;
  detail: string;
};

type InboundSigningKeySource = "env" | "database" | "none" | "invalid";

type OutputSummary = {
  provider: string;
  domain: string | null;
  fromEmail: string | null;
  replyTo: string | null;
  region: string | null;
  inboundRepliesEnabled: boolean;
  inboundSigningKeySource: InboundSigningKeySource;
  sentTestEmail: boolean;
  testMode: boolean;
  mailgunProbeTag: string | null;
  checks: CheckResult[];
};

type MailgunEventLike = {
  event?: string;
};

type MailgunSuccessEvent = "accepted" | "delivered";

const defaultPollTimeoutMs = 60_000;
const defaultPollIntervalMs = 5_000;

function printUsage(): void {
  console.log(`Usage: npm run mailgun:live:check -- [options]

Options:
  --send-to <email>      Send a Mailgun probe to the given inbox; add --test-mode to suppress delivery
  --test-mode            Use Mailgun o:testmode=yes with --send-to; Mailgun accepts the message but does not deliver it
  --poll-events          After --send-to, poll Mailgun events for the tagged probe
  --poll-timeout-ms <n>  Event polling timeout (default: ${defaultPollTimeoutMs})
  --poll-interval-ms <n> Event polling interval (default: ${defaultPollIntervalMs})
  --require-inbound      Fail if inbound replies are disabled or no signing key is available
  --json                 Emit JSON instead of human-readable output
  --help                 Show this message

Examples:
  npm run mailgun:live:check
  npm run mailgun:live:check -- --require-inbound
  npm run mailgun:live:check -- --send-to review@example.com --test-mode --poll-events
  npm run mailgun:live:check -- --send-to review@example.com --require-inbound

Notes:
  - Run this inside the target web service when you want live DB-backed Mailgun verification.
  - --send-to without --test-mode is a real side effect and sends one outbound test email.
  - --send-to with --test-mode calls Mailgun but suppresses delivery.`);
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

export function parseArgs(argv: string[]): Options {
  let sendTo: string | null = null;
  let requireInbound = false;
  let json = false;
  let testMode = false;
  let pollEvents = false;
  let pollTimeoutMs = defaultPollTimeoutMs;
  let pollIntervalMs = defaultPollIntervalMs;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--send-to") {
      sendTo = readFlagValue(argv, index, "--send-to").trim();
      index += 1;
      continue;
    }

    if (arg === "--test-mode") {
      testMode = true;
      continue;
    }

    if (arg === "--poll-events") {
      pollEvents = true;
      continue;
    }

    if (arg === "--poll-timeout-ms") {
      pollTimeoutMs = parsePositiveInteger(readFlagValue(argv, index, "--poll-timeout-ms"), "--poll-timeout-ms");
      index += 1;
      continue;
    }

    if (arg === "--poll-interval-ms") {
      pollIntervalMs = parsePositiveInteger(readFlagValue(argv, index, "--poll-interval-ms"), "--poll-interval-ms");
      index += 1;
      continue;
    }

    if (arg === "--require-inbound") {
      requireInbound = true;
      continue;
    }

    if (arg === "--json") {
      json = true;
      continue;
    }

    if (arg === "--help") {
      printUsage();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return { sendTo, requireInbound, json, testMode, pollEvents, pollTimeoutMs, pollIntervalMs };
}

function pushCheck(results: CheckResult[], status: CheckStatus, label: string, detail: string): void {
  results.push({ status, label, detail });
}

function logHumanReadable(summary: OutputSummary): void {
  console.log("=== Mailgun Live Check ===");
  console.log(`Provider: ${summary.provider}`);
  console.log(`Domain: ${summary.domain || "<unset>"}`);
  console.log(`From: ${summary.fromEmail || "<unset>"}`);
  console.log(`Reply-To: ${summary.replyTo || "<unset>"}`);
  console.log(`Region: ${summary.region || "<unset>"}`);
  console.log(`Inbound Replies Enabled: ${summary.inboundRepliesEnabled ? "yes" : "no"}`);
  console.log(`Inbound Signing Key Source: ${summary.inboundSigningKeySource}`);
  console.log(`Mailgun Test Mode: ${summary.testMode ? "yes" : "no"}`);
  console.log(`Mailgun Probe Tag: ${summary.mailgunProbeTag || "<none>"}`);

  for (const result of summary.checks) {
    const tag = result.status === "pass" ? "PASS" : result.status === "warn" ? "WARN" : "FAIL";
    console.log(`${tag}  ${result.label} - ${result.detail}`);
  }

  const passCount = summary.checks.filter((result) => result.status === "pass").length;
  const warnCount = summary.checks.filter((result) => result.status === "warn").length;
  const failCount = summary.checks.filter((result) => result.status === "fail").length;
  console.log(`=== Results: ${passCount} passed, ${warnCount} warnings, ${failCount} failed ===`);
}

export function shouldPollMailgunEvents(options: Pick<Options, "sendTo" | "pollEvents">): boolean {
  return !!options.sendTo && options.pollEvents;
}

export function classifyMailgunEvents(
  events: MailgunEventLike[],
  options: { emptyStatus?: CheckStatus; successEvents?: MailgunSuccessEvent[] } = {},
): Pick<CheckResult, "status" | "detail"> {
  const eventNames = events.map((event) => event.event?.toLowerCase()).filter(Boolean);
  const successEvents = options.successEvents || ["delivered", "accepted"];

  const failureEvent = eventNames.find((event) =>
    event === "failed" || event === "rejected" || event === "complained" || event === "unsubscribed"
  );
  if (failureEvent) {
    return {
      status: "fail",
      detail: `Mailgun reported ${failureEvent} for the tagged probe.`,
    };
  }

  const matchingSuccessEvent = eventNames.find((event): event is MailgunSuccessEvent =>
    (event === "delivered" || event === "accepted") && successEvents.includes(event)
  );
  if (matchingSuccessEvent) {
    return {
      status: "pass",
      detail: `Mailgun reported ${matchingSuccessEvent} for the tagged probe.`,
    };
  }

  const otherSuccessEvent = eventNames.find((event): event is MailgunSuccessEvent =>
    event === "delivered" || event === "accepted"
  );
  if (otherSuccessEvent) {
    return {
      status: options.emptyStatus || "fail",
      detail: `Mailgun reported ${otherSuccessEvent}, but no ${successEvents.join(" or ")} event appeared before the polling timeout.`,
    };
  }

  return {
    status: options.emptyStatus || "fail",
    detail: `No Mailgun ${successEvents.join("/")}/failed event appeared before the polling timeout.`,
  };
}

function hasTerminalMailgunProbeEvent(events: MailgunEventLike[], successEvents: MailgunSuccessEvent[]): boolean {
  return events.some((event) => {
    const eventName = event.event?.toLowerCase();
    const successEvent = eventName === "accepted" || eventName === "delivered" ? eventName : null;
    if (successEvent && successEvents.includes(successEvent)) {
      return true;
    }
    return eventName === "failed"
      || eventName === "rejected"
      || eventName === "complained"
      || eventName === "unsubscribed";
  });
}

function buildMailgunProbeTag(): string {
  return `powerplunge-mailgun-live-check-${new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14)}-${randomUUID().slice(0, 8)}`;
}

function mailgunApiBaseUrl(region: string | null | undefined): string {
  return region === "eu" ? "https://api.eu.mailgun.net" : "https://api.mailgun.net";
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchMailgunEvents(params: {
  apiKey: string;
  domain: string;
  region: string | null | undefined;
  tag: string;
  begin: Date;
}): Promise<MailgunEventLike[]> {
  const url = new URL(`/v3/${params.domain}/events`, mailgunApiBaseUrl(params.region));
  url.searchParams.set("tags", params.tag);
  url.searchParams.set("begin", params.begin.toUTCString());
  url.searchParams.set("ascending", "yes");
  url.searchParams.set("limit", "100");

  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${params.apiKey}`).toString("base64")}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Mailgun events lookup failed (${response.status}).`);
  }

  const body = await response.json() as { items?: MailgunEventLike[] };
  return body.items || [];
}

async function pollMailgunEvents(params: {
  apiKey: string;
  domain: string;
  region: string | null | undefined;
  tag: string;
  startedAt: Date;
  timeoutMs: number;
  intervalMs: number;
  timeoutStatus?: CheckStatus;
  successEvents: MailgunSuccessEvent[];
}): Promise<CheckResult> {
  const deadline = Date.now() + params.timeoutMs;
  let lastEvents: MailgunEventLike[] = [];

  do {
    lastEvents = await fetchMailgunEvents({
      apiKey: params.apiKey,
      domain: params.domain,
      region: params.region,
      tag: params.tag,
      begin: new Date(params.startedAt.getTime() - 60_000),
    });

    const classified = classifyMailgunEvents(lastEvents, {
      emptyStatus: params.timeoutStatus,
      successEvents: params.successEvents,
    });
    if (hasTerminalMailgunProbeEvent(lastEvents, params.successEvents)) {
      return {
        status: classified.status,
        label: "Mailgun Event Poll",
        detail: classified.detail,
      };
    }

    if (Date.now() < deadline) {
      await delay(Math.min(params.intervalMs, Math.max(deadline - Date.now(), 0)));
    }
  } while (Date.now() < deadline);

  const classified = classifyMailgunEvents(lastEvents, {
    emptyStatus: params.timeoutStatus,
    successEvents: params.successEvents,
  });
  return {
    status: classified.status,
    label: "Mailgun Event Poll",
    detail: classified.detail,
  };
}

async function resolveInboundSigningKeyStatus(): Promise<{
  source: InboundSigningKeySource;
  configured: boolean;
  detail: string;
}> {
  const [{ storage }, { decrypt }] = await Promise.all([
    import("../server/storage"),
    import("../server/src/utils/encryption"),
  ]);

  if (process.env.MAILGUN_WEBHOOK_SIGNING_KEY?.trim()) {
    return {
      source: "env",
      configured: true,
      detail: "MAILGUN_WEBHOOK_SIGNING_KEY is present as a backup env value.",
    };
  }

  const emailSettings = await storage.getEmailSettings();
  if (!emailSettings?.mailgunWebhookSigningKeyEncrypted) {
    return {
      source: "none",
      configured: false,
      detail: "No Mailgun webhook signing key is configured in env or email settings.",
    };
  }

  try {
    const decrypted = decrypt(emailSettings.mailgunWebhookSigningKeyEncrypted);
    if (!decrypted.trim()) {
      return {
        source: "invalid",
        configured: false,
        detail: "Encrypted Mailgun webhook signing key decrypted to an empty value.",
      };
    }

    return {
      source: "database",
      configured: true,
      detail: "Mailgun webhook signing key is available from encrypted email settings.",
    };
  } catch (error: unknown) {
    return {
      source: "invalid",
      configured: false,
      detail: error instanceof Error ? error.message : "Failed to decrypt Mailgun webhook signing key.",
    };
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const [{ storage }, { emailService }] = await Promise.all([
    import("../server/storage"),
    import("../server/src/integrations/mailgun/EmailService"),
  ]);
  const checks: CheckResult[] = [];

  const config = await emailService.getConfig();
  const verify = await emailService.verifyConfiguration();
  const siteSettings = await storage.getSiteSettings();
  const inboundKey = await resolveInboundSigningKeyStatus();
  const directEnvDomain = process.env.MAILGUN_DOMAIN?.trim() || null;
  const directEnvApiKeyPresent = !!process.env.MAILGUN_API_KEY?.trim();
  const mailgunProbeTag = options.sendTo ? buildMailgunProbeTag() : null;

  if (config.provider !== "mailgun") {
    pushCheck(checks, "fail", "Provider", `Expected mailgun, received ${config.provider}.`);
  } else {
    pushCheck(checks, "pass", "Provider", "Mailgun is the active email provider.");
  }

  if (verify.valid) {
    pushCheck(
      checks,
      "pass",
      "Outbound Configuration",
      `Mailgun domain verification succeeded for ${config.domain || "<unknown>"}${config.region ? ` (${config.region})` : ""}.`,
    );
  } else {
    pushCheck(checks, "fail", "Outbound Configuration", verify.error || "Mailgun verification failed.");
  }

  if (inboundKey.configured) {
    pushCheck(checks, "pass", "Inbound Signing Key", inboundKey.detail);
  } else if (options.requireInbound) {
    pushCheck(checks, "fail", "Inbound Signing Key", inboundKey.detail);
  } else {
    pushCheck(checks, "warn", "Inbound Signing Key", inboundKey.detail);
  }

  const inboundRepliesEnabled = siteSettings?.supportInboundRepliesEnabled ?? false;
  if (inboundRepliesEnabled) {
    pushCheck(checks, "pass", "Inbound Replies", "Support inbound replies are enabled.");
  } else if (options.requireInbound) {
    pushCheck(checks, "fail", "Inbound Replies", "Support inbound replies are disabled.");
  } else {
    pushCheck(checks, "warn", "Inbound Replies", "Support inbound replies are disabled.");
  }

  if (directEnvDomain && directEnvApiKeyPresent && config.provider !== "mailgun") {
    pushCheck(
      checks,
      "warn",
      "Direct Mailgun Env Path",
      "MAILGUN_API_KEY and MAILGUN_DOMAIN are present, but EmailService is not using Mailgun. Direct fulfillment notification sends can still use env Mailgun settings independently.",
    );
  } else if (directEnvDomain && directEnvApiKeyPresent && config.domain && directEnvDomain !== config.domain) {
    pushCheck(
      checks,
      "fail",
      "Direct Mailgun Env Path",
      `MAILGUN_DOMAIN (${directEnvDomain}) differs from DB Mailgun domain (${config.domain}). Direct fulfillment notification sends can use the env domain.`,
    );
  } else if (directEnvDomain && directEnvApiKeyPresent && config.domain) {
    pushCheck(
      checks,
      "pass",
      "Direct Mailgun Env Path",
      "MAILGUN_DOMAIN is present and matches the DB Mailgun domain used by EmailService.",
    );
  } else if (directEnvDomain && directEnvApiKeyPresent) {
    pushCheck(
      checks,
      "warn",
      "Direct Mailgun Env Path",
      "MAILGUN_API_KEY and MAILGUN_DOMAIN are present, but DB Mailgun domain is unavailable for consistency comparison.",
    );
  } else if (directEnvDomain || directEnvApiKeyPresent) {
    pushCheck(
      checks,
      "warn",
      "Direct Mailgun Env Path",
      "Only one of MAILGUN_API_KEY or MAILGUN_DOMAIN is present; direct fulfillment notification sends require both.",
    );
  } else {
    pushCheck(
      checks,
      "warn",
      "Direct Mailgun Env Path",
      "MAILGUN_API_KEY and MAILGUN_DOMAIN env values are not both present; direct fulfillment notification sends will skip outside email-outbox mode.",
    );
  }

  let sentTestEmail = false;
  if (options.sendTo) {
    const sendStartedAt = new Date();
    const result = await emailService.sendTestEmail(options.sendTo, {
      mailgunTestMode: options.testMode,
      mailgunTags: mailgunProbeTag ? [mailgunProbeTag] : undefined,
      bypassOutbox: true,
    });
    if (result.success) {
      sentTestEmail = true;
      pushCheck(
        checks,
        "pass",
        "Test Email",
        options.testMode
          ? `Mailgun accepted a test-mode probe for ${options.sendTo}; delivery was suppressed${result.messageId ? ` (${result.messageId})` : ""}.`
          : `Sent test email to ${options.sendTo}${result.messageId ? ` (${result.messageId})` : ""}.`,
      );

      if (shouldPollMailgunEvents(options)) {
        if (!config.apiKey || !config.domain) {
          pushCheck(checks, "fail", "Mailgun Event Poll", "Cannot poll Mailgun events without API key and domain.");
        } else {
          checks.push(await pollMailgunEvents({
            apiKey: config.apiKey,
            domain: config.domain,
            region: config.region || null,
            tag: mailgunProbeTag!,
            startedAt: sendStartedAt,
            timeoutMs: options.pollTimeoutMs,
            intervalMs: options.pollIntervalMs,
            timeoutStatus: options.testMode ? "warn" : "fail",
            successEvents: options.testMode ? ["accepted", "delivered"] : ["delivered"],
          }));
        }
      }
    } else {
      pushCheck(checks, "fail", "Test Email", result.error || `Failed to send test email to ${options.sendTo}.`);
    }
  } else {
    pushCheck(
      checks,
      "warn",
      "Test Email",
      "No outbound delivery probe was sent. Re-run with --send-to <email> for a delivery check, or add --test-mode to suppress delivery.",
    );
    if (options.testMode) {
      pushCheck(checks, "warn", "Mailgun Test Mode", "--test-mode has no effect without --send-to.");
    }
    if (options.pollEvents) {
      pushCheck(checks, "warn", "Mailgun Event Poll", "--poll-events has no effect without --send-to.");
    }
  }

  const summary: OutputSummary = {
    provider: config.provider,
    domain: config.domain || null,
    fromEmail: config.fromEmail || null,
    replyTo: config.replyTo || null,
    region: config.region || null,
    inboundRepliesEnabled,
    inboundSigningKeySource: inboundKey.source,
    sentTestEmail,
    testMode: options.testMode,
    mailgunProbeTag,
    checks,
  };

  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    logHumanReadable(summary);
  }

  process.exit(checks.some((check) => check.status === "fail") ? 1 : 0);
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
