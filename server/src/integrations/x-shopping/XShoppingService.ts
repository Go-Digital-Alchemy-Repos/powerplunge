import { storage } from "../../../storage";
import { decrypt } from "../../utils/encryption";

export interface XShoppingConfig {
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

class XShoppingService {
  private configCache: XShoppingConfig | null = null;
  private lastConfigFetch: number = 0;
  private CACHE_TTL = 60000;

  async getConfig(): Promise<XShoppingConfig> {
    const now = Date.now();
    if (this.configCache && now - this.lastConfigFetch < this.CACHE_TTL) {
      return this.configCache;
    }

    const settings = await storage.getIntegrationSettings();
    this.configCache = {
      configured: settings?.xShoppingConfigured || false,
      accountId: settings?.xAccountId || null,
      catalogId: settings?.xCatalogId || null,
      clientId: settings?.xClientId || null,
      hasClientSecret: !!settings?.xClientSecretEncrypted,
      hasAccessToken: !!settings?.xAccessTokenEncrypted,
      hasRefreshToken: !!settings?.xRefreshTokenEncrypted,
      lastSyncAt: settings?.xLastSyncAt || null,
      lastSyncStatus: settings?.xLastSyncStatus || "never",
    };
    this.lastConfigFetch = now;
    return this.configCache;
  }

  isConfigured(): boolean {
    return this.configCache?.configured || false;
  }

  getConfigSummary(): XShoppingConfig | null {
    return this.configCache;
  }

  async verifyCredentials(): Promise<{ success: boolean; error?: string; accountName?: string }> {
    try {
      const settings = await storage.getIntegrationSettings();
      if (!settings?.xShoppingConfigured || !settings?.xAccessTokenEncrypted) {
        return { success: false, error: "X Shopping is not configured. Please provide credentials first." };
      }

      const accessToken = decrypt(settings.xAccessTokenEncrypted);
      if (!accessToken) {
        return { success: false, error: "Failed to decrypt access token" };
      }

      const response = await fetch("https://api.x.com/2/users/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return { success: false, error: `X API returned ${response.status}: ${response.statusText}` };
      }

      const data = await response.json();
      if (data.data?.username) {
        return { success: true, accountName: data.data.username };
      }

      return { success: false, error: "Unable to verify X account access" };
    } catch (error: any) {
      return { success: false, error: error.message || "Connection failed" };
    }
  }

  async syncCatalog(): Promise<{ success: boolean; error?: string; itemCount?: number }> {
    try {
      const settings = await storage.getIntegrationSettings();
      if (!settings?.xShoppingConfigured || !settings?.xAccessTokenEncrypted) {
        return { success: false, error: "X Shopping is not configured" };
      }

      const accessToken = decrypt(settings.xAccessTokenEncrypted);
      if (!accessToken) {
        return { success: false, error: "Failed to decrypt access token" };
      }

      const accountId = settings.xAccountId;
      if (!accountId) {
        return { success: false, error: "Account ID is missing" };
      }

      const response = await fetch(
        `https://api.x.com/2/shopping/catalogs?account_id=${accountId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        await storage.updateIntegrationSettings({
          xLastSyncAt: new Date(),
          xLastSyncStatus: "failed",
        });
        return { success: false, error: `X API returned ${response.status}: ${response.statusText}` };
      }

      const data = await response.json();
      await storage.updateIntegrationSettings({
        xLastSyncAt: new Date(),
        xLastSyncStatus: "success",
      });

      return { success: true, itemCount: data.data?.length || 0 };
    } catch (error: any) {
      await storage.updateIntegrationSettings({
        xLastSyncAt: new Date(),
        xLastSyncStatus: "failed",
      }).catch(() => {});
      return { success: false, error: error.message || "Sync failed" };
    }
  }

  clearCache(): void {
    this.configCache = null;
    this.lastConfigFetch = 0;
  }
}

export const xShoppingService = new XShoppingService();
