import { storage } from "../../../storage";
import { decrypt } from "../../utils/encryption";

export interface TikTokShopConfig {
  configured: boolean;
  shopId: string | null;
  appKey: string | null;
  hasAppSecret: boolean;
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
}

class TikTokShopService {
  private configCache: TikTokShopConfig | null = null;
  private lastConfigFetch: number = 0;
  private CACHE_TTL = 60000;

  async getConfig(): Promise<TikTokShopConfig> {
    const now = Date.now();
    if (this.configCache && now - this.lastConfigFetch < this.CACHE_TTL) {
      return this.configCache;
    }

    const settings = await storage.getIntegrationSettings();
    this.configCache = {
      configured: settings?.tiktokShopConfigured || false,
      shopId: settings?.tiktokShopId || null,
      appKey: settings?.tiktokAppKey || null,
      hasAppSecret: !!settings?.tiktokAppSecretEncrypted,
      hasAccessToken: !!settings?.tiktokAccessTokenEncrypted,
      hasRefreshToken: !!settings?.tiktokRefreshTokenEncrypted,
    };
    this.lastConfigFetch = now;
    return this.configCache;
  }

  isConfigured(): boolean {
    return this.configCache?.configured || false;
  }

  getConfigSummary(): TikTokShopConfig | null {
    return this.configCache;
  }

  async verify(): Promise<{ success: boolean; error?: string; shopName?: string }> {
    try {
      const settings = await storage.getIntegrationSettings();
      if (!settings?.tiktokShopConfigured || !settings?.tiktokAccessTokenEncrypted) {
        return { success: false, error: "TikTok Shop is not configured. Please provide credentials first." };
      }

      const accessToken = decrypt(settings.tiktokAccessTokenEncrypted);
      if (!accessToken) {
        return { success: false, error: "Failed to decrypt access token" };
      }

      const appKey = settings.tiktokAppKey;
      if (!appKey) {
        return { success: false, error: "App Key is missing" };
      }

      const response = await fetch(
        `https://open-api.tiktokglobalshop.com/authorization/202309/shops?app_key=${appKey}`,
        {
          headers: {
            "x-tts-access-token": accessToken,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        return { success: false, error: `TikTok API returned ${response.status}: ${response.statusText}` };
      }

      const data = await response.json();
      if (data.code === 0 && data.data?.shops?.length > 0) {
        return { success: true, shopName: data.data.shops[0].shop_name };
      }

      return { success: false, error: data.message || "Unable to verify shop access" };
    } catch (error: any) {
      return { success: false, error: error.message || "Connection failed" };
    }
  }

  clearCache(): void {
    this.configCache = null;
    this.lastConfigFetch = 0;
  }
}

export const tiktokShopService = new TikTokShopService();
