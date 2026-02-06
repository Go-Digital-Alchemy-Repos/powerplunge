import { storage } from "../../../storage";
import { decrypt } from "../../utils/encryption";

export interface InstagramShopConfig {
  configured: boolean;
  businessAccountId: string | null;
  catalogId: string | null;
  hasAccessToken: boolean;
}

class InstagramShopService {
  private configCache: InstagramShopConfig | null = null;
  private lastConfigFetch: number = 0;
  private CACHE_TTL = 60000;

  async getConfig(): Promise<InstagramShopConfig> {
    const now = Date.now();
    if (this.configCache && now - this.lastConfigFetch < this.CACHE_TTL) {
      return this.configCache;
    }

    const settings = await storage.getIntegrationSettings();
    this.configCache = {
      configured: settings?.instagramShopConfigured || false,
      businessAccountId: settings?.instagramBusinessAccountId || null,
      catalogId: settings?.instagramCatalogId || null,
      hasAccessToken: !!settings?.instagramAccessTokenEncrypted,
    };
    this.lastConfigFetch = now;
    return this.configCache;
  }

  isConfigured(): boolean {
    return this.configCache?.configured || false;
  }

  getConfigSummary(): InstagramShopConfig | null {
    return this.configCache;
  }

  async verify(): Promise<{ success: boolean; error?: string; accountName?: string }> {
    try {
      const settings = await storage.getIntegrationSettings();
      if (!settings?.instagramShopConfigured || !settings?.instagramAccessTokenEncrypted) {
        return { success: false, error: "Instagram Shop is not configured. Please provide credentials first." };
      }

      const accessToken = decrypt(settings.instagramAccessTokenEncrypted);
      if (!accessToken) {
        return { success: false, error: "Failed to decrypt access token" };
      }

      const accountId = settings.instagramBusinessAccountId;
      if (!accountId) {
        return { success: false, error: "Business Account ID is missing" };
      }

      const response = await fetch(
        `https://graph.facebook.com/v19.0/${accountId}?fields=name,username,ig_id&access_token=${accessToken}`
      );

      if (!response.ok) {
        return { success: false, error: `Instagram API returned ${response.status}: ${response.statusText}` };
      }

      const data = await response.json();
      if (data.error) {
        return { success: false, error: data.error.message || "API error" };
      }

      return { success: true, accountName: data.name || data.username || accountId };
    } catch (error: any) {
      return { success: false, error: error.message || "Connection failed" };
    }
  }

  clearCache(): void {
    this.configCache = null;
    this.lastConfigFetch = 0;
  }
}

export const instagramShopService = new InstagramShopService();
