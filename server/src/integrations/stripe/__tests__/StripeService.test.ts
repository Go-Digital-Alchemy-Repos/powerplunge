import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockGetIntegrationSettings = vi.fn();
const mockDecrypt = vi.fn();

vi.mock("../../../../storage", () => ({
  storage: {
    getIntegrationSettings: () => mockGetIntegrationSettings(),
  },
}));

vi.mock("../../../utils/encryption", () => ({
  decrypt: (val: string) => mockDecrypt(val),
}));

vi.mock("stripe", () => {
  return {
    default: class MockStripe {
      constructor() {}
      accounts = { retrieve: vi.fn() };
      webhooks = { constructEvent: vi.fn() };
    },
  };
});

async function freshService() {
  vi.resetModules();
  const mod = await import("../StripeService");
  return mod.stripeService;
}

describe("StripeService.getConfig", () => {
  const ENV_BACKUP = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.STRIPE_MODE;
    delete process.env.STRIPE_SECRET_KEY_TEST;
    delete process.env.STRIPE_PUBLISHABLE_KEY_TEST;
    delete process.env.STRIPE_WEBHOOK_SECRET_TEST;
    delete process.env.STRIPE_SECRET_KEY_LIVE;
    delete process.env.STRIPE_PUBLISHABLE_KEY_LIVE;
    delete process.env.STRIPE_WEBHOOK_SECRET_LIVE;
  });

  afterEach(() => {
    Object.keys(process.env).forEach((key) => {
      if (key.startsWith("STRIPE_")) delete process.env[key];
    });
    Object.assign(process.env, ENV_BACKUP);
  });

  it("active mode test + valid test DB keys → returns test keys", async () => {
    const svc = await freshService();
    mockGetIntegrationSettings.mockResolvedValue({
      stripeActiveMode: "test",
      stripePublishableKeyTest: "pk_test_abc",
      stripeSecretKeyTestEncrypted: "enc_sk_test",
      stripeWebhookSecretTestEncrypted: "enc_wh_test",
    });
    mockDecrypt.mockImplementation((val: string) => {
      if (val === "enc_sk_test") return "sk_test_decrypted";
      if (val === "enc_wh_test") return "whsec_test_decrypted";
      return "";
    });

    const config = await svc.getConfig();

    expect(config.configured).toBe(true);
    expect(config.mode).toBe("test");
    expect(config.resolvedMode).toBe("test");
    expect(config.publishableKey).toBe("pk_test_abc");
    expect(config.secretKey).toBe("sk_test_decrypted");
    expect(config.webhookSecret).toBe("whsec_test_decrypted");
    expect(config.source).toBe("database");
  });

  it("active mode test + missing test DB keys + live DB keys present → does NOT return live keys", async () => {
    const svc = await freshService();
    mockGetIntegrationSettings.mockResolvedValue({
      stripeActiveMode: "test",
      stripePublishableKeyLive: "pk_live_xyz",
      stripeSecretKeyLiveEncrypted: "enc_sk_live",
    });

    const config = await svc.getConfig();

    expect(config.configured).toBe(false);
    expect(config.mode).toBe("test");
    expect(config.resolvedMode).toBe("test");
    expect(config.publishableKey).toBe("");
    expect(config.secretKey).toBe("");
    expect(config.source).toBe("none");
  });

  it("active mode live + valid live DB keys → returns live keys", async () => {
    const svc = await freshService();
    mockGetIntegrationSettings.mockResolvedValue({
      stripeActiveMode: "live",
      stripePublishableKeyLive: "pk_live_xyz",
      stripeSecretKeyLiveEncrypted: "enc_sk_live",
    });
    mockDecrypt.mockImplementation((val: string) => {
      if (val === "enc_sk_live") return "sk_live_decrypted";
      return "";
    });

    const config = await svc.getConfig();

    expect(config.configured).toBe(true);
    expect(config.mode).toBe("live");
    expect(config.resolvedMode).toBe("live");
    expect(config.source).toBe("database");
  });

  it("mode/key mismatch: activeMode=test but decrypted key is sk_live_ → unconfigured", async () => {
    const svc = await freshService();
    mockGetIntegrationSettings.mockResolvedValue({
      stripeActiveMode: "test",
      stripePublishableKeyTest: "pk_test_abc",
      stripeSecretKeyTestEncrypted: "enc_sk_wrong",
    });
    mockDecrypt.mockImplementation((val: string) => {
      if (val === "enc_sk_wrong") return "sk_live_WRONG_KEY";
      return "";
    });

    const config = await svc.getConfig();

    expect(config.configured).toBe(false);
    expect(config.mode).toBe("test");
    expect(config.source).toBe("none");
  });

  it("no modern DB keys, legacy config exists → uses legacy config", async () => {
    const svc = await freshService();
    mockGetIntegrationSettings.mockResolvedValue({
      stripeConfigured: true,
      stripePublishableKey: "pk_test_legacy",
      stripeSecretKeyEncrypted: "enc_sk_legacy",
      stripeMode: "test",
    });
    mockDecrypt.mockImplementation((val: string) => {
      if (val === "enc_sk_legacy") return "sk_test_legacy_decrypted";
      return "";
    });

    const config = await svc.getConfig();

    expect(config.configured).toBe(true);
    expect(config.mode).toBe("test");
    expect(config.source).toBe("database_legacy");
  });

  it("no DB config, env test keys → uses env", async () => {
    const svc = await freshService();
    mockGetIntegrationSettings.mockResolvedValue(null);
    process.env.STRIPE_SECRET_KEY_TEST = "sk_test_env";
    process.env.STRIPE_PUBLISHABLE_KEY_TEST = "pk_test_env";

    const config = await svc.getConfig();

    expect(config.configured).toBe(true);
    expect(config.mode).toBe("test");
    expect(config.source).toBe("environment");
  });

  it("env mode test + only live env keys → does NOT fall back to live", async () => {
    const svc = await freshService();
    mockGetIntegrationSettings.mockResolvedValue(null);
    process.env.STRIPE_MODE = "test";
    process.env.STRIPE_SECRET_KEY_LIVE = "sk_live_env";
    process.env.STRIPE_PUBLISHABLE_KEY_LIVE = "pk_live_env";

    const config = await svc.getConfig();

    expect(config.configured).toBe(false);
    expect(config.mode).toBe("test");
    expect(config.source).toBe("none");
  });

  it("cache is used within TTL", async () => {
    const svc = await freshService();
    mockGetIntegrationSettings.mockResolvedValue({
      stripeActiveMode: "test",
      stripePublishableKeyTest: "pk_test_abc",
      stripeSecretKeyTestEncrypted: "enc_sk_test",
    });
    mockDecrypt.mockReturnValue("sk_test_decrypted");

    await svc.getConfig();
    const callCount = mockGetIntegrationSettings.mock.calls.length;

    await svc.getConfig();
    expect(mockGetIntegrationSettings.mock.calls.length).toBe(callCount);
  });

  it("clearCache forces fresh resolution", async () => {
    const svc = await freshService();
    mockGetIntegrationSettings.mockResolvedValue({
      stripeActiveMode: "test",
      stripePublishableKeyTest: "pk_test_abc",
      stripeSecretKeyTestEncrypted: "enc_sk_test",
    });
    mockDecrypt.mockReturnValue("sk_test_decrypted");

    await svc.getConfig();
    const callCount = mockGetIntegrationSettings.mock.calls.length;

    svc.clearCache();
    await svc.getConfig();
    expect(mockGetIntegrationSettings.mock.calls.length).toBe(callCount + 1);
  });

  it("no DB config and no env keys → unconfigured", async () => {
    const svc = await freshService();
    mockGetIntegrationSettings.mockResolvedValue(null);

    const config = await svc.getConfig();

    expect(config.configured).toBe(false);
    expect(config.source).toBe("none");
  });

  it("active mode defaults to test when stripeActiveMode is not set", async () => {
    const svc = await freshService();
    mockGetIntegrationSettings.mockResolvedValue({
      stripePublishableKeyTest: "pk_test_abc",
      stripeSecretKeyTestEncrypted: "enc_sk_test",
    });
    mockDecrypt.mockReturnValue("sk_test_decrypted");

    const config = await svc.getConfig();

    expect(config.mode).toBe("test");
    expect(config.configured).toBe(true);
  });
});
