import { storage } from "../../../storage";
import { decrypt } from "../../utils/encryption";
import { getMetaEnvConfig } from "../meta/meta-env";

export interface InstagramShopConfig {
  configured: boolean;
  businessAccountId: string | null;
  catalogId: string | null;
  hasMetaAccessToken: boolean;
}

class InstagramShopService {
  private configCache: InstagramShopConfig | null = null;
  private lastConfigFetch: number = 0;
  private CACHE_TTL = 60000;

  private resolveMetaAccessToken(settings: Awaited<ReturnType<typeof storage.getIntegrationSettings>>): string | null {
    const metaEnv = getMetaEnvConfig();
    const metaToken = settings?.metaAccessTokenEncrypted
      ? decrypt(settings.metaAccessTokenEncrypted)
      : (metaEnv.accessToken || null);
    return metaToken || null;
  }

  async getConfig(): Promise<InstagramShopConfig> {
    const now = Date.now();
    if (this.configCache && now - this.lastConfigFetch < this.CACHE_TTL) {
      return this.configCache;
    }

    const settings = await storage.getIntegrationSettings();
    const accessToken = this.resolveMetaAccessToken(settings);
    this.configCache = {
      configured: !!(
        settings?.instagramShopConfigured &&
        settings?.instagramBusinessAccountId &&
        accessToken
      ),
      businessAccountId: settings?.instagramBusinessAccountId || null,
      catalogId: settings?.instagramCatalogId || null,
      hasMetaAccessToken: !!accessToken,
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
      if (!settings?.instagramShopConfigured) {
        return { success: false, error: "Instagram Shop is not configured. Please provide credentials first." };
      }

      const accessToken = this.resolveMetaAccessToken(settings);
      if (!accessToken) {
        return { success: false, error: "Meta Marketing access token is missing. Configure Meta Marketing first." };
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
