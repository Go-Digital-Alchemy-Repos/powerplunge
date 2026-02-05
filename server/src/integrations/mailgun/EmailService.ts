import Mailgun from "mailgun.js";
import formData from "form-data";
import { storage } from "../../../storage";
import { decrypt } from "../../utils/encryption";

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailProviderConfig {
  provider: "none" | "mailgun";
  domain?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  apiKey?: string;
  region?: "us" | "eu";
}

class EmailService {
  private mailgun: any = null;
  private config: EmailProviderConfig | null = null;

  async getConfig(): Promise<EmailProviderConfig> {
    const settings = await storage.getEmailSettings();
    
    if (!settings || settings.provider === "none") {
      return { provider: "none" };
    }

    let apiKey = "";
    if (settings.mailgunApiKeyEncrypted) {
      try {
        apiKey = decrypt(settings.mailgunApiKeyEncrypted);
      } catch (error) {
        console.error("Failed to decrypt Mailgun API key");
      }
    }

    return {
      provider: settings.provider as "none" | "mailgun",
      domain: settings.mailgunDomain || undefined,
      fromName: settings.mailgunFromName || undefined,
      fromEmail: settings.mailgunFromEmail || undefined,
      replyTo: settings.mailgunReplyTo || undefined,
      apiKey,
      region: (settings.mailgunRegion as "us" | "eu") || "us",
    };
  }

  private getMailgunClient(apiKey: string, region: "us" | "eu" = "us") {
    const mailgun = new Mailgun(formData);
    const url = region === "eu" ? "https://api.eu.mailgun.net" : "https://api.mailgun.net";
    return mailgun.client({ username: "api", key: apiKey, url });
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    const config = await this.getConfig();

    if (config.provider === "none") {
      return { success: false, error: "No email provider configured" };
    }

    if (config.provider === "mailgun") {
      return this.sendMailgunEmail(config, options);
    }

    return { success: false, error: "Unknown email provider" };
  }

  private async sendMailgunEmail(config: EmailProviderConfig, options: EmailOptions): Promise<EmailResult> {
    if (!config.apiKey || !config.domain || !config.fromEmail) {
      return { success: false, error: "Mailgun not properly configured" };
    }

    try {
      const client = this.getMailgunClient(config.apiKey, config.region);
      
      const from = config.fromName 
        ? `${config.fromName} <${config.fromEmail}>`
        : config.fromEmail;

      const messageData: any = {
        from,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
      };

      if (options.html) messageData.html = options.html;
      if (options.text) messageData.text = options.text;
      if (options.replyTo || config.replyTo) {
        messageData["h:Reply-To"] = options.replyTo || config.replyTo;
      }

      const result = await client.messages.create(config.domain, messageData);
      
      return {
        success: true,
        messageId: result.id,
      };
    } catch (error: any) {
      console.error("Mailgun send error:", error.message);
      return {
        success: false,
        error: error.message || "Failed to send email via Mailgun",
      };
    }
  }

  async verifyConfiguration(): Promise<{ valid: boolean; error?: string }> {
    const config = await this.getConfig();

    if (config.provider === "none") {
      return { valid: false, error: "No email provider configured" };
    }

    if (config.provider === "mailgun") {
      return this.verifyMailgunConfig(config);
    }

    return { valid: false, error: "Unknown provider" };
  }

  private async verifyMailgunConfig(config: EmailProviderConfig): Promise<{ valid: boolean; error?: string }> {
    if (!config.domain) {
      return { valid: false, error: "Mailgun domain is required" };
    }
    if (!config.fromEmail) {
      return { valid: false, error: "From email is required" };
    }
    if (!config.apiKey) {
      return { valid: false, error: "Mailgun API key is required" };
    }

    try {
      const client = this.getMailgunClient(config.apiKey, config.region);
      await client.domains.get(config.domain);
      return { valid: true };
    } catch (error: any) {
      if (error.status === 401) {
        return { valid: false, error: "Invalid API key" };
      }
      if (error.status === 404) {
        return { valid: false, error: "Domain not found or not verified" };
      }
      return { valid: false, error: error.message || "Failed to verify configuration" };
    }
  }

  async sendTestEmail(to: string): Promise<EmailResult> {
    const config = await this.getConfig();
    
    if (config.provider === "none") {
      return { success: false, error: "No email provider configured" };
    }

    return this.sendEmail({
      to,
      subject: "Test Email from Power Plunge",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0891b2;">Email Configuration Test</h2>
          <p>This is a test email from your Power Plunge store.</p>
          <p>If you received this email, your email configuration is working correctly!</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #6b7280; font-size: 12px;">
            Sent via ${config.provider === "mailgun" ? "Mailgun" : config.provider}
          </p>
        </div>
      `,
      text: "This is a test email from your Power Plunge store. If you received this email, your email configuration is working correctly!",
    });
  }
}

export const emailService = new EmailService();
