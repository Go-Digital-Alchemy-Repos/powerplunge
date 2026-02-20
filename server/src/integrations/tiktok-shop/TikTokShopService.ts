import { storage } from "../../../storage";
import { decrypt, encrypt } from "../../utils/encryption";
import { productsService } from "../../services/products.service";
import {
  TikTokApiClient,
  TikTokApiError,
  TikTokAuthorizedShop,
  TikTokProduct,
  TikTokTokenPayload,
  fromTikTokUnixTimestamp,
} from "./TikTokApiClient";

export interface TikTokShopConfig {
  configured: boolean;
  shopId: string | null;
  shopCipher: string | null;
  sellerName: string | null;
  sellerBaseRegion: string | null;
  appKey: string | null;
  hasAppSecret: boolean;
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
  accessTokenExpiresAt: Date | null;
  refreshTokenExpiresAt: Date | null;
  updatedAt: Date | null;
}

export interface TikTokShopVerifyResult {
  success: boolean;
  error?: string;
  shopName?: string;
  shopId?: string;
  shopCipher?: string;
  shopCount?: number;
  refreshedToken?: boolean;
}

export interface TikTokShopAuthCodeExchangeResult {
  success: boolean;
  error?: string;
  sellerName?: string;
  sellerBaseRegion?: string;
  selectedShop?: TikTokAuthorizedShop | null;
  shops?: TikTokAuthorizedShop[];
}

export interface TikTokProductPreview {
  id: string;
  title: string;
  status: string;
  region: string | null;
  currency: string | null;
  price: string | null;
  sellerSku: string | null;
}

export interface TikTokProductSyncResult {
  success: boolean;
  error?: string;
  products?: TikTokProductPreview[];
  count?: number;
  totalCount?: number | null;
  nextPageToken?: string | null;
  shopCipher?: string | null;
  refreshedToken?: boolean;
}

export interface TikTokProductImportFailure {
  productId: string;
  reason: string;
}

export interface TikTokProductImportResult {
  success: boolean;
  error?: string;
  dryRun: boolean;
  created: number;
  updated: number;
  skipped: number;
  failures: TikTokProductImportFailure[];
}

export interface TikTokProductBulkImportResult extends TikTokProductImportResult {
  pagesFetched: number;
  productsFetched: number;
  truncated: boolean;
  nextPageToken: string | null;
}

type TikTokImportRunScope = "page" | "bulk";
type TikTokImportRunStatus = "success" | "failed";
type TikTokImportRunMode = "dry_run" | "import";

interface TikTokDecryptedCredentials {
  appKey: string;
  appSecret: string;
  accessToken: string;
  refreshToken: string | null;
}

interface TikTokProductImportContext {
  existingBySku: Map<string, any>;
  shopTag: string;
}

class TikTokShopService {
  private readonly apiClient = new TikTokApiClient();
  private configCache: TikTokShopConfig | null = null;
  private lastConfigFetch = 0;
  private readonly CACHE_TTL = 60000;
  private readonly IMPORT_RUN_LOG_LIMIT = 30;
  private readonly IMPORT_RUN_FAILURE_LIMIT = 30;
  private readonly MOCK_MODE = process.env.TIKTOK_SHOP_MOCK_MODE === "true";
  private readonly MOCK_AUTH_CODE = process.env.TIKTOK_SHOP_MOCK_AUTH_CODE || "mock_auth_code";
  private readonly AUTHORIZE_BASE_URL = process.env.TIKTOK_SHOP_AUTHORIZE_BASE_URL || "https://auth.tiktok-shops.com/oauth/authorize";

  private isMockMode(): boolean {
    return this.MOCK_MODE;
  }

  private getMockTokenPayload(): TikTokTokenPayload {
    const now = Math.floor(Date.now() / 1000);
    return {
      access_token: `mock_access_${now}`,
      access_token_expire_in: now + 2 * 60 * 60,
      refresh_token: `mock_refresh_${now}`,
      refresh_token_expire_in: now + 30 * 24 * 60 * 60,
      open_id: "mock_open_id",
      seller_name: "Mock TikTok Seller",
      seller_base_region: "US",
      user_type: 1,
      granted_scopes: ["authorization.shop", "product.read"],
    };
  }

