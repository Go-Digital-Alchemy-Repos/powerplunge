import { Router } from "express";
import { z } from "zod";
import { storage } from "../../../storage";

const router = Router();

export const integrationsStatusRoutes = Router();

integrationsStatusRoutes.get("/", async (req: any, res) => {
  const { stripeService } = await import("../../integrations/stripe");
  const { openaiService } = await import("../../integrations/openai/OpenAIService");
  const stripeConfig = await stripeService.getConfig();
  const intSettings = await storage.getIntegrationSettings();
  
  const emailSettings = await storage.getEmailSettings();
  
  const cloudflareR2Configured = !!(
    (process.env.CLOUDFLARE_ACCOUNT_ID &&
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY &&
    process.env.CLOUDFLARE_R2_BUCKET_NAME) ||
    (intSettings?.r2Configured && intSettings?.r2AccountId && intSettings?.r2AccessKeyIdEncrypted && intSettings?.r2SecretAccessKeyEncrypted && intSettings?.r2BucketName)
  );

  const activeMode = (intSettings?.stripeActiveMode as "test" | "live") || "test";
  const testConfigured = !!(intSettings?.stripePublishableKeyTest && intSettings?.stripeSecretKeyTestEncrypted);
  const liveConfigured = !!(intSettings?.stripePublishableKeyLive && intSettings?.stripeSecretKeyLiveEncrypted);
  
  res.json({
    stripe: stripeConfig.configured,
    stripeMode: stripeConfig.mode,
    stripeActiveMode: activeMode,
    stripeTestConfigured: testConfigured,
    stripeLiveConfigured: liveConfigured,
    stripeWebhook: !!stripeConfig.webhookSecret,
    mailgun: emailSettings?.provider === "mailgun" && !!emailSettings.mailgunApiKeyEncrypted,
    cloudflareR2: cloudflareR2Configured,
    openai: intSettings?.openaiConfigured || false,
    tiktokShop: intSettings?.tiktokShopConfigured || false,
    instagramShop: intSettings?.instagramShopConfigured || false,
    pinterestShopping: intSettings?.pinterestShoppingConfigured || false,
    youtubeShopping: intSettings?.youtubeShoppingConfigured || false,
    snapchatShopping: intSettings?.snapchatShoppingConfigured || false,
    xShopping: intSettings?.xShoppingConfigured || false,
    mailchimp: intSettings?.mailchimpConfigured || false,
    googlePlaces: intSettings?.googlePlacesConfigured || false,
    twilio: intSettings?.twilioEnabled || false,
    twilioEnvConfigured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER),
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
    const { companyName, companyTagline, companyAddress, companyPhone, orderNotificationEmail, supportEmail, gaMeasurementId, logoUrl, adminIconUrl, privacyPolicy, termsAndConditions } = req.body;
    const updateData: Record<string, any> = {};
    if (companyName !== undefined) updateData.companyName = companyName;
    if (companyTagline !== undefined) updateData.companyTagline = companyTagline;
    if (companyAddress !== undefined) updateData.companyAddress = companyAddress;
    if (companyPhone !== undefined) updateData.companyPhone = companyPhone;
    if (orderNotificationEmail !== undefined) updateData.orderNotificationEmail = orderNotificationEmail;
    if (supportEmail !== undefined) updateData.supportEmail = supportEmail;
    if (gaMeasurementId !== undefined) updateData.gaMeasurementId = gaMeasurementId;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    if (adminIconUrl !== undefined) updateData.adminIconUrl = adminIconUrl;
    if (privacyPolicy !== undefined) updateData.privacyPolicy = privacyPolicy;
    if (termsAndConditions !== undefined) updateData.termsAndConditions = termsAndConditions;
    if (req.body.consentSettings !== undefined) {
      const consentCategorySchema = z.object({
        enabled: z.boolean(),
        locked: z.boolean().optional(),
        defaultOn: z.boolean(),
        label: z.string().max(100),
        description: z.string().max(500),
      });
      const consentSettingsSchema = z.object({
        enabled: z.boolean(),
        mode: z.enum(["opt_in", "opt_out"]),
        position: z.enum(["top", "bottom"]),
        style: z.enum(["banner", "modal"]),
        overlay: z.boolean(),
        theme: z.enum(["light", "dark", "site"]),
        showOnFirstVisit: z.boolean(),
        rePromptDays: z.number().int().min(0).max(365),
        title: z.string().max(200),
        messageHtml: z.string().max(2000),
        acceptAllText: z.string().max(100),
        rejectAllText: z.string().max(100),
        manageText: z.string().max(100),
        savePreferencesText: z.string().max(100),
        policyLinks: z.object({
          privacyPolicyPath: z.string().max(200),
          termsPath: z.string().max(200).optional(),
        }),
        categories: z.record(z.string(), consentCategorySchema),
      });
      const parsed = consentSettingsSchema.safeParse(req.body.consentSettings);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid consent settings", errors: parsed.error.flatten() });
      }
      updateData.consentSettings = parsed.data;
    }
    const settings = await storage.updateSiteSettings(updateData);
    res.json(settings);
  } catch (error) {
    console.error("Failed to update site settings:", error);
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
    const settings = await storage.getIntegrationSettings();

    const activeMode = (settings?.stripeActiveMode as "test" | "live") || "test";

    const testConfigured = !!(settings?.stripePublishableKeyTest && settings?.stripeSecretKeyTestEncrypted);
    const liveConfigured = !!(settings?.stripePublishableKeyLive && settings?.stripeSecretKeyLiveEncrypted);

    let hasTestWebhookSecret = false;
    let hasLiveWebhookSecret = false;
    if (settings?.stripeWebhookSecretTestEncrypted) {
      try {
        const { decrypt } = await import("../../utils/encryption");
        decrypt(settings.stripeWebhookSecretTestEncrypted);
        hasTestWebhookSecret = true;
      } catch {}
    }
    if (settings?.stripeWebhookSecretLiveEncrypted) {
      try {
        const { decrypt } = await import("../../utils/encryption");
        decrypt(settings.stripeWebhookSecretLiveEncrypted);
        hasLiveWebhookSecret = true;
      } catch {}
    }

    let hasConnectWebhookSecret = false;
    let connectWebhookSecretSource: string | null = null;
    if (settings?.stripeConnectWebhookSecretEncrypted) {
      try {
        const { decrypt } = await import("../../utils/encryption");
        const val = decrypt(settings.stripeConnectWebhookSecretEncrypted);
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

    const legacyConfigured = !!(settings?.stripeConfigured && settings?.stripePublishableKey && settings?.stripeSecretKeyEncrypted);
    const hasLegacyWebhookSecret = !!settings?.stripeWebhookSecretEncrypted;
    const overallConfigured = testConfigured || liveConfigured || legacyConfigured;
    const source = overallConfigured && (testConfigured || liveConfigured) ? "database" : (legacyConfigured ? "database_legacy" : "environment");

    res.json({
      configured: overallConfigured,
      activeMode,
      test: {
        configured: testConfigured,
        publishableKeyMasked: settings?.stripePublishableKeyTest ? maskKey(settings.stripePublishableKeyTest) : null,
        hasWebhookSecret: hasTestWebhookSecret,
      },
      live: {
        configured: liveConfigured,
        publishableKeyMasked: settings?.stripePublishableKeyLive ? maskKey(settings.stripePublishableKeyLive) : null,
        hasWebhookSecret: hasLiveWebhookSecret,
      },
      hasConnectWebhookSecret,
      connectWebhookSecretSource,
      legacy: legacyConfigured ? {
        mode: settings?.stripeMode || "test",
        publishableKeyMasked: settings?.stripePublishableKey ? maskKey(settings.stripePublishableKey) : null,
        hasWebhookSecret: hasLegacyWebhookSecret,
      } : null,
      updatedAt: settings?.updatedAt || null,
      source,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch Stripe settings" });
  }
});

router.patch("/stripe", async (req: any, res) => {
  try {
    const { encrypt, maskKey } = await import("../../utils/encryption");
    const { stripeService } = await import("../../integrations/stripe");
    const { environment, publishableKey, secretKey, webhookSecret, connectWebhookSecret, activeMode } = req.body;

    const updateData: any = {};
    let auditDetails: any = {};

    if (activeMode !== undefined) {
      if (activeMode !== "test" && activeMode !== "live") {
        return res.status(400).json({ message: "activeMode must be 'test' or 'live'" });
      }
      updateData.stripeActiveMode = activeMode;
      auditDetails.activeModeChanged = activeMode;
    }

    if (environment && (publishableKey || secretKey)) {
      if (environment !== "test" && environment !== "live") {
        return res.status(400).json({ message: "environment must be 'test' or 'live'" });
      }
      if (!publishableKey || !secretKey) {
        return res.status(400).json({ message: "Both Publishable Key and Secret Key are required when updating keys" });
      }

      const expectedPkPrefix = environment === "live" ? "pk_live_" : "pk_test_";
      const expectedSkPrefix = environment === "live" ? "sk_live_" : "sk_test_";

      if (!publishableKey.startsWith(expectedPkPrefix)) {
        return res.status(400).json({ message: `Publishable key must start with ${expectedPkPrefix} for ${environment} environment` });
      }
      if (!secretKey.startsWith(expectedSkPrefix)) {
        return res.status(400).json({ message: `Secret key must start with ${expectedSkPrefix} for ${environment} environment` });
      }

      const pkMode = publishableKey.startsWith("pk_live_") ? "live" : "test";
      const skMode = secretKey.startsWith("sk_live_") ? "live" : "test";
      if (pkMode !== skMode) {
        return res.status(400).json({ message: "Publishable key and secret key must be from the same mode (both test or both live)" });
      }

      const validation = await stripeService.validateKeys(publishableKey, secretKey);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.error });
      }

      if (environment === "test") {
        updateData.stripePublishableKeyTest = publishableKey;
        updateData.stripeSecretKeyTestEncrypted = encrypt(secretKey);
      } else {
        updateData.stripePublishableKeyLive = publishableKey;
        updateData.stripeSecretKeyLiveEncrypted = encrypt(secretKey);
      }

      updateData.stripeConfigured = true;
      auditDetails.environment = environment;
      auditDetails.accountName = validation.accountName;
    }

    if (webhookSecret && environment) {
      if (environment === "test") {
        updateData.stripeWebhookSecretTestEncrypted = encrypt(webhookSecret);
      } else {
        updateData.stripeWebhookSecretLiveEncrypted = encrypt(webhookSecret);
      }
      auditDetails.hasWebhookSecret = true;
      auditDetails.webhookEnvironment = environment;
    }

    if (connectWebhookSecret) {
      updateData.stripeConnectWebhookSecretEncrypted = encrypt(connectWebhookSecret);
      auditDetails.hasConnectWebhookSecret = true;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No changes provided" });
    }

    const settings = await storage.updateIntegrationSettings(updateData);

    stripeService.clearCache();

    const adminId = (req as any).adminUser?.id;
    if (adminId) {
      try {
        await storage.createAdminAuditLog({
          adminId,
          action: "update_stripe_settings",
          targetType: "settings",
          targetId: "stripe",
          details: auditDetails,
          ipAddress: req.ip || null,
        });
      } catch (auditErr) {
        console.error("Failed to create audit log for Stripe settings update:", auditErr);
      }
    }

    res.json({
      success: true,
      activeMode: settings.stripeActiveMode || "test",
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

router.get("/r2", async (req: any, res) => {
  try {
    const settings = await storage.getIntegrationSettings();
    res.json({
      configured: settings?.r2Configured || false,
      accountId: settings?.r2AccountId || "",
      bucketName: settings?.r2BucketName || "",
      publicUrl: settings?.r2PublicUrl || "",
      hasAccessKey: !!settings?.r2AccessKeyIdEncrypted,
      hasSecretKey: !!settings?.r2SecretAccessKeyEncrypted,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch R2 settings" });
  }
});

router.patch("/r2", async (req: any, res) => {
  try {
    const { encrypt } = await import("../../utils/encryption");
    const { accountId, accessKeyId, secretAccessKey, bucketName, publicUrl } = req.body;

    if (!accountId || !bucketName) {
      return res.status(400).json({ message: "Account ID and Bucket Name are required" });
    }

    const updateData: any = {
      r2AccountId: accountId,
      r2BucketName: bucketName,
      r2PublicUrl: publicUrl || null,
      r2Configured: true,
    };

    if (accessKeyId) {
      updateData.r2AccessKeyIdEncrypted = encrypt(accessKeyId);
    }
    if (secretAccessKey) {
      updateData.r2SecretAccessKeyEncrypted = encrypt(secretAccessKey);
    }

    const existingSettings = await storage.getIntegrationSettings();
    if (!accessKeyId && !existingSettings?.r2AccessKeyIdEncrypted) {
      return res.status(400).json({ message: "Access Key ID is required" });
    }
    if (!secretAccessKey && !existingSettings?.r2SecretAccessKeyEncrypted) {
      return res.status(400).json({ message: "Secret Access Key is required" });
    }

    const settings = await storage.updateIntegrationSettings(updateData);

    const { clearR2CredentialsCache } = await import("../../integrations/cloudflare-r2/r2Storage");
    clearR2CredentialsCache();

    const adminId = (req as any).adminUser?.id;
    if (adminId) {
      try {
        await storage.createAdminAuditLog({
          adminId,
          action: "update_r2_settings",
          targetType: "settings",
          targetId: "r2",
          details: { accountId, bucketName, hasAccessKey: !!accessKeyId, hasSecretKey: !!secretAccessKey },
          ipAddress: req.ip || null,
        });
      } catch (auditErr) {
        console.error("Failed to create audit log for R2 settings update:", auditErr);
      }
    }

    res.json({
      success: true,
      configured: true,
      accountId: settings.r2AccountId,
      bucketName: settings.r2BucketName,
      publicUrl: settings.r2PublicUrl,
      hasAccessKey: !!settings.r2AccessKeyIdEncrypted,
      hasSecretKey: !!settings.r2SecretAccessKeyEncrypted,
    });
  } catch (error: any) {
    console.error("R2 settings update error:", error);
    res.status(500).json({ message: error.message || "Failed to update R2 settings" });
  }
});

router.post("/r2/test", async (req: any, res) => {
  try {
    const { accountId, accessKeyId, secretAccessKey, bucketName } = req.body;

    if (!accountId || !bucketName) {
      return res.status(400).json({ success: false, error: "Account ID and Bucket Name are required" });
    }

    let testAccessKey = accessKeyId;
    let testSecretKey = secretAccessKey;

    if (!testAccessKey || !testSecretKey) {
      const { decrypt } = await import("../../utils/encryption");
      const settings = await storage.getIntegrationSettings();
      if (!testAccessKey && settings?.r2AccessKeyIdEncrypted) {
        testAccessKey = decrypt(settings.r2AccessKeyIdEncrypted);
      }
      if (!testSecretKey && settings?.r2SecretAccessKeyEncrypted) {
        testSecretKey = decrypt(settings.r2SecretAccessKeyEncrypted);
      }
    }

    if (!testAccessKey || !testSecretKey) {
      return res.status(400).json({ success: false, error: "Access Key ID and Secret Access Key are required" });
    }

    const { S3Client, HeadBucketCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: testAccessKey,
        secretAccessKey: testSecretKey,
      },
      forcePathStyle: true,
      requestChecksumCalculation: "WHEN_REQUIRED" as any,
      responseChecksumValidation: "WHEN_REQUIRED" as any,
    });

    await client.send(new HeadBucketCommand({ Bucket: bucketName }));
    res.json({ success: true, message: "Connection successful" });
  } catch (error: any) {
    const code = error.Code || error.name || "Unknown";
    let message = "Connection failed";
    if (code === "SignatureDoesNotMatch") {
      message = "Invalid credentials - the Access Key ID or Secret Access Key is incorrect";
    } else if (code === "AccessDenied") {
      message = "Access denied - the API token may not have permission for this bucket";
    } else if (code === "NoSuchBucket") {
      message = "Bucket not found - check the bucket name";
    }
    res.json({ success: false, error: message, code });
  }
});

// ==================== TWILIO SMS INTEGRATION ====================

router.get("/twilio", async (req: any, res) => {
  try {
    const settings = await storage.getIntegrationSettings();
    
    const envConfigured = !!(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER
    );

    res.json({
      enabled: settings?.twilioEnabled || false,
      accountSid: settings?.twilioAccountSid || "",
      phoneNumber: settings?.twilioPhoneNumber || "",
      authTokenSet: !!settings?.twilioAuthTokenEncrypted,
      envConfigured,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch Twilio settings" });
  }
});

router.put("/twilio", async (req: any, res) => {
  try {
    const { encrypt } = await import("../../utils/encryption");
    const { enabled, accountSid, authToken, phoneNumber } = req.body;

    const updateData: any = {};

    if (typeof enabled === "boolean") {
      updateData.twilioEnabled = enabled;
    }

    if (accountSid !== undefined) {
      updateData.twilioAccountSid = accountSid || null;
    }

    if (phoneNumber !== undefined) {
      updateData.twilioPhoneNumber = phoneNumber || null;
    }

    if (authToken && authToken.trim()) {
      updateData.twilioAuthTokenEncrypted = encrypt(authToken.trim());
    }

    if (enabled === true) {
      const existingSettings = await storage.getIntegrationSettings();
      const finalSid = accountSid || existingSettings?.twilioAccountSid;
      const finalPhone = phoneNumber || existingSettings?.twilioPhoneNumber;
      const hasToken = !!authToken || !!existingSettings?.twilioAuthTokenEncrypted;

      if (!finalSid || !finalPhone || !hasToken) {
        return res.status(400).json({
          message: "Account SID, Phone Number, and Auth Token are all required to enable Twilio",
        });
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No changes provided" });
    }

    const settings = await storage.updateIntegrationSettings(updateData);

    try {
      const { smsService } = await import("../../services/sms.service");
      smsService.clearCache();
    } catch {}

    const adminId = (req as any).adminUser?.id;
    if (adminId) {
      try {
        await storage.createAdminAuditLog({
          adminId,
          action: "update_twilio_settings",
          targetType: "settings",
          targetId: "twilio",
          details: { enabled: settings.twilioEnabled, hasAuthToken: !!authToken },
          ipAddress: req.ip || null,
        });
      } catch (auditErr) {
        console.error("Failed to create audit log for Twilio settings update:", auditErr);
      }
    }

    res.json({
      success: true,
      enabled: settings.twilioEnabled,
      accountSid: settings.twilioAccountSid || "",
      phoneNumber: settings.twilioPhoneNumber || "",
      authTokenSet: !!settings.twilioAuthTokenEncrypted,
    });
  } catch (error: any) {
    console.error("Twilio settings update error:", error);
    res.status(500).json({ message: error.message || "Failed to update Twilio settings" });
  }
});

router.post("/twilio/test-sms", async (req: any, res) => {
  try {
    const { toPhoneNumber } = req.body;
    if (!toPhoneNumber) {
      return res.status(400).json({ success: false, message: "Phone number is required" });
    }

    const { smsService } = await import("../../services/sms.service");
    const phoneValidation = smsService.validateAndNormalizePhone(toPhoneNumber);
    if (!phoneValidation.valid || !phoneValidation.e164) {
      return res.status(400).json({ success: false, message: "Invalid phone number format" });
    }

    const result = await smsService.sendTestSms(phoneValidation.e164);
    if (result.success) {
      res.json({ success: true, message: `Test SMS sent (SID: ${result.messageSid})` });
    } else {
      res.status(400).json({ success: false, message: result.error || "Failed to send test SMS" });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to send test SMS" });
  }
});

export default router;
