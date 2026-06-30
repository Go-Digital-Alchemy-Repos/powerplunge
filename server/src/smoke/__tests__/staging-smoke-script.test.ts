import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildSmokeTasks,
  parseArgs,
  type StagingSmokeOptions,
} from "../../../../scripts/smoke/stagingSmoke";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.unstubAllEnvs();
});

function makeOptions(overrides: Partial<StagingSmokeOptions> = {}): StagingSmokeOptions {
  return {
    baseUrl: "https://staging.powerplunge.com",
    mailgunSendTo: "qa@example.com",
    mailgunPollTimeoutMs: 90_000,
    mailgunPollIntervalMs: 5_000,
    skipHttp: false,
    skipDb: false,
    skipMailgun: false,
    stripeWebhookE2e: false,
    allowE2eMutation: false,
    ...overrides,
  };
}

describe("staging smoke options", () => {
  it("uses explicit args and trims trailing base URL slashes", () => {
    const options = parseArgs([
      "--base-url",
      "https://staging.powerplunge.com/",
      "--mailgun-send-to",
      "qa@example.com",
      "--mailgun-poll-timeout-ms",
      "120000",
      "--mailgun-poll-interval-ms",
      "3000",
    ]);

    expect(options).toMatchObject({
      baseUrl: "https://staging.powerplunge.com",
      mailgunSendTo: "qa@example.com",
      mailgunPollTimeoutMs: 120_000,
      mailgunPollIntervalMs: 3_000,
    });
  });

  it("reads the default Mailgun recipient from env", () => {
    vi.stubEnv("STAGING_SMOKE_MAILGUN_SEND_TO", "ops@example.com");

    expect(parseArgs([]).mailgunSendTo).toBe("ops@example.com");
  });

  it("rejects unknown flags", () => {
    expect(() => parseArgs(["--bogus"])).toThrow("Unknown argument");
  });
});

describe("staging smoke task plan", () => {
  it("builds read-only checks plus a Mailgun test-mode provider probe by default", () => {
    const tasks = buildSmokeTasks(makeOptions());

    expect(tasks.map((task) => task.name)).toEqual([
      "HTTP API smoke",
      "DB schema/invariants",
      "Mailgun test-mode provider probe",
    ]);

    const mailgunTask = tasks.find((task) => task.name.includes("Mailgun"));
    expect(mailgunTask?.args).toContain("--test-mode");
    expect(mailgunTask?.args).toContain("--poll-events");
    expect(mailgunTask?.args).toContain("--require-inbound");
  });

  it("requires a Mailgun recipient unless Mailgun is skipped", () => {
    expect(() => buildSmokeTasks(makeOptions({ mailgunSendTo: null }))).toThrow(
      "STAGING_SMOKE_MAILGUN_SEND_TO",
    );

    expect(buildSmokeTasks(makeOptions({ mailgunSendTo: null, skipMailgun: true }))).toHaveLength(2);
  });

  it("requires an explicit mutation flag for Stripe webhook E2E", () => {
    expect(() => buildSmokeTasks(makeOptions({ stripeWebhookE2e: true }))).toThrow(
      "--allow-e2e-mutation",
    );
  });

  it("keeps Stripe webhook E2E limited to local/internal targets", () => {
    expect(() =>
      buildSmokeTasks(makeOptions({
        stripeWebhookE2e: true,
        allowE2eMutation: true,
        baseUrl: "https://staging.powerplunge.com",
      })),
    ).toThrow("localhost/internal");
  });

  it("adds local Stripe webhook E2E with outbox env when explicitly allowed", () => {
    const tasks = buildSmokeTasks(makeOptions({
      baseUrl: "http://powerplunge.localhost",
      stripeWebhookE2e: true,
      allowE2eMutation: true,
    }));

    const stripeTask = tasks.find((task) => task.name.includes("Stripe webhook"));
    expect(stripeTask?.args).toContain("e2e/customer-stripe-webhook-success.spec.ts");
    expect(stripeTask?.env).toMatchObject({
      E2E_BASE_URL: "http://powerplunge.localhost",
      E2E_TEST_MODE: "true",
      E2E_EMAIL_MODE: "outbox",
    });
  });
});
