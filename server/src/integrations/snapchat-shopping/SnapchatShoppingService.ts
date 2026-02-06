import { storage } from "../../../storage";
import { decrypt } from "../../utils/encryption";

export interface SnapchatShoppingConfig {
  configured: boolean;
  accountId: string | null;
  catalogId: string | null;
  clientId: string | null;
  hasClientSecret: boolean;
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
  lastSyncAt: Date | null;
  lastSyncStatus: string | null;
}

class SnapchatShoppingService {
  private configCache: SnapchatShoppingConfig | null = null;
  private lastConfigFetch: number = 0;
  private CACHE_TTL = 60000;

  async getConfig(): Promise<SnapchatShoppingConfig> {
    const now = Date.now();
    if (this.configCache && now - this.lastConfigFetch < this.CACHE_TTL) {
      return this.configCache;
    }

    const settings = await storage.getIntegrationSettings();
    this.configCache = {
      configured: settings?.snapchatShoppingConfigured || false,
      accountId: settings?.snapchatAccountId || null,
      catalogId: settings?.snapchatCatalogId || null,
      clientId: settings?.snapchatClientId || null,
      hasClientSecret: !!settings?.snapchatClientSecretEncrypted,
      hasAccessToken: !!settings?.snapchatAccessTokenEncrypted,
      hasRefreshToken: !!settings?.snapchatRefreshTokenEncrypted,
      lastSyncAt: settings?.snapchatLastSyncAt || null,
      lastSyncStatus: settings?.snapchatLastSyncStatus || "never",
    };
    this.lastConfigFetch = now;
    return this.configCache;
  }

  isConfigured(): boolean {
    return this.configCache?.configured || false;
  }

  getConfigSummary(): SnapchatShoppingConfig | null {
    return this.configCache;
  }

  async verifyCredentials(): Promise<{ success: boolean; error?: string; accountName?: string }> {
    try {
      const settings = await storage.getIntegrationSettings();
      if (!settings?.snapchatShoppingConfigured || !settings?.snapchatAccessTokenEncrypted) {
        return { success: false, error: "Snapchat Shopping is not configured. Please provide credentials first." };
      }

      const accessToken = decrypt(settings.snapchatAccessTokenEncrypted);
      if (!accessToken) {
        return { success: false, error: "Failed to decrypt access token" };
      }

      const response = await fetch("https://adsapi.snapchat.com/v1/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return { success: false, error: `Snapchat API returned ${response.status}: ${response.statusText}` };
      }

      const data = await response.json();
      if (data.me?.display_name) {
        return { success: true, accountName: data.me.display_name };
      }

      return { success: false, error: "Unable to verify Snapchat account access" };
    } catch (error: any) {
      return { success: false, error: error.message || "Connection failed" };
    }
  }

  async syncCatalog(): Promise<{ success: boolean; error?: string; itemCount?: number }> {
    try {
      const settings = await storage.getIntegrationSettings();
      if (!settings?.snapchatShoppingConfigured || !settings?.snapchatAccessTokenEncrypted) {
        return { success: false, error: "Snapchat Shopping is not configured" };
      }

      const accessToken = decrypt(settings.snapchatAccessTokenEncrypted);
      if (!accessToken) {
        return { success: false, error: "Failed to decrypt access token" };
      }

      const catalogId = settings.snapchatCatalogId;
      if (!catalogId) {
        return { success: false, error: "Catalog ID is missing" };
      }

      const response = await fetch(
        `https://adsapi.snapchat.com/v1/catalogs/${catalogId}/product_feeds`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        await storage.updateIntegrationSettings({
          snapchatLastSyncAt: new Date(),
          snapchatLastSyncStatus: "failed",
        });
        return { success: false, error: `Snapchat API returned ${response.status}: ${response.statusText}` };
      }

      const data = await response.json();
      await storage.updateIntegrationSettings({
        snapchatLastSyncAt: new Date(),
        snapchatLastSyncStatus: "success",
      });

      return { success: true, itemCount: data.product_feeds?.length || 0 };
    } catch (error: any) {
      await storage.updateIntegrationSettings({
        snapchatLastSyncAt: new Date(),
        snapchatLastSyncStatus: "failed",
      }).catch(() => {});
      return { success: false, error: error.message || "Sync failed" };
    }
  }

  clearCache(): void {
    this.configCache = null;
    this.lastConfigFetch = 0;
  }
}

export const snapchatShoppingService = new SnapchatShoppingService();
