import { storage } from "../../../storage";
import { decrypt } from "../../utils/encryption";

export interface YouTubeShoppingConfig {
  configured: boolean;
  channelId: string | null;
  merchantId: string | null;
  clientId: string | null;
  hasClientSecret: boolean;
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
  lastSyncAt: Date | null;
  lastSyncStatus: string | null;
}

class YouTubeShoppingService {
  private configCache: YouTubeShoppingConfig | null = null;
  private lastConfigFetch: number = 0;
  private CACHE_TTL = 60000;

  async getConfig(): Promise<YouTubeShoppingConfig> {
    const now = Date.now();
    if (this.configCache && now - this.lastConfigFetch < this.CACHE_TTL) {
      return this.configCache;
    }

    const settings = await storage.getIntegrationSettings();
    this.configCache = {
      configured: settings?.youtubeShoppingConfigured || false,
      channelId: settings?.youtubeChannelId || null,
      merchantId: settings?.youtubeMerchantId || null,
      clientId: settings?.youtubeClientId || null,
      hasClientSecret: !!settings?.youtubeClientSecretEncrypted,
      hasAccessToken: !!settings?.youtubeAccessTokenEncrypted,
      hasRefreshToken: !!settings?.youtubeRefreshTokenEncrypted,
      lastSyncAt: settings?.youtubeLastSyncAt || null,
      lastSyncStatus: settings?.youtubeLastSyncStatus || "never",
    };
    this.lastConfigFetch = now;
    return this.configCache;
  }

  isConfigured(): boolean {
    return this.configCache?.configured || false;
  }

  getConfigSummary(): YouTubeShoppingConfig | null {
    return this.configCache;
  }

  async verifyCredentials(): Promise<{ success: boolean; error?: string; channelName?: string }> {
    try {
      const settings = await storage.getIntegrationSettings();
      if (!settings?.youtubeShoppingConfigured || !settings?.youtubeAccessTokenEncrypted) {
        return { success: false, error: "YouTube Shopping is not configured. Please provide credentials first." };
      }

      const accessToken = decrypt(settings.youtubeAccessTokenEncrypted);
      if (!accessToken) {
        return { success: false, error: "Failed to decrypt access token" };
      }

      const channelId = settings.youtubeChannelId;
      if (!channelId) {
        return { success: false, error: "Channel ID is missing" };
      }

      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        return { success: false, error: `YouTube API returned ${response.status}: ${response.statusText}` };
      }

      const data = await response.json();
      if (data.items && data.items.length > 0) {
        return { success: true, channelName: data.items[0].snippet?.title || channelId };
      }

      return { success: false, error: "Channel not found or inaccessible" };
    } catch (error: any) {
      return { success: false, error: error.message || "Connection failed" };
    }
  }

  async syncCatalog(): Promise<{ success: boolean; error?: string; itemCount?: number }> {
    try {
      const settings = await storage.getIntegrationSettings();
      if (!settings?.youtubeShoppingConfigured || !settings?.youtubeAccessTokenEncrypted) {
        return { success: false, error: "YouTube Shopping is not configured" };
      }

      const accessToken = decrypt(settings.youtubeAccessTokenEncrypted);
      if (!accessToken) {
        return { success: false, error: "Failed to decrypt access token" };
      }

      const merchantId = settings.youtubeMerchantId;
      if (!merchantId) {
        return { success: false, error: "Merchant ID is missing" };
      }

      const response = await fetch(
        `https://shoppingcontent.googleapis.com/content/v2.1/${merchantId}/products`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        await storage.updateIntegrationSettings({
          youtubeLastSyncAt: new Date(),
          youtubeLastSyncStatus: "failed",
        });
        return { success: false, error: `Google Content API returned ${response.status}: ${response.statusText}` };
      }

      const data = await response.json();
      await storage.updateIntegrationSettings({
        youtubeLastSyncAt: new Date(),
        youtubeLastSyncStatus: "success",
      });

      return { success: true, itemCount: data.resources?.length || 0 };
    } catch (error: any) {
      await storage.updateIntegrationSettings({
        youtubeLastSyncAt: new Date(),
        youtubeLastSyncStatus: "failed",
      }).catch(() => {});
      return { success: false, error: error.message || "Sync failed" };
    }
  }

  clearCache(): void {
    this.configCache = null;
    this.lastConfigFetch = 0;
  }
}

export const youtubeShoppingService = new YouTubeShoppingService();
