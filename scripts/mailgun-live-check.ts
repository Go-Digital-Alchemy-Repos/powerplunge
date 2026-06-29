#!/usr/bin/env npx tsx

import "../server/src/config/load-env";

type Options = {
  sendTo: string | null;
  requireInbound: boolean;
  json: boolean;
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
  checks: CheckResult[];
};

function printUsage(): void {
  console.log(`Usage: npm run mailgun:live:check -- [options]

Options:
  --send-to <email>      Send one real Mailgun test email to the given inbox
  --require-inbound      Fail if inbound replies are disabled or no signing key is available
  --json                 Emit JSON instead of human-readable output
  --help                 Show this message

Examples:
  npm run mailgun:live:check
  npm run mailgun:live:check -- --require-inbound
  npm run mailgun:live:check -- --send-to review@example.com --require-inbound

Notes:
  - Run this inside the target web service when you want live DB-backed Mailgun verification.
  - --send-to is a real side effect and sends one outbound test email.`);
}

function readFlagValue(argv: string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${flag}.`);
  }
  return value;
}

function parseArgs(argv: string[]): Options {
  let sendTo: string | null = null;
  let requireInbound = false;
  let json = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--send-to") {
      sendTo = readFlagValue(argv, index, "--send-to").trim();
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

  return { sendTo, requireInbound, json };
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

  for (const result of summary.checks) {
    const tag = result.status === "pass" ? "PASS" : result.status === "warn" ? "WARN" : "FAIL";
    console.log(`${tag}  ${result.label} - ${result.detail}`);
  }

  const passCount = summary.checks.filter((result) => result.status === "pass").length;
  const warnCount = summary.checks.filter((result) => result.status === "warn").length;
  const failCount = summary.checks.filter((result) => result.status === "fail").length;
  console.log(`=== Results: ${passCount} passed, ${warnCount} warnings, ${failCount} failed ===`);
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
    const result = await emailService.sendTestEmail(options.sendTo);
    if (result.success) {
      sentTestEmail = true;
      pushCheck(
        checks,
        "pass",
        "Test Email",
        `Sent test email to ${options.sendTo}${result.messageId ? ` (${result.messageId})` : ""}.`,
      );
    } else {
      pushCheck(checks, "fail", "Test Email", result.error || `Failed to send test email to ${options.sendTo}.`);
    }
  } else {
    pushCheck(
      checks,
      "warn",
      "Test Email",
      "No outbound delivery probe was sent. Re-run with --send-to <email> for a live delivery check.",
    );
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
    checks,
  };

  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    logHumanReadable(summary);
  }

  process.exit(checks.some((check) => check.status === "fail") ? 1 : 0);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
