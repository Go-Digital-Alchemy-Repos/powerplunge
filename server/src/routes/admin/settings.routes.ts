import { Router } from "express";
import { storage } from "../../../storage";

const router = Router();

export const integrationsStatusRoutes = Router();

integrationsStatusRoutes.get("/", async (req: any, res) => {
  const { stripeService } = await import("../../integrations/stripe");
  const { openaiService } = await import("../../integrations/openai/OpenAIService");
  const stripeConfig = await stripeService.getConfig();
  
  const emailSettings = await storage.getEmailSettings();
  const integrationSettings = await storage.getIntegrationSettings();
  
  const cloudflareR2Configured = !!(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY &&
    process.env.CLOUDFLARE_R2_BUCKET_NAME
  );
  
  res.json({
    stripe: stripeConfig.configured,
    stripeMode: stripeConfig.mode,
    stripeWebhook: !!stripeConfig.webhookSecret,
    mailgun: emailSettings?.provider === "mailgun" && !!emailSettings.mailgunApiKeyEncrypted,
    cloudflareR2: cloudflareR2Configured,
    openai: integrationSettings?.openaiConfigured || false,
    tiktokShop: integrationSettings?.tiktokShopConfigured || false,
    instagramShop: integrationSettings?.instagramShopConfigured || false,
    pinterestShopping: integrationSettings?.pinterestShoppingConfigured || false,
    youtubeShopping: integrationSettings?.youtubeShoppingConfigured || false,
    snapchatShopping: integrationSettings?.snapchatShoppingConfigured || false,
    xShopping: integrationSettings?.xShoppingConfigured || false,
    mailchimp: integrationSettings?.mailchimpConfigured || false,
  });
});

router.get("/", async (req: any, res) => {
  try {
    let settings = await storage.getSiteSettings();
    if (!settings) {
      settings = await storage.updateSiteSettings({});
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch settings" });
  }
});

router.patch("/", async (req: any, res) => {
  try {
    const settings = await storage.updateSiteSettings(req.body);
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: "Failed to update settings" });
  }
});

