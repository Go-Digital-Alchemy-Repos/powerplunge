export interface MetaEnvConfig {
  accessToken?: string;
  appSecret?: string;
  pixelId?: string;
  catalogId?: string;
  productFeedId?: string;
  testEventCode?: string;
  catalogFeedKey?: string;
  capiEnabled: boolean;
}

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function readEnvBoolean(name: string, fallback = false): boolean {
  const value = readEnv(name);
  if (!value) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export function getMetaEnvConfig(): MetaEnvConfig {
  return {
    accessToken: readEnv("META_SYSTEM_USER_TOKEN") || readEnv("META_ACCESS_TOKEN"),
    appSecret: readEnv("META_APP_SECRET"),
    pixelId: readEnv("META_PIXEL_ID") || readEnv("META_DATASET_ID"),
    catalogId: readEnv("META_CATALOG_ID"),
    productFeedId: readEnv("META_PRODUCT_FEED_ID"),
    testEventCode: readEnv("META_TEST_EVENT_CODE"),
    catalogFeedKey: readEnv("META_CATALOG_FEED_KEY"),
    capiEnabled: readEnvBoolean("META_CAPI_ENABLED", false),
  };
}

export function isMetaEnvConfigured(config: MetaEnvConfig = getMetaEnvConfig()): boolean {
  return !!(config.accessToken && (config.pixelId || config.catalogId || config.productFeedId));
}

export function isMetaEnvCapiConfigured(config: MetaEnvConfig = getMetaEnvConfig()): boolean {
  return !!(config.accessToken && config.pixelId);
}