  private getMockShops(): TikTokAuthorizedShop[] {
    try {
      const raw = process.env.TIKTOK_SHOP_MOCK_SHOPS_JSON;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const shops = parsed
            .map((shop: any, idx: number) => ({
              id: String(shop?.id || `mock-shop-${idx + 1}`),
              name: shop?.name ? String(shop.name) : undefined,
              shop_name: shop?.shop_name ? String(shop.shop_name) : undefined,
              region: shop?.region ? String(shop.region) : "US",
              seller_type: shop?.seller_type ? String(shop.seller_type) : "local",
              cipher: String(shop?.cipher || `mock_cipher_${idx + 1}`),
              code: shop?.code ? String(shop.code) : undefined,
            }))
            .filter((shop) => !!shop.id && !!shop.cipher);
          if (shops.length > 0) return shops;
        }
      }
    } catch {
      // Ignore invalid JSON and use defaults.
    }

    return [
      {
        id: "mock-shop-1",
        name: "Power Plunge Demo Shop",
        shop_name: "Power Plunge Demo Shop",
        region: "US",
        seller_type: "local",
        cipher: "mock_cipher_1",
        code: "PP-DEMO-1",
      },
      {
        id: "mock-shop-2",
        name: "Power Plunge Backup Shop",
        shop_name: "Power Plunge Backup Shop",
        region: "US",
        seller_type: "local",
        cipher: "mock_cipher_2",
        code: "PP-DEMO-2",
      },
    ];
  }

  private getMockProducts(): TikTokProduct[] {
    try {
      const raw = process.env.TIKTOK_SHOP_MOCK_PRODUCTS_JSON;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const products = parsed
            .map((item: any, idx: number): TikTokProduct => ({
              product_id: String(item?.product_id || item?.id || `mock-product-${idx + 1}`),
              title: String(item?.title || item?.name || `Mock Product ${idx + 1}`),
              status: String(item?.status || "active"),
              sales_regions: Array.isArray(item?.sales_regions)
                ? item.sales_regions.map((region: any) => String(region))
                : ["US"],
              skus: Array.isArray(item?.skus) && item.skus.length > 0
                ? item.skus.map((sku: any, skuIdx: number) => ({
                  sku_id: String(sku?.sku_id || sku?.id || `mock-sku-${idx + 1}-${skuIdx + 1}`),
                  seller_sku: String(sku?.seller_sku || `PP-MOCK-${idx + 1}-${skuIdx + 1}`),
                  price: {
                    amount: String(sku?.price?.amount || "199.00"),
                    currency: String(sku?.price?.currency || "USD"),
                  },
                }))
                : [{
                  sku_id: `mock-sku-${idx + 1}-1`,
                  seller_sku: `PP-MOCK-${idx + 1}-1`,
                  price: { amount: "199.00", currency: "USD" },
                }],
            }))
            .filter((product) => !!product.product_id);
          if (products.length > 0) return products;
        }
      }
    } catch {
      // Ignore invalid JSON and use defaults.
    }

    return [
      {
        product_id: "mock-product-1",
        title: "Cold Plunge Barrel - Starter",
        status: "active",
        sales_regions: ["US"],
        skus: [{ sku_id: "mock-sku-1", seller_sku: "PP-STARTER-001", price: { amount: "1299.00", currency: "USD" } }],
      },
      {
        product_id: "mock-product-2",
        title: "Cold Plunge Barrel - Pro",
        status: "active",
        sales_regions: ["US"],
        skus: [{ sku_id: "mock-sku-2", seller_sku: "PP-PRO-001", price: { amount: "1999.00", currency: "USD" } }],
      },
      {
        product_id: "mock-product-3",
        title: "Insulated Lid",
        status: "active",
        sales_regions: ["US"],
        skus: [{ sku_id: "mock-sku-3", seller_sku: "PP-LID-001", price: { amount: "199.00", currency: "USD" } }],
      },
      {
        product_id: "mock-product-4",
        title: "Water Care Starter Kit",
        status: "draft",
        sales_regions: ["US"],
        skus: [{ sku_id: "mock-sku-4", seller_sku: "PP-WATER-001", price: { amount: "89.00", currency: "USD" } }],
      },
      {
        product_id: "mock-product-5",
        title: "Thermometer + Timer Bundle",
        status: "active",
        sales_regions: ["US"],
        skus: [{ sku_id: "mock-sku-5", seller_sku: "PP-BUNDLE-001", price: { amount: "59.00", currency: "USD" } }],
      },
      {
        product_id: "mock-product-6",
        title: "Recovery Towel Pack",
        status: "active",
        sales_regions: ["US"],
        skus: [{ sku_id: "mock-sku-6", seller_sku: "PP-TOWEL-001", price: { amount: "39.00", currency: "USD" } }],
      },
    ];
  }

  async getConfig(): Promise<TikTokShopConfig> {
    const now = Date.now();
    if (this.configCache && now - this.lastConfigFetch < this.CACHE_TTL) {
      return this.configCache;
    }

    const settings = await storage.getIntegrationSettings();
    this.configCache = {
      configured: settings?.tiktokShopConfigured || false,
      shopId: settings?.tiktokShopId || null,
      shopCipher: settings?.tiktokShopCipher || null,
      sellerName: settings?.tiktokSellerName || null,
      sellerBaseRegion: settings?.tiktokSellerBaseRegion || null,
      appKey: settings?.tiktokAppKey || null,
      hasAppSecret: !!settings?.tiktokAppSecretEncrypted,
      hasAccessToken: !!settings?.tiktokAccessTokenEncrypted,
      hasRefreshToken: !!settings?.tiktokRefreshTokenEncrypted,
      accessTokenExpiresAt: settings?.tiktokAccessTokenExpiresAt || null,
      refreshTokenExpiresAt: settings?.tiktokRefreshTokenExpiresAt || null,
      updatedAt: settings?.updatedAt || null,
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

  private getShopLabel(shop: TikTokAuthorizedShop): string {
    return shop.name || shop.shop_name || shop.code || shop.id;
  }

  private mapProductPreview(raw: TikTokProduct): TikTokProductPreview {
    const firstSku = Array.isArray(raw.skus) ? raw.skus[0] : undefined;
    return {
      id: raw.product_id || raw.id || "unknown",
      title: raw.title || raw.name || "Untitled product",
      status: raw.status || "unknown",
      region: raw.sales_regions?.[0] || null,
      currency: firstSku?.price?.currency || null,
      price: firstSku?.price?.amount || null,
      sellerSku: firstSku?.seller_sku || firstSku?.sku_id || firstSku?.id || null,
    };
  }

  private normalizeSku(value: string | null | undefined): string {
    return String(value || "").trim().toLowerCase();
  }

  private parsePriceToCents(value: string | null | undefined): number | null {
    if (!value) return null;
    const raw = String(value).trim();
    if (!raw) return null;

    if (/^\d+$/.test(raw)) {
      const intVal = Number(raw);
      return Number.isFinite(intVal) && intVal > 0 ? intVal : null;
    }

    const floatVal = Number.parseFloat(raw);
    if (!Number.isFinite(floatVal) || floatVal <= 0) return null;
    return Math.round(floatVal * 100);
  }

  private mapStatusToActive(status: string | null | undefined): boolean {
    const normalized = String(status || "").trim().toLowerCase();
    if (!normalized) return false;

    if (["active", "activate", "available", "on_sale", "live", "approved"].includes(normalized)) {
      return true;
    }
    if (["inactive", "deactivate", "suspended", "deleted", "rejected", "offline", "draft"].includes(normalized)) {
      return false;
    }
    return false;
  }

  private async buildProductImportContext(): Promise<TikTokProductImportContext> {
    const settings = await storage.getIntegrationSettings();
    const shopCipher = settings?.tiktokShopCipher || null;
    const shopTag = shopCipher ? `tiktok-shop:${shopCipher}` : "tiktok-shop";
    const existingProducts = await storage.getProducts();
    const existingBySku = new Map(
      existingProducts
        .filter((product) => !!product.sku)
        .map((product) => [this.normalizeSku(product.sku), product]),
    );

    return { existingBySku, shopTag };
  }

  private clampImportFailures(failures: TikTokProductImportFailure[]): TikTokProductImportFailure[] {
    if (!Array.isArray(failures) || failures.length === 0) return [];
    return failures
      .slice(0, this.IMPORT_RUN_FAILURE_LIMIT)
      .map((failure) => ({
        productId: String(failure?.productId || "unknown").slice(0, 128),
        reason: String(failure?.reason || "Unknown failure").slice(0, 500),
      }));
  }

  private async appendImportRunLog(params: {
    startedAt: Date;
    scope: TikTokImportRunScope;
    mode: TikTokImportRunMode;
    status: TikTokImportRunStatus;
    productsRequested?: number;
    pageSize?: number;
    maxPages?: number;
    maxProducts?: number;
    result: TikTokProductImportResult | TikTokProductBulkImportResult;
  }): Promise<void> {
    try {
      const settings = await storage.getIntegrationSettings();
      const existingRuns = Array.isArray(settings?.tiktokImportRuns) ? settings.tiktokImportRuns : [];
      const now = new Date();
      const result = params.result;
      const runRecord = {
        id: `ttimp_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`,
        startedAt: params.startedAt.toISOString(),
        finishedAt: now.toISOString(),
        scope: params.scope,
        mode: params.mode,
        status: params.status,
        created: Number(result.created || 0),
        updated: Number(result.updated || 0),
        skipped: Number(result.skipped || 0),
        failureCount: Array.isArray(result.failures) ? result.failures.length : 0,
        failures: this.clampImportFailures(Array.isArray(result.failures) ? result.failures : []),
        productsRequested: Number.isFinite(params.productsRequested) ? Number(params.productsRequested) : null,
        productsFetched: "productsFetched" in result ? Number(result.productsFetched || 0) : null,
        pagesFetched: "pagesFetched" in result ? Number(result.pagesFetched || 0) : null,
        truncated: "truncated" in result ? Boolean(result.truncated) : null,
        nextPageToken: "nextPageToken" in result ? (result.nextPageToken || null) : null,
        pageSize: Number.isFinite(params.pageSize) ? Number(params.pageSize) : null,
        maxPages: Number.isFinite(params.maxPages) ? Number(params.maxPages) : null,
        maxProducts: Number.isFinite(params.maxProducts) ? Number(params.maxProducts) : null,
        error: result.error || null,
      };

      const normalizedExisting = existingRuns.filter((entry) => entry && typeof entry === "object");
      await storage.updateIntegrationSettings({
        tiktokImportRuns: [runRecord, ...normalizedExisting].slice(0, this.IMPORT_RUN_LOG_LIMIT),
      });
    } catch (error: any) {
      console.error("[TIKTOK] Failed to append import run log:", error?.message || error);
    }
  }

  private async upsertProductPageIntoCatalog(
    products: TikTokProductPreview[],
    context: TikTokProductImportContext,
    opts?: { dryRun?: boolean },
  ): Promise<Pick<TikTokProductImportResult, "created" | "updated" | "skipped" | "failures">> {
    const dryRun = opts?.dryRun === true;
    const pageResult: Pick<TikTokProductImportResult, "created" | "updated" | "skipped" | "failures"> = {
      created: 0,
      updated: 0,
      skipped: 0,
      failures: [],
    };

    for (const product of products) {
      const productId = String(product.id || "").trim();
      const title = String(product.title || "").trim();
      if (!productId) {
        pageResult.skipped += 1;
        pageResult.failures.push({ productId: "unknown", reason: "Missing TikTok product ID" });
        continue;
      }
      if (!title) {
        pageResult.skipped += 1;
        pageResult.failures.push({ productId, reason: "Missing TikTok product title" });
        continue;
      }

      const importSku = (product.sellerSku || "").trim() || `tiktok:${productId}`;
      const skuKey = this.normalizeSku(importSku);
      const priceCents = this.parsePriceToCents(product.price);
      if (!priceCents) {
        pageResult.skipped += 1;
        pageResult.failures.push({ productId, reason: `Invalid price value "${product.price || ""}"` });
        continue;
      }

      const active = this.mapStatusToActive(product.status);
      const status = active ? "published" : "draft";
      const existing = context.existingBySku.get(skuKey);

      try {
        if (existing) {
          const existingTags = Array.isArray(existing.tags) ? existing.tags : [];
          const tags = Array.from(new Set([...existingTags, "tiktok-shop", context.shopTag, `tiktok-id:${productId}`]));
          if (!dryRun) {
            await productsService.updateProduct(existing.id, {
              name: title,
              price: priceCents,
              active,
              status,
              sku: importSku,
              tags,
            });
          }
          context.existingBySku.set(skuKey, {
            ...existing,
            name: title,
            price: priceCents,
            active,
            status,
            sku: importSku,
            tags,
          });
          pageResult.updated += 1;
          continue;
        }

        const createPayload = {
          name: title,
          price: priceCents,
          description: `Imported from TikTok Shop (${productId})`,
          sku: importSku,
          active,
          status,
          tags: ["tiktok-shop", context.shopTag, `tiktok-id:${productId}`],
        };

        if (!dryRun) {
          const created = await productsService.createProduct(createPayload);
          context.existingBySku.set(skuKey, created);
        } else {
          context.existingBySku.set(skuKey, {
            id: `dry-run:${productId}`,
            ...createPayload,
          });
        }

        pageResult.created += 1;
      } catch (error: any) {
        pageResult.skipped += 1;
        pageResult.failures.push({
          productId,
          reason: error?.message || "Failed to create/update local product",
        });
      }
    }

    return pageResult;
  }

  async buildOAuthAuthorizeUrl(params: { redirectUri: string; state?: string }): Promise<string> {
    if (this.isMockMode()) {
      const callbackUrl = new URL(params.redirectUri);
      callbackUrl.searchParams.set("code", this.MOCK_AUTH_CODE);
      if (params.state) callbackUrl.searchParams.set("state", params.state);
      return callbackUrl.toString();
    }

    const config = await this.getConfig();
    const appKey = config?.appKey;
    if (!appKey) {
      throw new Error("TikTok App Key is missing");
    }

    const query = new URLSearchParams({
      app_key: appKey,
      redirect_uri: params.redirectUri,
      response_type: "code",
      state: params.state || "",
    });

    return `${this.AUTHORIZE_BASE_URL}?${query.toString()}`;
  }

  private selectPreferredShop(shops: TikTokAuthorizedShop[], settings: Awaited<ReturnType<typeof storage.getIntegrationSettings>>): TikTokAuthorizedShop | null {
    if (shops.length === 0) return null;

    if (settings?.tiktokShopCipher) {
      const byCipher = shops.find((shop) => shop.cipher === settings.tiktokShopCipher);
      if (byCipher) return byCipher;
    }

    if (settings?.tiktokShopId) {
      const byId = shops.find((shop) => shop.id === settings.tiktokShopId || shop.code === settings.tiktokShopId);
      if (byId) return byId;
    }

    return shops[0] || null;
  }

  private buildTokenUpdatePayload(token: TikTokTokenPayload) {
    const payload: Record<string, unknown> = {
      tiktokShopConfigured: true,
      tiktokAccessTokenEncrypted: encrypt(token.access_token),
      tiktokAccessTokenExpiresAt: fromTikTokUnixTimestamp(token.access_token_expire_in),
    };

    if (token.refresh_token) {
      payload.tiktokRefreshTokenEncrypted = encrypt(token.refresh_token);
      payload.tiktokRefreshTokenExpiresAt = fromTikTokUnixTimestamp(token.refresh_token_expire_in);
    }

    if (token.open_id) payload.tiktokOpenId = token.open_id;
    if (token.seller_name) payload.tiktokSellerName = token.seller_name;
    if (token.seller_base_region) payload.tiktokSellerBaseRegion = token.seller_base_region;
    if (Array.isArray(token.granted_scopes)) payload.tiktokGrantedScopes = token.granted_scopes;

    return payload;
  }

  private async getDecryptedCredentials(): Promise<TikTokDecryptedCredentials> {
    const settings = await storage.getIntegrationSettings();
    if (!settings?.tiktokAppKey) {
      throw new Error("TikTok App Key is missing");
    }
    if (!settings?.tiktokAppSecretEncrypted) {
      throw new Error("TikTok App Secret is missing");
    }
    if (!settings?.tiktokAccessTokenEncrypted) {
      throw new Error("TikTok access token is missing");
    }

    const appSecret = decrypt(settings.tiktokAppSecretEncrypted);
    if (!appSecret) {
      throw new Error("Failed to decrypt TikTok App Secret");
    }

    const accessToken = decrypt(settings.tiktokAccessTokenEncrypted);
    if (!accessToken) {
      throw new Error("Failed to decrypt TikTok access token");
    }

    const refreshToken = settings.tiktokRefreshTokenEncrypted
      ? decrypt(settings.tiktokRefreshTokenEncrypted)
      : null;

    return {
      appKey: settings.tiktokAppKey,
      appSecret,
      accessToken,
      refreshToken: refreshToken || null,
    };
  }

  async refreshAccessToken(): Promise<TikTokTokenPayload> {
    if (this.isMockMode()) {
      const settings = await storage.getIntegrationSettings();
      const token = this.getMockTokenPayload();
      const shops = this.getMockShops();
      const selectedShop = this.selectPreferredShop(shops, settings);
      const updateData: Record<string, unknown> = {
        ...this.buildTokenUpdatePayload(token),
        tiktokShopConfigured: true,
      };

      if (selectedShop) {
        updateData.tiktokShopId = selectedShop.id || selectedShop.code || null;
        updateData.tiktokShopCipher = selectedShop.cipher || null;
        updateData.tiktokSellerName = this.getShopLabel(selectedShop);
        updateData.tiktokSellerBaseRegion = selectedShop.region || token.seller_base_region || null;
      }

      await storage.updateIntegrationSettings(updateData);
      this.clearCache();
      return token;
    }

    const settings = await storage.getIntegrationSettings();
    if (!settings?.tiktokAppKey) {
      throw new Error("TikTok App Key is missing");
    }
    if (!settings?.tiktokAppSecretEncrypted) {
      throw new Error("TikTok App Secret is missing");
    }
    if (!settings?.tiktokRefreshTokenEncrypted) {
      throw new Error("TikTok refresh token is missing");
    }

    const appSecret = decrypt(settings.tiktokAppSecretEncrypted);
    if (!appSecret) {
      throw new Error("Failed to decrypt TikTok App Secret");
    }

    const refreshToken = decrypt(settings.tiktokRefreshTokenEncrypted);
    if (!refreshToken) {
      throw new Error("Failed to decrypt TikTok refresh token");
    }

    const token = await this.apiClient.refreshToken({
      appKey: settings.tiktokAppKey,
      appSecret,
      refreshToken,
    });

    await storage.updateIntegrationSettings(this.buildTokenUpdatePayload(token));
    this.clearCache();

    return token;
  }

  async exchangeAuthCode(authCode: string): Promise<TikTokShopAuthCodeExchangeResult> {
    try {
      const trimmedCode = authCode.trim();
      if (!trimmedCode) {
        return { success: false, error: "Authorization code is required" };
      }

      if (this.isMockMode()) {
        const settings = await storage.getIntegrationSettings();
        const token = this.getMockTokenPayload();
        const shops = this.getMockShops();
        const selectedShop = this.selectPreferredShop(shops, settings);
        const updateData: Record<string, unknown> = {
          ...this.buildTokenUpdatePayload(token),
          tiktokShopConfigured: true,
        };

        if (selectedShop) {
          updateData.tiktokShopId = selectedShop.id || selectedShop.code || null;
          updateData.tiktokShopCipher = selectedShop.cipher || null;
          updateData.tiktokSellerName = this.getShopLabel(selectedShop);
          updateData.tiktokSellerBaseRegion = selectedShop.region || token.seller_base_region || null;
        }

        await storage.updateIntegrationSettings(updateData);
        this.clearCache();

        return {
          success: true,
          sellerName: token.seller_name || undefined,
          sellerBaseRegion: token.seller_base_region || undefined,
          selectedShop,
          shops,
        };
      }

      const settings = await storage.getIntegrationSettings();
      if (!settings?.tiktokAppKey) {
        return { success: false, error: "TikTok App Key is missing" };
      }
      if (!settings?.tiktokAppSecretEncrypted) {
        return { success: false, error: "TikTok App Secret is missing" };
      }

      const appSecret = decrypt(settings.tiktokAppSecretEncrypted);
      if (!appSecret) {
        return { success: false, error: "Failed to decrypt TikTok App Secret" };
      }

      const token = await this.apiClient.exchangeAuthCode({
        appKey: settings.tiktokAppKey,
        appSecret,
        authCode: trimmedCode,
      });

      await storage.updateIntegrationSettings(this.buildTokenUpdatePayload(token));

      const shops = await this.apiClient.getAuthorizedShops({
        appKey: settings.tiktokAppKey,
        appSecret,
        accessToken: token.access_token,
      });

      const selectedShop = this.selectPreferredShop(shops, settings);
      const updateShopData: Record<string, unknown> = {
        tiktokShopConfigured: true,
      };

      if (selectedShop) {
        updateShopData.tiktokShopId = selectedShop.id || selectedShop.code || null;
        updateShopData.tiktokShopCipher = selectedShop.cipher || null;
        updateShopData.tiktokSellerName = this.getShopLabel(selectedShop);
        updateShopData.tiktokSellerBaseRegion = selectedShop.region || token.seller_base_region || null;
      }

      await storage.updateIntegrationSettings(updateShopData);
      this.clearCache();

      return {
        success: true,
        sellerName: token.seller_name || undefined,
        sellerBaseRegion: token.seller_base_region || undefined,
        selectedShop,
        shops,
      };
    } catch (error: any) {
      const message = error instanceof TikTokApiError
        ? error.message
        : (error?.message || "Failed to exchange TikTok authorization code");
      return { success: false, error: message };
    }
  }

  async getAuthorizedShops(opts?: { retryWithRefresh?: boolean }): Promise<{ shops: TikTokAuthorizedShop[]; refreshedToken: boolean }> {
    if (this.isMockMode()) {
      return {
        shops: this.getMockShops(),
        refreshedToken: false,
      };
    }

    const retryWithRefresh = opts?.retryWithRefresh !== false;
    let refreshedToken = false;

    const loadShops = async () => {
      const creds = await this.getDecryptedCredentials();
      const shops = await this.apiClient.getAuthorizedShops({
        appKey: creds.appKey,
        appSecret: creds.appSecret,
        accessToken: creds.accessToken,
      });
      return { shops, creds };
    };

    try {
      const { shops } = await loadShops();
      return { shops, refreshedToken };
    } catch (error) {
      if (!retryWithRefresh) throw error;

      const settings = await storage.getIntegrationSettings();
      if (!settings?.tiktokRefreshTokenEncrypted) {
        throw error;
      }

      await this.refreshAccessToken();
      refreshedToken = true;
      const { shops } = await loadShops();
      return { shops, refreshedToken };
    }
  }

  async syncAuthorizedShops(): Promise<{ success: boolean; shops?: TikTokAuthorizedShop[]; selectedShop?: TikTokAuthorizedShop | null; refreshedToken?: boolean; error?: string }> {
    try {
      const settings = await storage.getIntegrationSettings();
      const { shops, refreshedToken } = await this.getAuthorizedShops({ retryWithRefresh: true });
      const selectedShop = this.selectPreferredShop(shops, settings);

      if (selectedShop) {
        await storage.updateIntegrationSettings({
          tiktokShopConfigured: true,
          tiktokShopId: selectedShop.id || selectedShop.code || null,
          tiktokShopCipher: selectedShop.cipher || null,
          tiktokSellerName: this.getShopLabel(selectedShop),
          tiktokSellerBaseRegion: selectedShop.region || null,
        });
      }

      this.clearCache();
      return {
        success: true,
        shops,
        selectedShop,
        refreshedToken,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || "Failed to sync authorized shops",
      };
    }
  }

  async selectShop(shopCipher: string): Promise<{ success: boolean; selectedShop?: TikTokAuthorizedShop; error?: string }> {
    try {
      const target = shopCipher.trim();
      if (!target) {
        return { success: false, error: "shopCipher is required" };
      }

      const { shops } = await this.getAuthorizedShops({ retryWithRefresh: true });
      const selected = shops.find((shop) => shop.cipher === target);
      if (!selected) {
        return { success: false, error: "Selected shop is not authorized" };
      }

      await storage.updateIntegrationSettings({
        tiktokShopConfigured: true,
        tiktokShopCipher: selected.cipher || null,
        tiktokShopId: selected.id || selected.code || null,
        tiktokSellerName: this.getShopLabel(selected),
        tiktokSellerBaseRegion: selected.region || null,
      });

      this.clearCache();
      return { success: true, selectedShop: selected };
    } catch (error: any) {
      return { success: false, error: error?.message || "Failed to select TikTok shop" };
    }
  }

  async verify(): Promise<TikTokShopVerifyResult> {
    try {
      if (this.isMockMode()) {
        const settings = await storage.getIntegrationSettings();
        const shops = this.getMockShops();
        if (shops.length === 0) {
          return { success: false, error: "No mock shops are configured" };
        }

        const selectedShop = this.selectPreferredShop(shops, settings) || shops[0];
        if (selectedShop) {
          await storage.updateIntegrationSettings({
            tiktokShopConfigured: true,
            tiktokShopId: selectedShop.id || selectedShop.code || null,
            tiktokShopCipher: selectedShop.cipher || null,
            tiktokSellerName: this.getShopLabel(selectedShop),
            tiktokSellerBaseRegion: selectedShop.region || null,
          });
        }

        this.clearCache();
        return {
          success: true,
          shopName: selectedShop ? this.getShopLabel(selectedShop) : undefined,
          shopId: selectedShop?.id,
          shopCipher: selectedShop?.cipher,
          shopCount: shops.length,
          refreshedToken: false,
        };
      }

      const settings = await storage.getIntegrationSettings();
      if (!settings?.tiktokShopConfigured) {
        return { success: false, error: "TikTok Shop is not configured. Please provide credentials first." };
      }
      if (!settings.tiktokAppKey) {
        return { success: false, error: "TikTok App Key is missing" };
      }
      if (!settings.tiktokAppSecretEncrypted) {
        return { success: false, error: "TikTok App Secret is missing" };
      }
      if (!settings.tiktokAccessTokenEncrypted) {
        return { success: false, error: "TikTok access token is missing" };
      }

      const { shops, refreshedToken } = await this.getAuthorizedShops({ retryWithRefresh: true });
      if (shops.length === 0) {
        return { success: false, error: "No authorized shops were returned by TikTok" };
      }

      const selectedShop = this.selectPreferredShop(shops, settings) || shops[0];
      if (selectedShop) {
        await storage.updateIntegrationSettings({
          tiktokShopConfigured: true,
          tiktokShopId: selectedShop.id || selectedShop.code || null,
          tiktokShopCipher: selectedShop.cipher || null,
          tiktokSellerName: this.getShopLabel(selectedShop),
          tiktokSellerBaseRegion: selectedShop.region || null,
        });
      }

      this.clearCache();
      return {
        success: true,
        shopName: selectedShop ? this.getShopLabel(selectedShop) : undefined,
        shopId: selectedShop?.id,
        shopCipher: selectedShop?.cipher,
        shopCount: shops.length,
        refreshedToken,
      };
    } catch (error: any) {
      const message = error instanceof TikTokApiError
        ? error.message
        : (error?.message || "Connection failed");
      return { success: false, error: message };
    }
  }

  async syncProductsPreview(opts?: { pageSize?: number; pageToken?: string }): Promise<TikTokProductSyncResult> {
    const pageSize = Math.min(Math.max(Number(opts?.pageSize) || 20, 1), 100);
    const pageToken = String(opts?.pageToken || "");

    if (this.isMockMode()) {
      const settings = await storage.getIntegrationSettings();
      const shops = this.getMockShops();
      const selectedShop = this.selectPreferredShop(shops, settings) || shops[0] || null;
      if (!selectedShop?.cipher) {
        return {
          success: false,
          error: "No mock shop is available for product sync",
        };
      }

      if (
        settings?.tiktokShopCipher !== selectedShop.cipher
        || settings?.tiktokShopId !== (selectedShop.id || selectedShop.code || null)
      ) {
        await storage.updateIntegrationSettings({
          tiktokShopConfigured: true,
          tiktokShopId: selectedShop.id || selectedShop.code || null,
          tiktokShopCipher: selectedShop.cipher || null,
          tiktokSellerName: this.getShopLabel(selectedShop),
          tiktokSellerBaseRegion: selectedShop.region || null,
        });
        this.clearCache();
      }

      const allProducts = this.getMockProducts();
      const start = Number.parseInt(pageToken, 10);
      const offset = Number.isFinite(start) && start >= 0 ? start : 0;
      const pageItems = allProducts.slice(offset, offset + pageSize);
      const nextOffset = offset + pageItems.length;
      const nextPageToken = nextOffset < allProducts.length ? String(nextOffset) : null;

      return {
        success: true,
        products: pageItems.map((item) => this.mapProductPreview(item)),
        count: pageItems.length,
        totalCount: allProducts.length,
        nextPageToken,
        shopCipher: selectedShop.cipher,
        refreshedToken: false,
      };
    }

    let refreshedToken = false;

    const sync = async () => {
      const settings = await storage.getIntegrationSettings();
      const shopCipher = settings?.tiktokShopCipher;
      if (!shopCipher) {
        throw new Error("TikTok shop_cipher is missing. Sync and select an authorized shop first.");
      }

      const creds = await this.getDecryptedCredentials();
      const result = await this.apiClient.searchProducts({
        appKey: creds.appKey,
        appSecret: creds.appSecret,
        accessToken: creds.accessToken,
        shopCipher,
        pageSize,
        pageToken: pageToken || undefined,
      });

      const products = result.products.map((item) => this.mapProductPreview(item));
      return {
        products,
        count: products.length,
        totalCount: result.totalCount,
        nextPageToken: result.nextPageToken,
        shopCipher,
      };
    };

    try {
      const result = await sync();
      return {
        success: true,
        ...result,
        refreshedToken,
      };
    } catch (error) {
      const settings = await storage.getIntegrationSettings();
      if (!settings?.tiktokRefreshTokenEncrypted) {
        return {
          success: false,
          error: (error as any)?.message || "Failed to sync TikTok products",
        };
      }

      try {
        await this.refreshAccessToken();
        refreshedToken = true;
        const result = await sync();
        return {
          success: true,
          ...result,
          refreshedToken,
        };
      } catch (retryError: any) {
        return {
          success: false,
          error: retryError?.message || "Failed to sync TikTok products",
        };
      }
    }
  }

  async importProductsToCatalog(
    products: TikTokProductPreview[],
    opts?: { dryRun?: boolean },
  ): Promise<TikTokProductImportResult> {
    const dryRun = opts?.dryRun === true;
    const startedAt = new Date();
    const mode: TikTokImportRunMode = dryRun ? "dry_run" : "import";
    const result: TikTokProductImportResult = {
      success: true,
      dryRun,
      created: 0,
      updated: 0,
      skipped: 0,
      failures: [],
    };
    const finalize = async (finalResult: TikTokProductImportResult): Promise<TikTokProductImportResult> => {
      await this.appendImportRunLog({
        startedAt,
        scope: "page",
        mode,
        status: finalResult.success ? "success" : "failed",
        productsRequested: Array.isArray(products) ? products.length : 0,
        result: finalResult,
      });
      return finalResult;
    };

    try {
      if (!Array.isArray(products) || products.length === 0) {
        return finalize({
          success: false,
          error: "No TikTok products were provided for import",
          dryRun,
          created: 0,
          updated: 0,
          skipped: 0,
          failures: [],
        });
      }

      const context = await this.buildProductImportContext();
      const pageResult = await this.upsertProductPageIntoCatalog(products, context, { dryRun });
      result.created = pageResult.created;
      result.updated = pageResult.updated;
      result.skipped = pageResult.skipped;
      result.failures = pageResult.failures;

      return finalize(result);
    } catch (error: any) {
      return finalize({
        ...result,
        success: false,
        error: error?.message || "Failed to import TikTok products",
      });
    }
  }

  async importAllProductsToCatalog(opts?: {
    pageSize?: number;
    maxPages?: number;
    maxProducts?: number;
    dryRun?: boolean;
  }): Promise<TikTokProductBulkImportResult> {
    const pageSize = Math.min(Math.max(Number(opts?.pageSize) || 50, 1), 100);
    const maxPages = Math.min(Math.max(Number(opts?.maxPages) || 50, 1), 200);
    const maxProducts = Math.min(Math.max(Number(opts?.maxProducts) || 2000, 1), 10000);
    const dryRun = opts?.dryRun === true;
    const startedAt = new Date();
    const mode: TikTokImportRunMode = dryRun ? "dry_run" : "import";

    const result: TikTokProductBulkImportResult = {
      success: true,
      dryRun,
      created: 0,
      updated: 0,
      skipped: 0,
      failures: [],
      pagesFetched: 0,
      productsFetched: 0,
      truncated: false,
      nextPageToken: null,
    };
    const finalize = async (finalResult: TikTokProductBulkImportResult): Promise<TikTokProductBulkImportResult> => {
      await this.appendImportRunLog({
        startedAt,
        scope: "bulk",
        mode,
        status: finalResult.success ? "success" : "failed",
        productsRequested: maxProducts,
        pageSize,
        maxPages,
        maxProducts,
        result: finalResult,
      });
      return finalResult;
    };

    try {
      const context = await this.buildProductImportContext();
      let pageToken: string | null = null;
      let previousToken: string | null = null;

      while (result.pagesFetched < maxPages && result.productsFetched < maxProducts) {
        const sync = await this.syncProductsPreview({
          pageSize,
          pageToken: pageToken || undefined,
        });

        if (!sync.success) {
          return finalize({
            ...result,
            success: false,
            error: sync.error || "Failed to sync TikTok products",
            nextPageToken: pageToken,
          });
        }

        const pageProducts = Array.isArray(sync.products) ? sync.products : [];
        const remainingBudget = maxProducts - result.productsFetched;
        const importProducts = remainingBudget < pageProducts.length
          ? pageProducts.slice(0, remainingBudget)
          : pageProducts;

        if (importProducts.length > 0) {
          const pageImport = await this.upsertProductPageIntoCatalog(importProducts, context, { dryRun });
          result.created += pageImport.created;
          result.updated += pageImport.updated;
          result.skipped += pageImport.skipped;
          result.failures.push(...pageImport.failures);
          result.productsFetched += importProducts.length;
        }

        result.pagesFetched += 1;

        const nextToken = sync.nextPageToken || null;
        result.nextPageToken = nextToken;

        if (importProducts.length < pageProducts.length) {
          result.truncated = true;
          return finalize(result);
        }

        if (!nextToken) {
          return finalize(result);
        }

        if (nextToken === pageToken || nextToken === previousToken) {
          result.truncated = true;
          return finalize(result);
        }

        previousToken = pageToken;
        pageToken = nextToken;
      }

      if (result.nextPageToken) {
        result.truncated = true;
      }

      return finalize(result);
    } catch (error: any) {
      return finalize({
        ...result,
        success: false,
        error: error?.message || "Failed to import all TikTok products",
      });
    }
  }

  clearCache(): void {
    this.configCache = null;
    this.lastConfigFetch = 0;
  }
}

export const tiktokShopService = new TikTokShopService();
