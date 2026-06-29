import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  domainsGet: vi.fn(),
  getEmailSettings: vi.fn(),
  decrypt: vi.fn(),
}));

vi.mock("mailgun.js", () => ({
  default: class MockMailgun {
    client() {
      return {
        domains: {
          get: mocks.domainsGet,
        },
        messages: {
          create: vi.fn(),
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
