import twilio from "twilio";

class SmsService {
  private client: ReturnType<typeof twilio> | null = null;
  private fromNumber: string | null = null;
  private configSource: "db" | "env" | null = null;

  clearCache() {
    this.client = null;
    this.fromNumber = null;
    this.configSource = null;
  }

  private async getClient() {
    if (this.client) {
      return this.client;
    }

    try {
      const { storage } = await import("../../storage");
      const settings = await storage.getIntegrationSettings();

      if (settings?.twilioEnabled && settings.twilioAccountSid && settings.twilioAuthTokenEncrypted && settings.twilioPhoneNumber) {
        const { decrypt } = await import("../utils/encryption");
        const authToken = decrypt(settings.twilioAuthTokenEncrypted);
        this.fromNumber = settings.twilioPhoneNumber;
        this.client = twilio(settings.twilioAccountSid, authToken);
        this.configSource = "db";
        return this.client;
      }
    } catch (err) {
      console.error("[SMS] Failed to load DB Twilio settings, falling back to env vars:", err);
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || null;

    if (!accountSid || !authToken || !this.fromNumber) {
      throw new Error("Twilio credentials not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER or configure via Admin Settings.");
    }

    this.client = twilio(accountSid, authToken);
    this.configSource = "env";
    return this.client;
  }

  async sendVerificationCode(to: string, code: string): Promise<{ success: boolean; error?: string }> {
    try {
      const client = await this.getClient();
      await client.messages.create({
        body: `Your Power Plunge affiliate verification code is: ${code}. This code expires in 10 minutes.`,
        from: this.fromNumber!,
        to,
      });
      return { success: true };
    } catch (error: any) {
      console.error("[SMS] Failed to send verification code:", error);
      return { success: false, error: error.message || "Failed to send SMS" };
    }
  }

  generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  normalizePhone(phone: string): string {
    let cleaned = phone.replace(/[^\d+]/g, "");
    if (!cleaned.startsWith("+")) {
      if (cleaned.length === 10) {
        cleaned = "+1" + cleaned;
      } else if (cleaned.length === 11 && cleaned.startsWith("1")) {
        cleaned = "+" + cleaned;
      } else {
        cleaned = "+" + cleaned;
      }
    }
    return cleaned;
  }
}

export const smsService = new SmsService();
