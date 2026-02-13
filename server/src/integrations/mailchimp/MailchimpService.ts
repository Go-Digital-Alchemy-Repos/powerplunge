import { storage } from "../../../storage";
import { decrypt } from "../../utils/encryption";

export interface MailchimpConfig {
  configured: boolean;
  serverPrefix: string | null;
  audienceId: string | null;
  hasApiKey: boolean;
  lastSyncAt: Date | null;
  lastSyncStatus: string | null;
}

class MailchimpService {
  private configCache: MailchimpConfig | null = null;
  private lastConfigFetch: number = 0;
  private CACHE_TTL = 60000;

  async getConfig(): Promise<MailchimpConfig> {
    const now = Date.now();
    if (this.configCache && now - this.lastConfigFetch < this.CACHE_TTL) {
      return this.configCache;
    }

    const settings = await storage.getIntegrationSettings();
    this.configCache = {
      configured: settings?.mailchimpConfigured || false,
      serverPrefix: settings?.mailchimpServerPrefix || null,
      audienceId: settings?.mailchimpAudienceId || null,
      hasApiKey: !!settings?.mailchimpApiKeyEncrypted,
      lastSyncAt: settings?.mailchimpLastSyncAt || null,
      lastSyncStatus: settings?.mailchimpLastSyncStatus || "never",
    };
    this.lastConfigFetch = now;
    return this.configCache;
  }

  isConfigured(): boolean {
    return this.configCache?.configured || false;
  }

  getConfigSummary(): MailchimpConfig | null {
    return this.configCache;
  }

  async verifyCredentials(): Promise<{ success: boolean; error?: string; accountName?: string }> {
    try {
      const settings = await storage.getIntegrationSettings();
      if (!settings?.mailchimpConfigured || !settings?.mailchimpApiKeyEncrypted) {
        return { success: false, error: "Mailchimp is not configured. Please provide credentials first." };
      }

      const apiKey = decrypt(settings.mailchimpApiKeyEncrypted);
      if (!apiKey) {
        return { success: false, error: "Failed to decrypt API key" };
      }

      const serverPrefix = settings.mailchimpServerPrefix;
      if (!serverPrefix) {
        return { success: false, error: "Server prefix is not configured" };
      }

      const response = await fetch(`https://${serverPrefix}.api.mailchimp.com/3.0/`, {
        headers: {
          Authorization: `Basic ${Buffer.from(`anystring:${apiKey}`).toString("base64")}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return { success: false, error: `Mailchimp API returned ${response.status}: ${response.statusText}` };
      }

      const data = await response.json();
      if (data.account_name) {
        return { success: true, accountName: data.account_name };
      }

      return { success: false, error: "Unable to verify Mailchimp account access" };
    } catch (error: any) {
      return { success: false, error: error.message || "Connection failed" };
    }
  }

  async addSubscriber(email: string, firstName?: string, lastName?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const settings = await storage.getIntegrationSettings();
      if (!settings?.mailchimpConfigured || !settings?.mailchimpApiKeyEncrypted) {
        return { success: false, error: "Mailchimp is not configured" };
      }

      const apiKey = decrypt(settings.mailchimpApiKeyEncrypted);
      if (!apiKey) {
        return { success: false, error: "Failed to decrypt API key" };
      }

      const serverPrefix = settings.mailchimpServerPrefix;
      const audienceId = settings.mailchimpAudienceId;
      if (!serverPrefix || !audienceId) {
        return { success: false, error: "Mailchimp server prefix or audience ID not configured" };
      }

      const subscriberData: any = {
        email_address: email,
        status: "subscribed",
        merge_fields: {},
      };

      if (firstName) subscriberData.merge_fields.FNAME = firstName;
      if (lastName) subscriberData.merge_fields.LNAME = lastName;

      const response = await fetch(
        `https://${serverPrefix}.api.mailchimp.com/3.0/lists/${audienceId}/members`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`anystring:${apiKey}`).toString("base64")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(subscriberData),
        }
      );

      if (response.ok) {
        return { success: true };
      }

      const errorData = await response.json();
      if (errorData.title === "Member Exists") {
        return { success: true };
      }

      return { success: false, error: errorData.detail || `Mailchimp API error: ${response.status}` };
    } catch (error: any) {
      return { success: false, error: error.message || "Failed to add subscriber" };
    }
  }

  clearCache(): void {
    this.configCache = null;
    this.lastConfigFetch = 0;
  }
}

export const mailchimpService = new MailchimpService();
