import crypto from "crypto";
import { storage } from "../../../storage";
import { decrypt } from "../../utils/encryption";
import { getMetaEnvConfig } from "./meta-env";

const GRAPH_BASE_URL = "https://graph.facebook.com";
const GRAPH_VERSION = "v24.0";

export interface MetaCredentials {
  accessToken: string;
  appSecret?: string;
  pixelId?: string;
  catalogId?: string;
  productFeedId?: string;
}

export interface MetaApiErrorShape {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
}

export class MetaGraphError extends Error {
  status: number;
  fbtraceId?: string;
  details?: MetaApiErrorShape;

  constructor(message: string, status: number, details?: MetaApiErrorShape) {
    super(message);
    this.name = "MetaGraphError";
    this.status = status;
    this.fbtraceId = details?.fbtrace_id;
    this.details = details;
  }
}

class MetaGraphClient {
  private async getCredentials(): Promise<MetaCredentials> {
    const settings = await storage.getIntegrationSettings();
    const env = getMetaEnvConfig();

    const accessToken = settings?.metaAccessTokenEncrypted
      ? decrypt(settings.metaAccessTokenEncrypted)
      : env.accessToken;
    if (!accessToken) {
      throw new Error("Meta access token is not configured");
    }

    const appSecret = settings?.metaAppSecretEncrypted
      ? decrypt(settings.metaAppSecretEncrypted)
      : env.appSecret;
    return {
      accessToken,
      appSecret,
      pixelId: settings?.metaPixelId || env.pixelId,
      catalogId: settings?.metaCatalogId || env.catalogId,
      productFeedId: settings?.metaProductFeedId || env.productFeedId,
    };
  }

  private buildAppSecretProof(accessToken: string, appSecret?: string): string | undefined {
    if (!appSecret) return undefined;
    return crypto.createHmac("sha256", appSecret).update(accessToken).digest("hex");
  }

  private sanitizeBody(body: unknown): unknown {
    if (!body || typeof body !== "object") return body;
    const cloned: Record<string, unknown> = { ...(body as Record<string, unknown>) };
    if (cloned.access_token) cloned.access_token = "[REDACTED]";
    if (cloned.appsecret_proof) cloned.appsecret_proof = "[REDACTED]";
    return cloned;
  }

  async call<T = any>(
    method: "GET" | "POST",
    path: string,
    options?: {
      body?: Record<string, any>;
      query?: Record<string, string | number | boolean | null | undefined>;
      includeAccessToken?: boolean;
    },
  ): Promise<T> {
    const creds = await this.getCredentials();
    const queryParams = new URLSearchParams();
    const includeAccessToken = options?.includeAccessToken !== false;

    if (includeAccessToken) {
      queryParams.set("access_token", creds.accessToken);
      const appsecretProof = this.buildAppSecretProof(creds.accessToken, creds.appSecret);
      if (appsecretProof) queryParams.set("appsecret_proof", appsecretProof);
    }

    if (options?.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value === null || value === undefined) continue;
        queryParams.set(key, String(value));
      }
    }

    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const url = `${GRAPH_BASE_URL}/${GRAPH_VERSION}${normalizedPath}${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

    const body = options?.body || undefined;
    const response = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });

    let data: any = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok || data?.error) {
      const err = data?.error as MetaApiErrorShape | undefined;
      const message = err?.message || `Meta API request failed (${response.status})`;
      console.error("[META] API error", {
        status: response.status,
        path: normalizedPath,
        message,
        body: this.sanitizeBody(body),
        fbtraceId: err?.fbtrace_id,
      });
      throw new MetaGraphError(message, response.status, err);
    }

    return data as T;
  }

  async verifyAssets(): Promise<{ success: boolean; details: Record<string, any> }> {
    const creds = await this.getCredentials();
    const details: Record<string, any> = {};
    if (creds.pixelId) {
      details.pixel = await this.call("GET", `/${creds.pixelId}`, { query: { fields: "id,name" } });
    }
    if (creds.catalogId) {
      details.catalog = await this.call("GET", `/${creds.catalogId}`, { query: { fields: "id,name" } });
    }
    if (creds.productFeedId) {
      details.productFeed = await this.call("GET", `/${creds.productFeedId}`, { query: { fields: "id,name" } });
    }
    return { success: true, details };
  }
}

export const metaGraphClient = new MetaGraphClient();
