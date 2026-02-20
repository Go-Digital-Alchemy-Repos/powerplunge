import crypto from "crypto";

const DEFAULT_OPEN_API_BASE_URL = "https://open-api.tiktokglobalshop.com";
const DEFAULT_AUTH_BASE_URL = "https://auth.tiktok-shops.com";

export interface TikTokApiClientOptions {
  openApiBaseUrl?: string;
  authBaseUrl?: string;
}

export interface TikTokApiErrorDetails {
  status?: number;
  code?: number;
  requestId?: string;
  responseBody?: unknown;
}

export class TikTokApiError extends Error {
  readonly status?: number;
  readonly code?: number;
  readonly requestId?: string;
  readonly responseBody?: unknown;

  constructor(message: string, details?: TikTokApiErrorDetails) {
    super(message);
    this.name = "TikTokApiError";
    this.status = details?.status;
    this.code = details?.code;
    this.requestId = details?.requestId;
    this.responseBody = details?.responseBody;
  }
}

export interface TikTokApiEnvelope<T> {
  code: number;
  message: string;
  request_id?: string;
  data: T;
}

export interface TikTokTokenPayload {
  access_token: string;
  access_token_expire_in: number;
  refresh_token: string;
  refresh_token_expire_in: number;
  open_id?: string;
  seller_name?: string;
  seller_base_region?: string;
  user_type?: number;
  granted_scopes?: string[];
}

export interface TikTokAuthorizedShop {
  id: string;
  name?: string;
  shop_name?: string;
  region?: string;
  seller_type?: string;
  cipher?: string;
  code?: string;
}

export interface TikTokProduct {
  id?: string;
  product_id?: string;
  title?: string;
  name?: string;
  status?: string;
  sales_regions?: string[];
  update_time?: number;
  create_time?: number;
  skus?: Array<{
    id?: string;
    sku_id?: string;
    seller_sku?: string;
    price?: {
      amount?: string;
      currency?: string;
    };
  }>;
}

