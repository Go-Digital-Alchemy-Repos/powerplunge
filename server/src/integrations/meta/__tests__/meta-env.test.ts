import { afterEach, describe, expect, it } from "vitest";
import {
  getMetaEnvConfig,
  isMetaEnvCapiConfigured,
  isMetaEnvConfigured,
} from "../meta-env";

function clearMetaEnv() {
  delete process.env.META_SYSTEM_USER_TOKEN;
  delete process.env.META_ACCESS_TOKEN;
  delete process.env.META_APP_SECRET;
  delete process.env.META_PIXEL_ID;
  delete process.env.META_DATASET_ID;
  delete process.env.META_CATALOG_ID;
  delete process.env.META_PRODUCT_FEED_ID;
  delete process.env.META_TEST_EVENT_CODE;
  delete process.env.META_CATALOG_FEED_KEY;
  delete process.env.META_CAPI_ENABLED;
}

afterEach(() => {
  clearMetaEnv();
});

describe("meta-env", () => {
  it("uses system user token and pixel-based identifiers", () => {
    process.env.META_SYSTEM_USER_TOKEN = "token";
    process.env.META_PIXEL_ID = "pixel_1";
    process.env.META_APP_SECRET = "secret";
    process.env.META_CAPI_ENABLED = "true";

    const cfg = getMetaEnvConfig();
    expect(cfg.accessToken).toBe("token");
    expect(cfg.pixelId).toBe("pixel_1");
    expect(cfg.appSecret).toBe("secret");
    expect(cfg.capiEnabled).toBe(true);
    expect(isMetaEnvConfigured(cfg)).toBe(true);
    expect(isMetaEnvCapiConfigured(cfg)).toBe(true);
  });

  it("falls back to META_ACCESS_TOKEN and dataset id", () => {
    process.env.META_ACCESS_TOKEN = "fallback_token";
    process.env.META_DATASET_ID = "dataset_1";

    const cfg = getMetaEnvConfig();
    expect(cfg.accessToken).toBe("fallback_token");
    expect(cfg.pixelId).toBe("dataset_1");
    expect(cfg.capiEnabled).toBe(false);
    expect(isMetaEnvConfigured(cfg)).toBe(true);
    expect(isMetaEnvCapiConfigured(cfg)).toBe(true);
  });

  it("returns not configured without access token", () => {
    process.env.META_PIXEL_ID = "pixel_1";

    const cfg = getMetaEnvConfig();
    expect(isMetaEnvConfigured(cfg)).toBe(false);
    expect(isMetaEnvCapiConfigured(cfg)).toBe(false);
  });
});
