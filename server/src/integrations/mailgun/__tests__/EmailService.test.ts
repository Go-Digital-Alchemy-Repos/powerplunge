import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  domainsGet: vi.fn(),
  messagesCreate: vi.fn(),
  getEmailSettings: vi.fn(),
  decrypt: vi.fn(),
}));
const originalE2eEmailMode = process.env.E2E_EMAIL_MODE;

vi.mock("mailgun.js", () => ({
  default: class MockMailgun {
    client() {
      return {
        domains: {
          get: mocks.domainsGet,
        },
        messages: {
          create: mocks.messagesCreate,
        },
      };
    }
  },
}));

vi.mock("../../../../storage", () => ({
  storage: {
    getEmailSettings: mocks.getEmailSettings,
  },
}));

vi.mock("../../../utils/encryption", () => ({
  decrypt: mocks.decrypt,
}));

async function freshEmailService() {
  vi.resetModules();
  const mod = await import("../EmailService");
  return mod.emailService;
}

describe("EmailService.verifyConfiguration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getEmailSettings.mockResolvedValue({
      provider: "mailgun",
      mailgunDomain: "mg.powerplunge.com",
      mailgunFromName: "Power Plunge",
      mailgunFromEmail: "orders@powerplunge.com",
      mailgunApiKeyEncrypted: "encrypted-api-key",
      mailgunRegion: "us",
    });
    mocks.decrypt.mockReturnValue("key-test");
  });

  it("accepts an active Mailgun domain", async () => {
    mocks.domainsGet.mockResolvedValue({ domain: { name: "mg.powerplunge.com", state: "active" } });
    const emailService = await freshEmailService();

    await expect(emailService.verifyConfiguration()).resolves.toEqual({ valid: true });
  });

  it("rejects a non-active Mailgun domain", async () => {
    mocks.domainsGet.mockResolvedValue({ domain: { name: "mg.powerplunge.com", state: "unverified" } });
    const emailService = await freshEmailService();

    await expect(emailService.verifyConfiguration()).resolves.toEqual({
      valid: false,
      error: "Mailgun domain mg.powerplunge.com is unverified",
    });
  });

  it("rejects an active but disabled Mailgun domain", async () => {
    mocks.domainsGet.mockResolvedValue({
      domain: { name: "mg.powerplunge.com", state: "active", is_disabled: true },
    });
    const emailService = await freshEmailService();

    await expect(emailService.verifyConfiguration()).resolves.toEqual({
      valid: false,
      error: "Mailgun domain mg.powerplunge.com is disabled",
    });
  });

  it("preserves invalid API key error mapping", async () => {
    mocks.domainsGet.mockRejectedValue({ status: 401, message: "Unauthorized" });
    const emailService = await freshEmailService();

    await expect(emailService.verifyConfiguration()).resolves.toEqual({
      valid: false,
      error: "Invalid API key",
    });
  });

  it("preserves missing domain error mapping", async () => {
    mocks.domainsGet.mockRejectedValue({ status: 404, message: "Not found" });
    const emailService = await freshEmailService();

    await expect(emailService.verifyConfiguration()).resolves.toEqual({
      valid: false,
      error: "Domain not found or not verified",
    });
  });
});

describe("EmailService.sendTestEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.E2E_EMAIL_MODE;
    mocks.getEmailSettings.mockResolvedValue({
      provider: "mailgun",
      mailgunDomain: "mg.powerplunge.com",
      mailgunFromName: "Power Plunge",
      mailgunFromEmail: "orders@powerplunge.com",
      mailgunApiKeyEncrypted: "encrypted-api-key",
      mailgunRegion: "us",
    });
    mocks.decrypt.mockReturnValue("key-test");
    mocks.messagesCreate.mockResolvedValue({ id: "<test-message@mailgun>" });
  });

  afterEach(() => {
    if (originalE2eEmailMode === undefined) {
      delete process.env.E2E_EMAIL_MODE;
    } else {
      process.env.E2E_EMAIL_MODE = originalE2eEmailMode;
    }
  });

  it("can send a tagged Mailgun test-mode probe without delivery", async () => {
    const emailService = await freshEmailService();

    await expect(
      emailService.sendTestEmail("review@example.com", {
        mailgunTestMode: true,
        mailgunTags: ["powerplunge-mailgun-live-check-test"],
      }),
    ).resolves.toEqual({ success: true, messageId: "<test-message@mailgun>" });

    expect(mocks.messagesCreate).toHaveBeenCalledWith(
      "mg.powerplunge.com",
      expect.objectContaining({
        to: ["review@example.com"],
        from: "Power Plunge <orders@powerplunge.com>",
        "o:testmode": "yes",
        "o:tag": ["powerplunge-mailgun-live-check-test"],
      }),
    );
  });

  it("can bypass the e2e outbox for explicit Mailgun provider probes", async () => {
    process.env.E2E_EMAIL_MODE = "outbox";
    const emailService = await freshEmailService();

    try {
      await expect(
        emailService.sendTestEmail("review@example.com", {
          mailgunTestMode: true,
          mailgunTags: ["powerplunge-mailgun-live-check-test"],
          bypassOutbox: true,
        }),
      ).resolves.toEqual({ success: true, messageId: "<test-message@mailgun>" });
    } finally {
      delete process.env.E2E_EMAIL_MODE;
    }

    expect(mocks.messagesCreate).toHaveBeenCalledWith(
      "mg.powerplunge.com",
      expect.objectContaining({
        to: ["review@example.com"],
        "o:testmode": "yes",
        "o:tag": ["powerplunge-mailgun-live-check-test"],
      }),
    );
  });
});