export interface TikTokProductSearchResult {
  products: TikTokProduct[];
  totalCount: number | null;
  nextPageToken: string | null;
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function toUnixSeconds(nowMs: number = Date.now()): number {
  return Math.floor(nowMs / 1000);
}

function stableJsonStringify(value: unknown): string {
  if (value === undefined || value === null) return "";
  return JSON.stringify(value);
}

function safeParseJson(raw: string): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export class TikTokApiClient {
  private readonly openApiBaseUrl: string;
  private readonly authBaseUrl: string;

  constructor(options?: TikTokApiClientOptions) {
    this.openApiBaseUrl = normalizeBaseUrl(options?.openApiBaseUrl || process.env.TIKTOK_SHOP_OPEN_API_BASE_URL || DEFAULT_OPEN_API_BASE_URL);
    this.authBaseUrl = normalizeBaseUrl(options?.authBaseUrl || process.env.TIKTOK_SHOP_AUTH_BASE_URL || DEFAULT_AUTH_BASE_URL);
  }

  private buildSignature(path: string, query: Record<string, string>, body: string, appSecret: string): string {
    const keys = Object.keys(query)
      .filter((key) => key !== "sign" && key !== "access_token")
      .sort();

    let input = path;
    for (const key of keys) {
      input += `${key}${query[key]}`;
    }

    if (body) {
      input += body;
    }

    const wrapped = `${appSecret}${input}${appSecret}`;
    return crypto.createHmac("sha256", appSecret).update(wrapped).digest("hex");
  }

  private async requestOpenApi<T>(params: {
    method: "GET" | "POST" | "PUT" | "DELETE";
    path: string;
    query?: Record<string, string | number | boolean | null | undefined>;
    body?: unknown;
    appKey: string;
    appSecret: string;
    accessToken: string;
  }): Promise<TikTokApiEnvelope<T>> {
    const normalizedPath = params.path.startsWith("/") ? params.path : `/${params.path}`;
    const bodyString = params.method === "GET" ? "" : stableJsonStringify(params.body);

    const query: Record<string, string> = {
      app_key: params.appKey,
      timestamp: String(toUnixSeconds()),
    };

    if (params.query) {
      for (const [key, value] of Object.entries(params.query)) {
        if (value === null || value === undefined) continue;
        query[key] = String(value);
      }
    }

    query.sign = this.buildSignature(normalizedPath, query, bodyString, params.appSecret);

    const url = `${this.openApiBaseUrl}${normalizedPath}?${new URLSearchParams(query).toString()}`;

    const response = await fetch(url, {
      method: params.method,
      headers: {
        "Content-Type": "application/json",
        "x-tts-access-token": params.accessToken,
      },
      body: bodyString || undefined,
    });

    const raw = await response.text();
    const parsed = safeParseJson(raw) as Partial<TikTokApiEnvelope<T>> | string | null;

    if (!response.ok) {
      throw new TikTokApiError(`TikTok Open API request failed with status ${response.status}`, {
        status: response.status,
        responseBody: parsed,
      });
    }

    if (!parsed || typeof parsed !== "object") {
      throw new TikTokApiError("TikTok Open API returned an invalid response", {
        status: response.status,
        responseBody: parsed,
      });
    }

    const code = Number((parsed as any).code);
    const message = String((parsed as any).message || "Unknown error");
    const requestId = typeof (parsed as any).request_id === "string" ? (parsed as any).request_id : undefined;

    if (code !== 0) {
      throw new TikTokApiError(`TikTok Open API error: ${message}`, {
        status: response.status,
        code,
        requestId,
        responseBody: parsed,
      });
    }

    return parsed as TikTokApiEnvelope<T>;
  }

  private async requestAuthApi(path: string, query: Record<string, string>): Promise<TikTokTokenPayload> {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const url = `${this.authBaseUrl}${normalizedPath}?${new URLSearchParams(query).toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const raw = await response.text();
    const parsed = safeParseJson(raw) as Partial<TikTokApiEnvelope<TikTokTokenPayload>> | string | null;

    if (!response.ok) {
      throw new TikTokApiError(`TikTok Auth API request failed with status ${response.status}`, {
        status: response.status,
        responseBody: parsed,
      });
    }

    if (!parsed || typeof parsed !== "object") {
      throw new TikTokApiError("TikTok Auth API returned an invalid response", {
        status: response.status,
        responseBody: parsed,
      });
    }

    const code = Number((parsed as any).code);
    const message = String((parsed as any).message || "Unknown error");
    const requestId = typeof (parsed as any).request_id === "string" ? (parsed as any).request_id : undefined;

    if (code !== 0 || !(parsed as any).data) {
      throw new TikTokApiError(`TikTok Auth API error: ${message}`, {
        status: response.status,
        code,
        requestId,
        responseBody: parsed,
      });
    }

    return (parsed as any).data as TikTokTokenPayload;
  }

  async exchangeAuthCode(params: {
    appKey: string;
    appSecret: string;
    authCode: string;
  }): Promise<TikTokTokenPayload> {
    return this.requestAuthApi("/api/v2/token/get", {
      app_key: params.appKey,
      app_secret: params.appSecret,
      auth_code: params.authCode,
      grant_type: "authorized_code",
    });
  }

  async refreshToken(params: {
    appKey: string;
    appSecret: string;
    refreshToken: string;
  }): Promise<TikTokTokenPayload> {
    return this.requestAuthApi("/api/v2/token/refresh", {
      app_key: params.appKey,
      app_secret: params.appSecret,
      refresh_token: params.refreshToken,
      grant_type: "refresh_token",
    });
  }

  async getAuthorizedShops(params: {
    appKey: string;
    appSecret: string;
    accessToken: string;
  }): Promise<TikTokAuthorizedShop[]> {
    const response = await this.requestOpenApi<{ shops?: TikTokAuthorizedShop[] }>({
      method: "GET",
      path: "/authorization/202309/shops",
      appKey: params.appKey,
      appSecret: params.appSecret,
      accessToken: params.accessToken,
    });

    return response.data?.shops || [];
  }

  async searchProducts(params: {
    appKey: string;
    appSecret: string;
    accessToken: string;
    shopCipher: string;
    pageSize?: number;
    pageToken?: string;
  }): Promise<TikTokProductSearchResult> {
    const response = await this.requestOpenApi<{
      products?: TikTokProduct[];
      product_list?: TikTokProduct[];
      total_count?: number;
      next_page_token?: string;
    }>({
      method: "POST",
      path: "/product/202309/products/search",
      query: {
        shop_cipher: params.shopCipher,
      },
      body: {
        page_size: params.pageSize || 20,
        page_token: params.pageToken || "",
      },
      appKey: params.appKey,
      appSecret: params.appSecret,
      accessToken: params.accessToken,
    });

    const products = response.data?.products || response.data?.product_list || [];
    const totalCount = typeof response.data?.total_count === "number" ? response.data.total_count : null;
    const nextPageToken = response.data?.next_page_token || null;

    return { products, totalCount, nextPageToken };
  }
}

export function fromTikTokUnixTimestamp(value: number | null | undefined): Date | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return new Date(value * 1000);
}
