import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";
import { storage } from "../../../storage";

const router = Router();

// ==================== OPENAI SETTINGS ====================

router.get("/settings/openai", async (req: Request, res: Response) => {
  try {
    const { maskKey } = await import("../../utils/encryption");
    const integrationSettings = await storage.getIntegrationSettings();
    
    res.json({
      configured: integrationSettings?.openaiConfigured || false,
      apiKeyMasked: integrationSettings?.openaiApiKeyEncrypted ? maskKey("sk-xxxx...configured") : null,
      updatedAt: integrationSettings?.updatedAt || null,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch OpenAI settings" });
  }
});

router.patch("/settings/openai", async (req: Request, res: Response) => {
  try {
    const { encrypt } = await import("../../utils/encryption");
    const { openaiService } = await import("../../integrations/openai/OpenAIService");
    const { apiKey } = req.body;

    if (!apiKey) {
      return res.status(400).json({ message: "API key is required" });
    }

    if (!apiKey.startsWith("sk-")) {
      return res.status(400).json({ message: "Invalid API key format. Must start with 'sk-'" });
    }

    const updateData = {
      openaiApiKeyEncrypted: encrypt(apiKey),
      openaiConfigured: true,
    };

    await storage.updateIntegrationSettings(updateData);
    
    openaiService.clearCache();

    res.json({ success: true, message: "OpenAI configuration saved" });
  } catch (error: any) {
    console.error("Error saving OpenAI settings:", error);
    res.status(500).json({ message: error.message || "Failed to save OpenAI settings" });
  }
});

router.delete("/settings/openai", async (req: Request, res: Response) => {
  try {
    const { openaiService } = await import("../../integrations/openai/OpenAIService");
    
    await storage.updateIntegrationSettings({
      openaiApiKeyEncrypted: null,
      openaiConfigured: false,
    });
    
    openaiService.clearCache();

    res.json({ success: true, message: "OpenAI configuration removed" });
  } catch (error: any) {
    console.error("Error removing OpenAI settings:", error);
    res.status(500).json({ message: error.message || "Failed to remove OpenAI settings" });
  }
});

// ==================== TIKTOK SHOP SETTINGS ====================

router.get("/settings/tiktok-shop", async (req: Request, res: Response) => {
  try {
    const integrationSettings = await storage.getIntegrationSettings();
    const mockMode = process.env.TIKTOK_SHOP_MOCK_MODE === "true";
    res.json({
      configured: integrationSettings?.tiktokShopConfigured || false,
      shopId: integrationSettings?.tiktokShopId || null,
      shopCipher: integrationSettings?.tiktokShopCipher || null,
      sellerName: integrationSettings?.tiktokSellerName || null,
      sellerBaseRegion: integrationSettings?.tiktokSellerBaseRegion || null,
      appKey: integrationSettings?.tiktokAppKey || null,
      hasAppSecret: !!integrationSettings?.tiktokAppSecretEncrypted,
      hasAccessToken: !!integrationSettings?.tiktokAccessTokenEncrypted,
      hasRefreshToken: !!integrationSettings?.tiktokRefreshTokenEncrypted,
      accessTokenExpiresAt: integrationSettings?.tiktokAccessTokenExpiresAt || null,
      refreshTokenExpiresAt: integrationSettings?.tiktokRefreshTokenExpiresAt || null,
      grantedScopes: integrationSettings?.tiktokGrantedScopes || [],
      importRuns: Array.isArray(integrationSettings?.tiktokImportRuns) ? integrationSettings.tiktokImportRuns : [],
      mockMode,
      updatedAt: integrationSettings?.updatedAt || null,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch TikTok Shop settings" });
  }
});

router.patch("/settings/tiktok-shop", async (req: Request, res: Response) => {
  try {
    const { encrypt } = await import("../../utils/encryption");
    const { tiktokShopService } = await import("../../integrations/tiktok-shop/TikTokShopService");
    const { shopId, appKey, appSecret, accessToken, refreshToken, shopCipher } = req.body;
    const mockMode = process.env.TIKTOK_SHOP_MOCK_MODE === "true";

    const existingSettings = await storage.getIntegrationSettings();
    const isUpdate = existingSettings?.tiktokShopConfigured;

    if (!isUpdate && !mockMode && (!appKey || !appSecret)) {
      return res.status(400).json({ message: "App Key and App Secret are required" });
    }

    const updateData: any = {
      tiktokShopConfigured: true,
    };

    if (shopId) updateData.tiktokShopId = shopId;
    if (shopCipher) updateData.tiktokShopCipher = shopCipher;
    if (appKey) updateData.tiktokAppKey = appKey;
    if (appSecret) updateData.tiktokAppSecretEncrypted = encrypt(appSecret);
    if (accessToken) updateData.tiktokAccessTokenEncrypted = encrypt(accessToken);
    if (refreshToken) updateData.tiktokRefreshTokenEncrypted = encrypt(refreshToken);

    await storage.updateIntegrationSettings(updateData);
    tiktokShopService.clearCache();

    res.json({ success: true, message: "TikTok Shop configuration saved" });
  } catch (error: any) {
    console.error("Error saving TikTok Shop settings:", error);
    res.status(500).json({ message: error.message || "Failed to save TikTok Shop settings" });
  }
});

router.post("/settings/tiktok-shop/verify", async (req: Request, res: Response) => {
  try {
    const { tiktokShopService } = await import("../../integrations/tiktok-shop/TikTokShopService");
    const result = await tiktokShopService.verify();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Verification failed" });
  }
});

router.get("/settings/tiktok-shop/oauth/callback-url", async (req: Request, res: Response) => {
  try {
    const { getBaseUrl } = await import("../../utils/base-url");
    const callbackUrl = `${getBaseUrl(req)}/api/admin/settings/tiktok-shop/oauth/callback`;
    res.json({ callbackUrl });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to generate callback URL" });
  }
});

router.get("/settings/tiktok-shop/webhook-url", async (req: Request, res: Response) => {
  try {
    const { getBaseUrl } = await import("../../utils/base-url");
    const webhookUrl = `${getBaseUrl(req)}/api/webhooks/tiktok-shop`;
    res.json({ webhookUrl });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to generate webhook URL" });
  }
});

router.get("/settings/tiktok-shop/oauth/authorize-url", async (req: Request, res: Response) => {
  try {
    const { tiktokShopService } = await import("../../integrations/tiktok-shop/TikTokShopService");
    const { getBaseUrl } = await import("../../utils/base-url");
    const callbackUrl = `${getBaseUrl(req)}/api/admin/settings/tiktok-shop/oauth/callback`;
    const state = randomUUID();
    const authorizeUrl = await tiktokShopService.buildOAuthAuthorizeUrl({
      redirectUri: callbackUrl,
      state,
    });
    res.json({ authorizeUrl, callbackUrl, state });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to generate authorize URL" });
  }
});

router.post("/settings/tiktok-shop/exchange-code", async (req: Request, res: Response) => {
  try {
    const { tiktokShopService } = await import("../../integrations/tiktok-shop/TikTokShopService");
    const authCode = String(req.body?.authCode || "").trim();
    const result = await tiktokShopService.exchangeAuthCode(authCode);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to exchange authorization code" });
  }
});

router.post("/settings/tiktok-shop/refresh-token", async (req: Request, res: Response) => {
  try {
    const { tiktokShopService } = await import("../../integrations/tiktok-shop/TikTokShopService");
    const token = await tiktokShopService.refreshAccessToken();
    res.json({
      success: true,
      accessTokenExpiresAt: token.access_token_expire_in,
      refreshTokenExpiresAt: token.refresh_token_expire_in,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to refresh access token" });
  }
});

router.get("/settings/tiktok-shop/shops", async (req: Request, res: Response) => {
  try {
    const { tiktokShopService } = await import("../../integrations/tiktok-shop/TikTokShopService");
    const result = await tiktokShopService.syncAuthorizedShops();
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to fetch authorized shops" });
  }
});

router.post("/settings/tiktok-shop/sync-products", async (req: Request, res: Response) => {
  try {
    const { tiktokShopService } = await import("../../integrations/tiktok-shop/TikTokShopService");
    const pageSize = Number(req.body?.pageSize);
    const pageToken = req.body?.pageToken ? String(req.body.pageToken) : undefined;
    const result = await tiktokShopService.syncProductsPreview({ pageSize, pageToken });
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to sync TikTok products" });
  }
});

router.post("/settings/tiktok-shop/import-products", async (req: Request, res: Response) => {
  try {
    const { tiktokShopService } = await import("../../integrations/tiktok-shop/TikTokShopService");
    const payload = Array.isArray(req.body?.products) ? req.body.products : [];
    const dryRun = req.body?.dryRun === true || req.body?.dryRun === "true";
    const products = payload.map((item: any) => ({
      id: String(item?.id || "").trim(),
      title: String(item?.title || "").trim(),
      status: String(item?.status || "").trim(),
      region: item?.region !== undefined && item?.region !== null ? String(item.region) : null,
      currency: item?.currency !== undefined && item?.currency !== null ? String(item.currency) : null,
      price: item?.price !== undefined && item?.price !== null ? String(item.price) : null,
      sellerSku: item?.sellerSku !== undefined && item?.sellerSku !== null ? String(item.sellerSku) : null,
    }));

    const result = await tiktokShopService.importProductsToCatalog(products, { dryRun });
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to import TikTok products" });
  }
});

router.post("/settings/tiktok-shop/import-products-all", async (req: Request, res: Response) => {
  try {
    const { tiktokShopService } = await import("../../integrations/tiktok-shop/TikTokShopService");
    const pageSize = Number(req.body?.pageSize);
    const maxPages = Number(req.body?.maxPages);
    const maxProducts = Number(req.body?.maxProducts);
    const dryRun = req.body?.dryRun === true || req.body?.dryRun === "true";

    const result = await tiktokShopService.importAllProductsToCatalog({
      pageSize,
      maxPages,
      maxProducts,
      dryRun,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to import all TikTok products" });
  }
});

router.patch("/settings/tiktok-shop/select-shop", async (req: Request, res: Response) => {
  try {
    const { tiktokShopService } = await import("../../integrations/tiktok-shop/TikTokShopService");
    const shopCipher = String(req.body?.shopCipher || "").trim();
    const result = await tiktokShopService.selectShop(shopCipher);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to select shop" });
  }
});

router.get("/settings/tiktok-shop/oauth/callback", async (req: Request, res: Response) => {
  try {
    const { tiktokShopService } = await import("../../integrations/tiktok-shop/TikTokShopService");
    const { getBaseUrl } = await import("../../utils/base-url");
    const code = String(req.query?.code || "").trim();
    const error = String(req.query?.error || "").trim();
    const redirectBase = `${getBaseUrl(req)}/admin/integrations`;

    if (error) {
      return res.redirect(`${redirectBase}?tiktok_oauth=error&reason=${encodeURIComponent(error)}`);
    }

    if (!code) {
      return res.redirect(`${redirectBase}?tiktok_oauth=error&reason=${encodeURIComponent("Missing authorization code")}`);
    }

    const result = await tiktokShopService.exchangeAuthCode(code);
    if (!result.success) {
      return res.redirect(`${redirectBase}?tiktok_oauth=error&reason=${encodeURIComponent(result.error || "Code exchange failed")}`);
    }

    return res.redirect(`${redirectBase}?tiktok_oauth=success`);
  } catch (error: any) {
    return res.redirect(`/admin/integrations?tiktok_oauth=error&reason=${encodeURIComponent(error.message || "OAuth callback failed")}`);
  }
});

router.delete("/settings/tiktok-shop", async (req: Request, res: Response) => {
  try {
    const { tiktokShopService } = await import("../../integrations/tiktok-shop/TikTokShopService");
    await storage.updateIntegrationSettings({
      tiktokShopConfigured: false,
      tiktokShopId: null,
      tiktokShopCipher: null,
      tiktokAppKey: null,
      tiktokAppSecretEncrypted: null,
      tiktokAccessTokenEncrypted: null,
      tiktokRefreshTokenEncrypted: null,
      tiktokAccessTokenExpiresAt: null,
      tiktokRefreshTokenExpiresAt: null,
      tiktokOpenId: null,
      tiktokSellerName: null,
      tiktokSellerBaseRegion: null,
      tiktokGrantedScopes: null,
      tiktokImportRuns: [],
    });
    tiktokShopService.clearCache();
    res.json({ success: true, message: "TikTok Shop configuration removed" });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to remove TikTok Shop settings" });
  }
});

// ==================== INSTAGRAM SHOP SETTINGS ====================

router.get("/settings/instagram-shop", async (req: Request, res: Response) => {
  try {
    const integrationSettings = await storage.getIntegrationSettings();
    res.json({
      configured: integrationSettings?.instagramShopConfigured || false,
      businessAccountId: integrationSettings?.instagramBusinessAccountId || null,
      catalogId: integrationSettings?.instagramCatalogId || null,
      hasAccessToken: !!integrationSettings?.instagramAccessTokenEncrypted,
      updatedAt: integrationSettings?.updatedAt || null,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch Instagram Shop settings" });
  }
});

router.patch("/settings/instagram-shop", async (req: Request, res: Response) => {
  try {
    const { encrypt } = await import("../../utils/encryption");
    const { instagramShopService } = await import("../../integrations/instagram-shop/InstagramShopService");
    const { businessAccountId, catalogId, accessToken } = req.body;

    const existingSettings = await storage.getIntegrationSettings();
    const isUpdate = existingSettings?.instagramShopConfigured;

    if (!isUpdate && !businessAccountId) {
      return res.status(400).json({ message: "Business Account ID is required" });
    }

    const updateData: any = {
      instagramShopConfigured: true,
    };

    if (businessAccountId) updateData.instagramBusinessAccountId = businessAccountId;
    if (catalogId) updateData.instagramCatalogId = catalogId;
    if (accessToken) updateData.instagramAccessTokenEncrypted = encrypt(accessToken);

    await storage.updateIntegrationSettings(updateData);
    instagramShopService.clearCache();

    res.json({ success: true, message: "Instagram Shop configuration saved" });
  } catch (error: any) {
    console.error("Error saving Instagram Shop settings:", error);
    res.status(500).json({ message: error.message || "Failed to save Instagram Shop settings" });
  }
});

router.post("/settings/instagram-shop/verify", async (req: Request, res: Response) => {
  try {
    const { instagramShopService } = await import("../../integrations/instagram-shop/InstagramShopService");
    const result = await instagramShopService.verify();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Verification failed" });
  }
});

router.delete("/settings/instagram-shop", async (req: Request, res: Response) => {
  try {
    const { instagramShopService } = await import("../../integrations/instagram-shop/InstagramShopService");
    await storage.updateIntegrationSettings({
      instagramShopConfigured: false,
      instagramBusinessAccountId: null,
      instagramCatalogId: null,
      instagramAccessTokenEncrypted: null,
    });
    instagramShopService.clearCache();
    res.json({ success: true, message: "Instagram Shop configuration removed" });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to remove Instagram Shop settings" });
  }
});

// ==================== PINTEREST SHOPPING SETTINGS ====================

router.get("/settings/pinterest-shopping", async (req: Request, res: Response) => {
  try {
    const integrationSettings = await storage.getIntegrationSettings();
    res.json({
      configured: integrationSettings?.pinterestShoppingConfigured || false,
      merchantId: integrationSettings?.pinterestMerchantId || null,
      catalogId: integrationSettings?.pinterestCatalogId || null,
      clientId: integrationSettings?.pinterestClientId || null,
      hasClientSecret: !!integrationSettings?.pinterestClientSecretEncrypted,
      hasAccessToken: !!integrationSettings?.pinterestAccessTokenEncrypted,
      hasRefreshToken: !!integrationSettings?.pinterestRefreshTokenEncrypted,
      lastSyncAt: integrationSettings?.pinterestLastSyncAt || null,
      lastSyncStatus: integrationSettings?.pinterestLastSyncStatus || "never",
      updatedAt: integrationSettings?.updatedAt || null,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch Pinterest Shopping settings" });
  }
});

router.patch("/settings/pinterest-shopping", async (req: Request, res: Response) => {
  try {
    const { encrypt } = await import("../../utils/encryption");
    const { pinterestShoppingService } = await import("../../integrations/pinterest-shopping/PinterestShoppingService");
    const { merchantId, catalogId, clientId, clientSecret, accessToken, refreshToken } = req.body;

    const existingSettings = await storage.getIntegrationSettings();
    const isUpdate = existingSettings?.pinterestShoppingConfigured;

    if (!isUpdate && (!merchantId || !clientId)) {
      return res.status(400).json({ message: "Merchant ID and Client ID are required" });
    }

    const updateData: any = {
      pinterestShoppingConfigured: true,
    };

    if (merchantId) updateData.pinterestMerchantId = merchantId;
    if (catalogId) updateData.pinterestCatalogId = catalogId;
    if (clientId) updateData.pinterestClientId = clientId;
    if (clientSecret) updateData.pinterestClientSecretEncrypted = encrypt(clientSecret);
    if (accessToken) updateData.pinterestAccessTokenEncrypted = encrypt(accessToken);
    if (refreshToken) updateData.pinterestRefreshTokenEncrypted = encrypt(refreshToken);

    await storage.updateIntegrationSettings(updateData);
    pinterestShoppingService.clearCache();

    console.log(`[Audit] Pinterest Shopping settings updated by admin`);
    res.json({ success: true, message: "Pinterest Shopping configuration saved" });
  } catch (error: any) {
    console.error("Error saving Pinterest Shopping settings:", error);
    res.status(500).json({ message: error.message || "Failed to save Pinterest Shopping settings" });
  }
});

router.post("/settings/pinterest-shopping/verify", async (req: Request, res: Response) => {
  try {
    const { pinterestShoppingService } = await import("../../integrations/pinterest-shopping/PinterestShoppingService");
    const result = await pinterestShoppingService.verifyCredentials();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Verification failed" });
  }
});

router.post("/integrations/pinterest-shopping/sync", async (req: Request, res: Response) => {
  try {
    const { pinterestShoppingService } = await import("../../integrations/pinterest-shopping/PinterestShoppingService");
    const result = await pinterestShoppingService.syncCatalog();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Sync failed" });
  }
});

router.delete("/settings/pinterest-shopping", async (req: Request, res: Response) => {
  try {
    const { pinterestShoppingService } = await import("../../integrations/pinterest-shopping/PinterestShoppingService");
    await storage.updateIntegrationSettings({
      pinterestShoppingConfigured: false,
      pinterestMerchantId: null,
      pinterestCatalogId: null,
      pinterestClientId: null,
      pinterestClientSecretEncrypted: null,
      pinterestAccessTokenEncrypted: null,
      pinterestRefreshTokenEncrypted: null,
      pinterestLastSyncAt: null,
      pinterestLastSyncStatus: "never",
    });
    pinterestShoppingService.clearCache();
    console.log(`[Audit] Pinterest Shopping settings removed by admin`);
    res.json({ success: true, message: "Pinterest Shopping configuration removed" });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to remove Pinterest Shopping settings" });
  }
});

// ==================== YOUTUBE SHOPPING SETTINGS ====================

router.get("/settings/youtube-shopping", async (req: Request, res: Response) => {
  try {
    const integrationSettings = await storage.getIntegrationSettings();
    res.json({
      configured: integrationSettings?.youtubeShoppingConfigured || false,
      channelId: integrationSettings?.youtubeChannelId || null,
      merchantId: integrationSettings?.youtubeMerchantId || null,
      clientId: integrationSettings?.youtubeClientId || null,
      hasClientSecret: !!integrationSettings?.youtubeClientSecretEncrypted,
      hasAccessToken: !!integrationSettings?.youtubeAccessTokenEncrypted,
      hasRefreshToken: !!integrationSettings?.youtubeRefreshTokenEncrypted,
      lastSyncAt: integrationSettings?.youtubeLastSyncAt || null,
      lastSyncStatus: integrationSettings?.youtubeLastSyncStatus || "never",
      updatedAt: integrationSettings?.updatedAt || null,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch YouTube Shopping settings" });
  }
});

router.patch("/settings/youtube-shopping", async (req: Request, res: Response) => {
  try {
    const { encrypt } = await import("../../utils/encryption");
    const { youtubeShoppingService } = await import("../../integrations/youtube-shopping/YouTubeShoppingService");
    const { channelId, merchantId, clientId, clientSecret, accessToken, refreshToken } = req.body;

    const existingSettings = await storage.getIntegrationSettings();
    const isUpdate = existingSettings?.youtubeShoppingConfigured;

    if (!isUpdate && (!channelId || !clientId)) {
      return res.status(400).json({ message: "Channel ID and Client ID are required" });
    }

    const updateData: any = {
      youtubeShoppingConfigured: true,
    };

    if (channelId) updateData.youtubeChannelId = channelId;
    if (merchantId) updateData.youtubeMerchantId = merchantId;
    if (clientId) updateData.youtubeClientId = clientId;
    if (clientSecret) updateData.youtubeClientSecretEncrypted = encrypt(clientSecret);
    if (accessToken) updateData.youtubeAccessTokenEncrypted = encrypt(accessToken);
    if (refreshToken) updateData.youtubeRefreshTokenEncrypted = encrypt(refreshToken);

    await storage.updateIntegrationSettings(updateData);
    youtubeShoppingService.clearCache();

    console.log(`[Audit] YouTube Shopping settings updated by admin`);
    res.json({ success: true, message: "YouTube Shopping configuration saved" });
  } catch (error: any) {
    console.error("Error saving YouTube Shopping settings:", error);
    res.status(500).json({ message: error.message || "Failed to save YouTube Shopping settings" });
  }
});

router.post("/settings/youtube-shopping/verify", async (req: Request, res: Response) => {
  try {
    const { youtubeShoppingService } = await import("../../integrations/youtube-shopping/YouTubeShoppingService");
    const result = await youtubeShoppingService.verifyCredentials();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Verification failed" });
  }
});

router.post("/integrations/youtube-shopping/sync", async (req: Request, res: Response) => {
  try {
    const { youtubeShoppingService } = await import("../../integrations/youtube-shopping/YouTubeShoppingService");
    const result = await youtubeShoppingService.syncCatalog();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Sync failed" });
  }
});

router.delete("/settings/youtube-shopping", async (req: Request, res: Response) => {
  try {
    const { youtubeShoppingService } = await import("../../integrations/youtube-shopping/YouTubeShoppingService");
    await storage.updateIntegrationSettings({
      youtubeShoppingConfigured: false,
      youtubeChannelId: null,
      youtubeMerchantId: null,
      youtubeClientId: null,
      youtubeClientSecretEncrypted: null,
      youtubeAccessTokenEncrypted: null,
      youtubeRefreshTokenEncrypted: null,
      youtubeLastSyncAt: null,
      youtubeLastSyncStatus: "never",
    });
    youtubeShoppingService.clearCache();
    console.log(`[Audit] YouTube Shopping settings removed by admin`);
    res.json({ success: true, message: "YouTube Shopping configuration removed" });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to remove YouTube Shopping settings" });
  }
});

// ==================== SNAPCHAT SHOPPING SETTINGS ====================

router.get("/settings/snapchat-shopping", async (req: Request, res: Response) => {
  try {
    const integrationSettings = await storage.getIntegrationSettings();
    res.json({
      configured: integrationSettings?.snapchatShoppingConfigured || false,
      accountId: integrationSettings?.snapchatAccountId || null,
      catalogId: integrationSettings?.snapchatCatalogId || null,
      clientId: integrationSettings?.snapchatClientId || null,
      hasClientSecret: !!integrationSettings?.snapchatClientSecretEncrypted,
      hasAccessToken: !!integrationSettings?.snapchatAccessTokenEncrypted,
      hasRefreshToken: !!integrationSettings?.snapchatRefreshTokenEncrypted,
      lastSyncAt: integrationSettings?.snapchatLastSyncAt || null,
      lastSyncStatus: integrationSettings?.snapchatLastSyncStatus || "never",
      updatedAt: integrationSettings?.updatedAt || null,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch Snapchat Shopping settings" });
  }
});

router.patch("/settings/snapchat-shopping", async (req: Request, res: Response) => {
  try {
    const { encrypt } = await import("../../utils/encryption");
    const { snapchatShoppingService } = await import("../../integrations/snapchat-shopping/SnapchatShoppingService");
    const { accountId, catalogId, clientId, clientSecret, accessToken, refreshToken } = req.body;

    const existingSettings = await storage.getIntegrationSettings();
    const isUpdate = existingSettings?.snapchatShoppingConfigured;

    if (!isUpdate && (!accountId || !clientId)) {
      return res.status(400).json({ message: "Account ID and Client ID are required" });
    }

    const updateData: any = {
      snapchatShoppingConfigured: true,
    };

    if (accountId) updateData.snapchatAccountId = accountId;
    if (catalogId) updateData.snapchatCatalogId = catalogId;
    if (clientId) updateData.snapchatClientId = clientId;
    if (clientSecret) updateData.snapchatClientSecretEncrypted = encrypt(clientSecret);
    if (accessToken) updateData.snapchatAccessTokenEncrypted = encrypt(accessToken);
    if (refreshToken) updateData.snapchatRefreshTokenEncrypted = encrypt(refreshToken);

    await storage.updateIntegrationSettings(updateData);
    snapchatShoppingService.clearCache();

    console.log(`[Audit] Snapchat Shopping settings updated by admin`);
    res.json({ success: true, message: "Snapchat Shopping configuration saved" });
  } catch (error: any) {
    console.error("Error saving Snapchat Shopping settings:", error);
    res.status(500).json({ message: error.message || "Failed to save Snapchat Shopping settings" });
  }
});

router.post("/settings/snapchat-shopping/verify", async (req: Request, res: Response) => {
  try {
    const { snapchatShoppingService } = await import("../../integrations/snapchat-shopping/SnapchatShoppingService");
    const result = await snapchatShoppingService.verifyCredentials();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Verification failed" });
  }
});

router.post("/integrations/snapchat-shopping/sync", async (req: Request, res: Response) => {
  try {
    const { snapchatShoppingService } = await import("../../integrations/snapchat-shopping/SnapchatShoppingService");
    const result = await snapchatShoppingService.syncCatalog();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Sync failed" });
  }
});

router.delete("/settings/snapchat-shopping", async (req: Request, res: Response) => {
  try {
    const { snapchatShoppingService } = await import("../../integrations/snapchat-shopping/SnapchatShoppingService");
    await storage.updateIntegrationSettings({
      snapchatShoppingConfigured: false,
      snapchatAccountId: null,
      snapchatCatalogId: null,
      snapchatClientId: null,
      snapchatClientSecretEncrypted: null,
      snapchatAccessTokenEncrypted: null,
      snapchatRefreshTokenEncrypted: null,
      snapchatLastSyncAt: null,
      snapchatLastSyncStatus: "never",
    });
    snapchatShoppingService.clearCache();
    console.log(`[Audit] Snapchat Shopping settings removed by admin`);
    res.json({ success: true, message: "Snapchat Shopping configuration removed" });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to remove Snapchat Shopping settings" });
  }
});

// ==================== X SHOPPING SETTINGS ====================

router.get("/settings/x-shopping", async (req: Request, res: Response) => {
  try {
    const integrationSettings = await storage.getIntegrationSettings();
    res.json({
      configured: integrationSettings?.xShoppingConfigured || false,
      accountId: integrationSettings?.xAccountId || null,
      catalogId: integrationSettings?.xCatalogId || null,
      clientId: integrationSettings?.xClientId || null,
      hasClientSecret: !!integrationSettings?.xClientSecretEncrypted,
      hasAccessToken: !!integrationSettings?.xAccessTokenEncrypted,
      hasRefreshToken: !!integrationSettings?.xRefreshTokenEncrypted,
      lastSyncAt: integrationSettings?.xLastSyncAt || null,
      lastSyncStatus: integrationSettings?.xLastSyncStatus || "never",
      updatedAt: integrationSettings?.updatedAt || null,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch X Shopping settings" });
  }
});

router.patch("/settings/x-shopping", async (req: Request, res: Response) => {
  try {
    const { encrypt } = await import("../../utils/encryption");
    const { xShoppingService } = await import("../../integrations/x-shopping/XShoppingService");
    const { accountId, catalogId, clientId, clientSecret, accessToken, refreshToken } = req.body;

    const existingSettings = await storage.getIntegrationSettings();
    const isUpdate = existingSettings?.xShoppingConfigured;

    if (!isUpdate && (!accountId || !clientId)) {
      return res.status(400).json({ message: "Account ID and Client ID are required" });
    }

    const updateData: any = {
      xShoppingConfigured: true,
    };

    if (accountId) updateData.xAccountId = accountId;
    if (catalogId) updateData.xCatalogId = catalogId;
    if (clientId) updateData.xClientId = clientId;
    if (clientSecret) updateData.xClientSecretEncrypted = encrypt(clientSecret);
    if (accessToken) updateData.xAccessTokenEncrypted = encrypt(accessToken);
    if (refreshToken) updateData.xRefreshTokenEncrypted = encrypt(refreshToken);

    await storage.updateIntegrationSettings(updateData);
    xShoppingService.clearCache();

    console.log(`[Audit] X Shopping settings updated by admin`);
    res.json({ success: true, message: "X Shopping configuration saved" });
  } catch (error: any) {
    console.error("Error saving X Shopping settings:", error);
    res.status(500).json({ message: error.message || "Failed to save X Shopping settings" });
  }
});

router.post("/settings/x-shopping/verify", async (req: Request, res: Response) => {
  try {
    const { xShoppingService } = await import("../../integrations/x-shopping/XShoppingService");
    const result = await xShoppingService.verifyCredentials();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Verification failed" });
  }
});

router.post("/integrations/x-shopping/sync", async (req: Request, res: Response) => {
  try {
    const { xShoppingService } = await import("../../integrations/x-shopping/XShoppingService");
    const result = await xShoppingService.syncCatalog();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Sync failed" });
  }
});

router.delete("/settings/x-shopping", async (req: Request, res: Response) => {
  try {
    const { xShoppingService } = await import("../../integrations/x-shopping/XShoppingService");
    await storage.updateIntegrationSettings({
      xShoppingConfigured: false,
      xAccountId: null,
      xCatalogId: null,
      xClientId: null,
      xClientSecretEncrypted: null,
      xAccessTokenEncrypted: null,
      xRefreshTokenEncrypted: null,
      xLastSyncAt: null,
      xLastSyncStatus: "never",
    });
    xShoppingService.clearCache();
    console.log(`[Audit] X Shopping settings removed by admin`);
    res.json({ success: true, message: "X Shopping configuration removed" });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to remove X Shopping settings" });
  }
});

// ==================== META MARKETING SETTINGS ====================

async function createMetaAdminAudit(req: Request, action: string, details?: Record<string, unknown>): Promise<void> {
  const adminId = (req as any).adminUser?.id;
  if (!adminId) return;

  try {
    await storage.createAdminAuditLog({
      adminId,
      action,
      targetType: "integration",
      targetId: "meta_marketing",
      details: details || null,
      ipAddress: req.ip || null,
    });
  } catch (error) {
    console.warn("[META] Failed to write admin audit log:", error);
  }
}

router.get("/settings/meta-marketing", async (_req: Request, res: Response) => {
  try {
    const { metaCatalogService } = await import("../../integrations/meta/MetaCatalogService");
    const summary = await metaCatalogService.getConfigSummary();
    const catalogFeedUrl = summary.catalogFeedKey ? await metaCatalogService.getCatalogFeedUrl(summary.catalogFeedKey) : null;
    res.json({
      configured: summary.configured,
      pixelId: summary.pixelId,
      catalogId: summary.catalogId,
      productFeedId: summary.productFeedId,
      hasAccessToken: summary.hasAccessToken,
      hasAppSecret: summary.hasAppSecret,
      hasTestEventCode: summary.hasTestEventCode,
      hasCatalogFeedKey: summary.hasCatalogFeedKey,
      capiEnabled: summary.capiEnabled,
      catalogFeedUrl,
      lastSyncAt: summary.lastSyncAt,
      lastSyncStatus: summary.lastSyncStatus,
      capiLastDispatchAt: summary.capiLastDispatchAt,
      capiLastDispatchStatus: summary.capiLastDispatchStatus,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch Meta Marketing settings" });
  }
});

router.patch("/settings/meta-marketing", async (req: Request, res: Response) => {
  try {
    const { encrypt } = await import("../../utils/encryption");
    const { metaCatalogService } = await import("../../integrations/meta/MetaCatalogService");
    const {
      pixelId,
      catalogId,
      productFeedId,
      accessToken,
      appSecret,
      testEventCode,
      capiEnabled,
    } = req.body;

    const existing = await storage.getIntegrationSettings();
    const isUpdate = !!existing?.metaMarketingConfigured;

    if (!isUpdate && !accessToken) {
      return res.status(400).json({ message: "Access Token is required" });
    }

    const updateData: any = {
      metaMarketingConfigured: true,
    };

    if (pixelId) updateData.metaPixelId = pixelId;
    if (catalogId) updateData.metaCatalogId = catalogId;
    if (productFeedId) updateData.metaProductFeedId = productFeedId;
    if (accessToken) updateData.metaAccessTokenEncrypted = encrypt(accessToken);
    if (appSecret) updateData.metaAppSecretEncrypted = encrypt(appSecret);
    if (testEventCode) updateData.metaTestEventCodeEncrypted = encrypt(testEventCode);
    if (typeof capiEnabled === "boolean") updateData.metaCapiEnabled = capiEnabled;

    await storage.updateIntegrationSettings(updateData);
    await metaCatalogService.ensureCatalogFeedKey();
    await createMetaAdminAudit(req, "meta_marketing.updated", {
      configured: true,
      hasPixelId: !!(pixelId || existing?.metaPixelId),
      hasCatalogId: !!(catalogId || existing?.metaCatalogId),
      hasProductFeedId: !!(productFeedId || existing?.metaProductFeedId),
      hasAccessToken: !!(accessToken || existing?.metaAccessTokenEncrypted),
      hasAppSecret: !!(appSecret || existing?.metaAppSecretEncrypted),
      hasTestEventCode: !!(testEventCode || existing?.metaTestEventCodeEncrypted),
      capiEnabled: typeof capiEnabled === "boolean" ? capiEnabled : (existing?.metaCapiEnabled || false),
    });

    res.json({ success: true, message: "Meta Marketing configuration saved" });
  } catch (error: any) {
    console.error("Error saving Meta Marketing settings:", error);
    res.status(500).json({ message: error.message || "Failed to save Meta Marketing settings" });
  }
});

router.post("/settings/meta-marketing/verify", async (req: Request, res: Response) => {
  try {
    const { metaCatalogService } = await import("../../integrations/meta/MetaCatalogService");
    const result = await metaCatalogService.verify();
    await createMetaAdminAudit(req, "meta_marketing.verified", {
      success: result.success,
      hasError: !result.success,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Verification failed" });
  }
});

router.post("/integrations/meta-marketing/sync", async (req: Request, res: Response) => {
  try {
    const { metaCatalogService } = await import("../../integrations/meta/MetaCatalogService");
    const result = await metaCatalogService.syncCatalog();
    await createMetaAdminAudit(req, "meta_marketing.sync_manual", {
      success: result.success,
      hasError: !result.success,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Sync failed" });
  }
});

router.post("/integrations/meta-marketing/test-event", async (req: Request, res: Response) => {
  try {
    const { metaConversionsService } = await import("../../integrations/meta/MetaConversionsService");
    const result = await metaConversionsService.sendTestEvent();
    await createMetaAdminAudit(req, "meta_marketing.test_event", {
      success: result.success,
      hasError: !result.success,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Test event failed" });
  }
});

router.get("/integrations/meta-marketing/stats", async (_req: Request, res: Response) => {
  try {
    const { metaConversionsService } = await import("../../integrations/meta/MetaConversionsService");
    const stats = await metaConversionsService.getStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to fetch Meta stats" });
  }
});

router.delete("/settings/meta-marketing", async (req: Request, res: Response) => {
  try {
    await storage.updateIntegrationSettings({
      metaMarketingConfigured: false,
      metaPixelId: null,
      metaCatalogId: null,
      metaProductFeedId: null,
      metaAccessTokenEncrypted: null,
      metaAppSecretEncrypted: null,
      metaTestEventCodeEncrypted: null,
      metaCatalogFeedKeyEncrypted: null,
      metaCatalogLastSyncAt: null,
      metaCatalogLastSyncStatus: "never",
      metaCapiEnabled: false,
      metaCapiLastDispatchAt: null,
      metaCapiLastDispatchStatus: "never",
    });
    await createMetaAdminAudit(req, "meta_marketing.deleted");
    res.json({ success: true, message: "Meta Marketing configuration removed" });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to remove Meta Marketing settings" });
  }
});

// ==================== MAILCHIMP INTEGRATION ====================

router.get("/settings/mailchimp", async (req: Request, res: Response) => {
  try {
    const integrationSettings = await storage.getIntegrationSettings();
    res.json({
      configured: integrationSettings?.mailchimpConfigured || false,
      serverPrefix: integrationSettings?.mailchimpServerPrefix || null,
      audienceId: integrationSettings?.mailchimpAudienceId || null,
      hasApiKey: !!integrationSettings?.mailchimpApiKeyEncrypted,
      lastSyncAt: integrationSettings?.mailchimpLastSyncAt || null,
      lastSyncStatus: integrationSettings?.mailchimpLastSyncStatus || "never",
      updatedAt: integrationSettings?.updatedAt || null,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch Mailchimp settings" });
  }
});

router.patch("/settings/mailchimp", async (req: Request, res: Response) => {
  try {
    const { encrypt } = await import("../../utils/encryption");
    const { mailchimpService } = await import("../../integrations/mailchimp/MailchimpService");
    const { apiKey, serverPrefix, audienceId } = req.body;

    const existingSettings = await storage.getIntegrationSettings();
    const isUpdate = existingSettings?.mailchimpConfigured;

    if (!isUpdate && (!apiKey || !serverPrefix || !audienceId)) {
      return res.status(400).json({ message: "API Key, Server Prefix, and Audience ID are required" });
    }

    const updateData: any = {
      mailchimpConfigured: true,
    };

    if (apiKey) updateData.mailchimpApiKeyEncrypted = encrypt(apiKey);
    if (serverPrefix) updateData.mailchimpServerPrefix = serverPrefix;
    if (audienceId) updateData.mailchimpAudienceId = audienceId;

    await storage.updateIntegrationSettings(updateData);
    mailchimpService.clearCache();

    console.log(`[Audit] Mailchimp settings updated by admin`);
    res.json({ success: true, message: "Mailchimp configuration saved" });
  } catch (error: any) {
    console.error("Error saving Mailchimp settings:", error);
    res.status(500).json({ message: error.message || "Failed to save Mailchimp settings" });
  }
});

router.post("/settings/mailchimp/verify", async (req: Request, res: Response) => {
  try {
    const { mailchimpService } = await import("../../integrations/mailchimp/MailchimpService");
    const result = await mailchimpService.verifyCredentials();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Verification failed" });
  }
});

router.delete("/settings/mailchimp", async (req: Request, res: Response) => {
  try {
    const { mailchimpService } = await import("../../integrations/mailchimp/MailchimpService");
    await storage.updateIntegrationSettings({
      mailchimpConfigured: false,
      mailchimpApiKeyEncrypted: null,
      mailchimpServerPrefix: null,
      mailchimpAudienceId: null,
      mailchimpLastSyncAt: null,
      mailchimpLastSyncStatus: "never",
    });
    mailchimpService.clearCache();
    console.log(`[Audit] Mailchimp settings removed by admin`);
    res.json({ success: true, message: "Mailchimp configuration removed" });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to remove Mailchimp settings" });
  }
});

// ==================== GOOGLE PLACES SETTINGS ====================

router.get("/settings/google-places", async (req: Request, res: Response) => {
  try {
    const { maskKey } = await import("../../utils/encryption");
    const settings = await storage.getIntegrationSettings();

    res.json({
      configured: settings?.googlePlacesConfigured || false,
      apiKeyMasked: settings?.googlePlacesApiKeyEncrypted ? maskKey("AIza...configured") : null,
      placeId: settings?.googlePlacesId || "",
      updatedAt: settings?.updatedAt || null,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch Google Places settings" });
  }
});

router.patch("/settings/google-places", async (req: Request, res: Response) => {
  try {
    const { encrypt } = await import("../../utils/encryption");
    const { apiKey, placeId } = req.body;

    if (!apiKey && !placeId) {
      return res.status(400).json({ message: "API key or Place ID is required" });
    }

    const updateData: any = {
      googlePlacesConfigured: true,
    };

    if (apiKey) updateData.googlePlacesApiKeyEncrypted = encrypt(apiKey);
    if (placeId) updateData.googlePlacesId = placeId;

    await storage.updateIntegrationSettings(updateData);
    console.log(`[Audit] Google Places settings updated by admin`);

    res.json({ success: true, message: "Google Places configuration saved" });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to save Google Places settings" });
  }
});

router.delete("/settings/google-places", async (req: Request, res: Response) => {
  try {
    await storage.updateIntegrationSettings({
      googlePlacesConfigured: false,
      googlePlacesApiKeyEncrypted: null,
      googlePlacesId: null,
    });
    console.log(`[Audit] Google Places settings removed by admin`);
    res.json({ success: true, message: "Google Places configuration removed" });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to remove Google Places settings" });
  }
});

export default router;
