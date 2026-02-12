import twilio from "twilio";
import { parsePhoneNumberFromString, type PhoneNumber } from "libphonenumber-js";

export interface SmsSendResult {
  success: boolean;
  messageSid?: string;
  error?: string;
}

export interface VerifyStartResult {
  success: boolean;
  verifySid?: string;
  error?: string;
}

export interface VerifyCheckResult {
  success: boolean;
  valid: boolean;
  status?: string;
  error?: string;
}

class SmsService {
  private client: ReturnType<typeof twilio> | null = null;
  private fromNumber: string | null = null;
  private configSource: "db" | "env" | null = null;

  private dailySmsCount = 0;
  private dailySmsResetTime = 0;
  private readonly DAILY_SMS_BUDGET = 500;

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

  checkDailyBudget(): boolean {
    const now = Date.now();
    if (now > this.dailySmsResetTime) {
      this.dailySmsCount = 0;
      const tomorrow = new Date();
      tomorrow.setHours(24, 0, 0, 0);
      this.dailySmsResetTime = tomorrow.getTime();
    }
    return this.dailySmsCount < this.DAILY_SMS_BUDGET;
  }

  private incrementDailyCount() {
    this.checkDailyBudget();
    this.dailySmsCount++;
  }

  private getVerifyServiceSid(): string | null {
    return process.env.TWILIO_VERIFY_SERVICE_SID || null;
  }

  async startVerification(to: string): Promise<VerifyStartResult> {
    try {
      if (!this.checkDailyBudget()) {
        console.error("[SMS] Daily SMS budget exceeded");
        return { success: false, error: "SMS service temporarily unavailable" };
      }

      const serviceSid = this.getVerifyServiceSid();
      if (!serviceSid) {
        return { success: false, error: "Twilio Verify service not configured" };
      }

      const client = await this.getClient();
      const verification = await client.verify.v2
        .services(serviceSid)
        .verifications.create({ to, channel: "sms" });

      this.incrementDailyCount();
      return { success: true, verifySid: verification.sid };
    } catch (error: any) {
      console.error("[SMS] Failed to start verification:", error);
      return { success: false, error: error.message || "Failed to send verification" };
    }
  }

  async checkVerification(to: string, code: string): Promise<VerifyCheckResult> {
    try {
      const serviceSid = this.getVerifyServiceSid();
      if (!serviceSid) {
        return { success: false, valid: false, error: "Twilio Verify service not configured" };
      }

      const client = await this.getClient();
      const check = await client.verify.v2
        .services(serviceSid)
        .verificationChecks.create({ to, code });

      return {
        success: true,
        valid: check.valid === true && check.status === "approved",
        status: check.status,
      };
    } catch (error: any) {
      if (error.code === 20404) {
        return { success: true, valid: false, status: "not_found", error: "Verification expired or not found" };
      }
      console.error("[SMS] Failed to check verification:", error);
      return { success: false, valid: false, error: error.message || "Failed to check verification" };
    }
  }

  async sendInviteSms(to: string, inviteUrl: string, recipientName?: string): Promise<SmsSendResult> {
    try {
      if (!this.checkDailyBudget()) {
        console.error("[SMS] Daily SMS budget exceeded");
        return { success: false, error: "SMS service temporarily unavailable" };
      }

      const client = await this.getClient();
      const greeting = recipientName ? `Hi ${recipientName}, you` : "You";
      const message = await client.messages.create({
        body: `${greeting}'ve been invited to join the Power Plunge affiliate program! Sign up here: ${inviteUrl}`,
        from: this.fromNumber!,
        to,
      });

      this.incrementDailyCount();
      return { success: true, messageSid: message.sid };
    } catch (error: any) {
      console.error("[SMS] Failed to send invite SMS:", error);
      return { success: false, error: error.message || "Failed to send SMS" };
    }
  }

  validateAndNormalizePhone(phone: string): { valid: boolean; e164?: string; error?: string } {
    if (!phone || !phone.trim()) {
      return { valid: false, error: "Phone number is required" };
    }

    let input = phone.trim();
    if (!input.startsWith("+")) {
      const digits = input.replace(/\D/g, "");
      if (digits.length === 10) {
        input = "+1" + digits;
      } else if (digits.length === 11 && digits.startsWith("1")) {
        input = "+" + digits;
      } else {
        input = "+" + digits;
      }
    }

    const parsed: PhoneNumber | undefined = parsePhoneNumberFromString(input);
    if (!parsed || !parsed.isValid()) {
      return { valid: false, error: "Invalid phone number. Please provide a valid phone number in E.164 format (e.g., +15551234567)." };
    }

    return { valid: true, e164: parsed.format("E.164") };
  }

  normalizePhone(phone: string): string {
    const result = this.validateAndNormalizePhone(phone);
    if (result.valid && result.e164) {
      return result.e164;
    }
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

  async getAuthToken(): Promise<string | null> {
    try {
      const { storage } = await import("../../storage");
      const settings = await storage.getIntegrationSettings();
      if (settings?.twilioEnabled && settings.twilioAuthTokenEncrypted) {
        const { decrypt } = await import("../utils/encryption");
        return decrypt(settings.twilioAuthTokenEncrypted);
      }
    } catch {}
    return process.env.TWILIO_AUTH_TOKEN || null;
  }
}

export const smsService = new SmsService();