router.get("/email", async (req: any, res) => {
  try {
    const settings = await storage.getEmailSettings();
    if (!settings) {
      return res.json({ provider: "none" });
    }
    res.json({
      provider: settings.provider,
      mailgunDomain: settings.mailgunDomain,
      mailgunFromEmail: settings.mailgunFromEmail,
      mailgunFromName: settings.mailgunFromName,
      mailgunReplyTo: settings.mailgunReplyTo,
      mailgunRegion: settings.mailgunRegion,
      hasApiKey: !!settings.mailgunApiKeyEncrypted,
      updatedAt: settings.updatedAt,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch email settings" });
  }
});

router.patch("/email", async (req: any, res) => {
  try {
    const { encrypt } = await import("../../utils/encryption");
    const { provider, mailgunApiKey, mailgunDomain, mailgunFromEmail, mailgunFromName, mailgunReplyTo, mailgunRegion } = req.body;

    const updateData: any = { provider };
    
    if (provider === "mailgun") {
      if (mailgunDomain) updateData.mailgunDomain = mailgunDomain;
      if (mailgunFromEmail) updateData.mailgunFromEmail = mailgunFromEmail;
      if (mailgunFromName !== undefined) updateData.mailgunFromName = mailgunFromName;
      if (mailgunReplyTo !== undefined) updateData.mailgunReplyTo = mailgunReplyTo;
      if (mailgunRegion) updateData.mailgunRegion = mailgunRegion;
      if (mailgunApiKey) {
        updateData.mailgunApiKeyEncrypted = encrypt(mailgunApiKey);
      }
    }

    const settings = await storage.updateEmailSettings(updateData);
    
    const adminId = (req as any).adminUser?.id;
    if (adminId) {
      await storage.createAdminAuditLog({
        adminId,
        action: "update_email_settings",
        targetType: "settings",
        targetId: "email",
        details: { provider, hasApiKey: !!mailgunApiKey },
        ipAddress: req.ip || null,
      });
    }
    
    res.json({
      provider: settings.provider,
      mailgunDomain: settings.mailgunDomain,
      mailgunFromEmail: settings.mailgunFromEmail,
      mailgunFromName: settings.mailgunFromName,
      mailgunReplyTo: settings.mailgunReplyTo,
      mailgunRegion: settings.mailgunRegion,
      hasApiKey: !!settings.mailgunApiKeyEncrypted,
      updatedAt: settings.updatedAt,
    });
  } catch (error) {
    console.error("Email settings update error:", error);
    res.status(500).json({ message: "Failed to update email settings" });
  }
});

router.post("/email/test", async (req: any, res) => {
  try {
    const { to } = req.body;
    if (!to) {
      return res.status(400).json({ message: "Email address required" });
    }

    const { emailService } = await import("../../integrations/mailgun");
    const result = await emailService.sendTestEmail(to);
    
    if (result.success) {
      res.json({ success: true, message: "Test email sent successfully" });
    } else {
      res.status(400).json({ success: false, message: result.error });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to send test email" });
  }
});

router.post("/email/verify", async (req: any, res) => {
  try {
    const { emailService } = await import("../../integrations/mailgun");
    const result = await emailService.verifyConfiguration();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ valid: false, error: error.message || "Failed to verify configuration" });
  }
});

router.get("/stripe", async (req: any, res) => {
  try {
    const { stripeService } = await import("../../integrations/stripe");
    const { maskKey } = await import("../../utils/encryption");
    const config = await stripeService.getConfig();
    const integrationSettings = await storage.getIntegrationSettings();
    
    let hasConnectWebhookSecret = false;
    let connectWebhookSecretSource: string | null = null;
    if (integrationSettings?.stripeConnectWebhookSecretEncrypted) {
      try {
        const { decrypt } = await import("../../utils/encryption");
        const val = decrypt(integrationSettings.stripeConnectWebhookSecretEncrypted);
        if (val) {
          hasConnectWebhookSecret = true;
          connectWebhookSecretSource = "database";
        }
      } catch {}
    }
    if (!hasConnectWebhookSecret && process.env.STRIPE_CONNECT_WEBHOOK_SECRET) {
      hasConnectWebhookSecret = true;
      connectWebhookSecretSource = "environment";
    }

    res.json({
      configured: config.configured,
      mode: config.mode,
      hasWebhookSecret: !!config.webhookSecret,
      hasConnectWebhookSecret,
      connectWebhookSecretSource,
      publishableKeyMasked: config.publishableKey ? maskKey(config.publishableKey) : null,
      updatedAt: integrationSettings?.updatedAt || null,
      source: integrationSettings?.stripeConfigured ? "database" : "environment",
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch Stripe settings" });
  }
});

router.patch("/stripe", async (req: any, res) => {
  try {
    const { encrypt, maskKey } = await import("../../utils/encryption");
    const { stripeService } = await import("../../integrations/stripe");
    const { publishableKey, secretKey, webhookSecret, connectWebhookSecret } = req.body;

    const hasNewKeys = publishableKey || secretKey;
    const hasConnectOnly = !hasNewKeys && (connectWebhookSecret || webhookSecret);

    if (hasNewKeys && (!publishableKey || !secretKey)) {
      return res.status(400).json({ message: "Both Publishable Key and Secret Key are required when updating Stripe keys" });
    }

    const updateData: any = {};
    let mode: string | undefined;
    let validation: any = {};

    if (hasNewKeys) {
      validation = await stripeService.validateKeys(publishableKey, secretKey);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.error });
      }
      mode = secretKey.startsWith("sk_live_") ? "live" : "test";
      updateData.stripePublishableKey = publishableKey;
      updateData.stripeSecretKeyEncrypted = encrypt(secretKey);
      updateData.stripeMode = mode;
      updateData.stripeConfigured = true;
    } else if (hasConnectOnly) {
      const existingConfig = await stripeService.getConfig();
      if (!existingConfig.configured) {
        return res.status(400).json({ message: "Stripe keys must be configured before adding webhook secrets" });
      }
      mode = existingConfig.mode;
    } else {
      return res.status(400).json({ message: "No changes provided" });
    }

    if (webhookSecret) {
      updateData.stripeWebhookSecretEncrypted = encrypt(webhookSecret);
    }

    if (connectWebhookSecret) {
      updateData.stripeConnectWebhookSecretEncrypted = encrypt(connectWebhookSecret);
    }

    const settings = await storage.updateIntegrationSettings(updateData);
    
    stripeService.clearCache();
    
    const adminId = (req as any).adminUser?.id;
    await storage.createAdminAuditLog({
      adminId: adminId || "system",
      action: "update_stripe_settings",
      targetType: "settings",
      targetId: "stripe",
      details: { mode, hasWebhookSecret: !!webhookSecret, hasConnectWebhookSecret: !!connectWebhookSecret },
      ipAddress: req.ip || null,
    });

    const currentConfig = await stripeService.getConfig();
    res.json({
      configured: currentConfig.configured,
      mode: mode || currentConfig.mode,
      hasWebhookSecret: !!webhookSecret || !!currentConfig.webhookSecret,
      hasConnectWebhookSecret: !!connectWebhookSecret || !!settings.stripeConnectWebhookSecretEncrypted,
      publishableKeyMasked: publishableKey ? maskKey(publishableKey) : (currentConfig.publishableKey ? maskKey(currentConfig.publishableKey) : null),
      accountName: validation?.accountName,
      updatedAt: settings.updatedAt,
    });
  } catch (error: any) {
    console.error("Stripe settings update error:", error);
    res.status(500).json({ message: error.message || "Failed to update Stripe settings" });
  }
});

router.post("/stripe/validate", async (req: any, res) => {
  try {
    const { stripeService } = await import("../../integrations/stripe");
    const { publishableKey, secretKey } = req.body;

    if (!publishableKey || !secretKey) {
      return res.status(400).json({ valid: false, error: "Both keys are required" });
    }

    const result = await stripeService.validateKeys(publishableKey, secretKey);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ valid: false, error: error.message || "Failed to validate keys" });
  }
});

export default router;
