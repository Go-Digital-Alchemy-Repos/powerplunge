import { storage } from "../../../storage";
import { decrypt } from "../../utils/encryption";

export interface PinterestShoppingConfig {
  configured: boolean;
  merchantId: string | null;
  catalogId: string | null;
  clientId: string | null;
  hasClientSecret: boolean;
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
  lastSyncAt: Date | null;
  lastSyncStatus: string | null;
}

class PinterestShoppingService {
  private configCache: PinterestShoppingConfig | null = null;
  private lastConfigFetch: number = 0;
  private CACHE_TTL = 60000;

  async getConfig(): Promise<PinterestShoppingConfig> {
    const now = Date.now();
    if (this.configCache && now - this.lastConfigFetch < this.CACHE_TTL) {
      return this.configCache;
    }

    const settings = await storage.getIntegrationSettings();
    this.configCache = {
      configured: settings?.pinterestShoppingConfigured || false,
      merchantId: settings?.pinterestMerchantId || null,
      catalogId: settings?.pinterestCatalogId || null,
      clientId: settings?.pinterestClientId || null,
      hasClientSecret: !!settings?.pinterestClientSecretEncrypted,
      hasAccessToken: !!settings?.pinterestAccessTokenEncrypted,
      hasRefreshToken: !!settings?.pinterestRefreshTokenEncrypted,
      lastSyncAt: settings?.pinterestLastSyncAt || null,
      lastSyncStatus: settings?.pinterestLastSyncStatus || "never",
    };
    this.lastConfigFetch = now;
    return this.configCache;
  }

  isConfigured(): boolean {
    return this.configCache?.configured || false;
  }

  getConfigSummary(): PinterestShoppingConfig | null {
    return this.configCache;
  }

  async verifyCredentials(): Promise<{ success: boolean; error?: string; merchantName?: string }> {
    try {
      const settings = await storage.getIntegrationSettings();
      if (!settings?.pinterestShoppingConfigured || !settings?.pinterestAccessTokenEncrypted) {
        return { success: false, error: "Pinterest Shopping is not configured. Please provide credentials first." };
      }

      const accessToken = decrypt(settings.pinterestAccessTokenEncrypted);
      if (!accessToken) {
        return { success: false, error: "Failed to decrypt access token" };
      }

      const response = await fetch("https://api.pinterest.com/v5/user_account", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return { success: false, error: `Pinterest API returned ${response.status}: ${response.statusText}` };
      }

      const data = await response.json();
      if (data.username) {
        return { success: true, merchantName: data.username };
      }

      return { success: false, error: "Unable to verify Pinterest account access" };
    } catch (error: any) {
      return { success: false, error: error.message || "Connection failed" };
    }
  }

  async syncCatalog(): Promise<{ success: boolean; error?: string; itemCount?: number }> {
    try {
      const settings = await storage.getIntegrationSettings();
      if (!settings?.pinterestShoppingConfigured || !settings?.pinterestAccessTokenEncrypted) {
        return { success: false, error: "Pinterest Shopping is not configured" };
      }

      const accessToken = decrypt(settings.pinterestAccessTokenEncrypted);
      if (!accessToken) {
        return { success: false, error: "Failed to decrypt access token" };
      }

      const merchantId = settings.pinterestMerchantId;
      if (!merchantId) {
        return { success: false, error: "Merchant ID is missing" };
      }

      const response = await fetch(
        `https://api.pinterest.com/v5/catalogs`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        await storage.updateIntegrationSettings({
          pinterestLastSyncAt: new Date(),
          pinterestLastSyncStatus: "failed",
        });
        return { success: false, error: `Pinterest API returned ${response.status}: ${response.statusText}` };
      }

      const data = await response.json();
      await storage.updateIntegrationSettings({
        pinterestLastSyncAt: new Date(),
        pinterestLastSyncStatus: "success",
      });

      return { success: true, itemCount: data.items?.length || 0 };
    } catch (error: any) {
      await storage.updateIntegrationSettings({
        pinterestLastSyncAt: new Date(),
        pinterestLastSyncStatus: "failed",
      }).catch(() => {});
      return { success: false, error: error.message || "Sync failed" };
    }
  }

  clearCache(): void {
    this.configCache = null;
    this.lastConfigFetch = 0;
  }
}

export const pinterestShoppingService = new PinterestShoppingService();
