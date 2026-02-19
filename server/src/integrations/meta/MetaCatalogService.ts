import crypto from "crypto";
import { storage } from "../../../storage";
import { decrypt, encrypt } from "../../utils/encryption";
import { getStaticBaseUrl } from "../../utils/base-url";
import { metaGraphClient } from "./MetaGraphClient";
import { errorAlertingService } from "../../services/error-alerting.service";
import { getMetaEnvConfig, isMetaEnvConfigured } from "./meta-env";

export interface MetaCatalogConfigSummary {
  configured: boolean;
  pixelId: string | null;
  catalogId: string | null;
  productFeedId: string | null;
  hasAccessToken: boolean;
  hasAppSecret: boolean;
  hasTestEventCode: boolean;
  hasCatalogFeedKey: boolean;
  capiEnabled: boolean;
  catalogFeedKey: string | null;
  lastSyncAt: Date | null;
  lastSyncStatus: string | null;
  capiLastDispatchAt: Date | null;
  capiLastDispatchStatus: string | null;
}

class MetaCatalogService {
  async getConfigSummary(): Promise<MetaCatalogConfigSummary> {
    const settings = await storage.getIntegrationSettings();
    const env = getMetaEnvConfig();
    const catalogFeedKey =
      settings?.metaCatalogFeedKeyEncrypted
        ? decrypt(settings.metaCatalogFeedKeyEncrypted)
        : env.catalogFeedKey || null;
    const pixelId = settings?.metaPixelId || env.pixelId || null;
    const catalogId = settings?.metaCatalogId || env.catalogId || null;
    const productFeedId = settings?.metaProductFeedId || env.productFeedId || null;
    const hasAccessToken = !!settings?.metaAccessTokenEncrypted || !!env.accessToken;
    const hasAppSecret = !!settings?.metaAppSecretEncrypted || !!env.appSecret;
    const hasTestEventCode = !!settings?.metaTestEventCodeEncrypted || !!env.testEventCode;
    const hasCatalogFeedKey = !!settings?.metaCatalogFeedKeyEncrypted || !!env.catalogFeedKey;
    return {
      configured: !!settings?.metaMarketingConfigured || isMetaEnvConfigured(env),
      pixelId,
      catalogId,
      productFeedId,
      hasAccessToken,
      hasAppSecret,
      hasTestEventCode,
      hasCatalogFeedKey,
      capiEnabled: settings?.metaMarketingConfigured ? !!settings.metaCapiEnabled : env.capiEnabled,
      catalogFeedKey,
      lastSyncAt: settings?.metaCatalogLastSyncAt || null,
      lastSyncStatus: settings?.metaCatalogLastSyncStatus || "never",
      capiLastDispatchAt: settings?.metaCapiLastDispatchAt || null,
      capiLastDispatchStatus: settings?.metaCapiLastDispatchStatus || "never",
    };
  }

  async ensureCatalogFeedKey(): Promise<string> {
    const env = getMetaEnvConfig();
    if (env.catalogFeedKey) return env.catalogFeedKey;

    const settings = await storage.getIntegrationSettings();
    if (settings?.metaCatalogFeedKeyEncrypted) {
      return decrypt(settings.metaCatalogFeedKeyEncrypted);
    }
    const newKey = crypto.randomBytes(24).toString("hex");
    await storage.updateIntegrationSettings({
      metaCatalogFeedKeyEncrypted: encrypt(newKey),
    });
    return newKey;
  }

  async getCatalogFeedUrl(feedKey?: string): Promise<string> {
    const key = feedKey || (await this.ensureCatalogFeedKey());
    return `${getStaticBaseUrl()}/api/integrations/meta/catalog-feed.tsv?key=${encodeURIComponent(key)}`;
  }

  async verify(): Promise<{ success: boolean; error?: string; details?: Record<string, any> }> {
    try {
      const details = await metaGraphClient.verifyAssets();
      return { success: true, details: details.details };
    } catch (error: any) {
      await errorAlertingService.alertSystemError({
        component: "meta_catalog_verify",
        operation: "verify_assets",
        errorMessage: error.message || "Meta catalog verify failed",
        metadata: { provider: "meta" },
      });
      return { success: false, error: error.message || "Verification failed" };
    }
  }

  async syncCatalog(): Promise<{ success: boolean; error?: string; uploadId?: string }> {
    try {
      const summary = await this.getConfigSummary();
      if (!summary.configured) {
        return { success: false, error: "Meta Marketing is not configured" };
      }
      if (!summary.productFeedId) {
        return { success: false, error: "Meta product feed ID is required" };
      }

      const feedKey = await this.ensureCatalogFeedKey();
      const feedUrl = await this.getCatalogFeedUrl(feedKey);
      const upload = await metaGraphClient.call<any>("POST", `/${summary.productFeedId}/uploads`, {
        body: {
          url: feedUrl,
          update_only: false,
        },
      });

      await storage.updateIntegrationSettings({
        metaCatalogLastSyncAt: new Date(),
        metaCatalogLastSyncStatus: "success",
      });

      return { success: true, uploadId: upload?.id };
    } catch (error: any) {
      await errorAlertingService.alertSystemError({
        component: "meta_catalog_sync",
        operation: "sync_catalog",
        errorMessage: error.message || "Meta catalog sync failed",
        metadata: { provider: "meta" },
      });
      await storage
        .updateIntegrationSettings({
          metaCatalogLastSyncAt: new Date(),
          metaCatalogLastSyncStatus: "failed",
        })
        .catch(() => {});
      return { success: false, error: error.message || "Catalog sync failed" };
    }
  }

  async getTestEventCode(): Promise<string | null> {
    const env = getMetaEnvConfig();
    const settings = await storage.getIntegrationSettings();
    if (!settings?.metaTestEventCodeEncrypted) return env.testEventCode || null;
    return decrypt(settings.metaTestEventCodeEncrypted);
  }
}

export const metaCatalogService = new MetaCatalogService();
