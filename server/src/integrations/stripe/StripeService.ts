import Stripe from "stripe";
import { storage } from "../../../storage";
import { decrypt } from "../../utils/encryption";

export interface StripeConfig {
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
  mode: "test" | "live";
  configured: boolean;
}

class StripeService {
  private stripeClient: Stripe | null = null;
  private configCache: StripeConfig | null = null;
  private lastConfigFetch: number = 0;
  private CACHE_TTL = 60000; // 1 minute cache

  async getConfig(): Promise<StripeConfig> {
    const now = Date.now();
    
    if (this.configCache && now - this.lastConfigFetch < this.CACHE_TTL) {
      return this.configCache;
    }

    const settings = await storage.getIntegrationSettings();
    
    if (settings) {
      const activeMode = (settings.stripeActiveMode as "test" | "live") || "test";

      const pkField = activeMode === "live" ? settings.stripePublishableKeyLive : settings.stripePublishableKeyTest;
      const skField = activeMode === "live" ? settings.stripeSecretKeyLiveEncrypted : settings.stripeSecretKeyTestEncrypted;
      const whField = activeMode === "live" ? settings.stripeWebhookSecretLiveEncrypted : settings.stripeWebhookSecretTestEncrypted;

      if (pkField && skField) {
        let secretKey = "";
        let webhookSecret = "";

        try {
          secretKey = decrypt(skField);
        } catch (error) {
          console.error(`[STRIPE] Failed to decrypt ${activeMode} secret key`);
        }

        if (whField) {
          try {
            webhookSecret = decrypt(whField);
          } catch (error) {
            console.error(`[STRIPE] Failed to decrypt ${activeMode} webhook secret`);
          }
        }

        if (secretKey) {
          this.configCache = {
            publishableKey: pkField,
            secretKey,
            webhookSecret,
            mode: activeMode,
            configured: true,
          };
          this.lastConfigFetch = now;
          this.stripeClient = null;
          return this.configCache;
        }
      }

      if (settings.stripeConfigured && settings.stripeSecretKeyEncrypted) {
        let secretKey = "";
        let webhookSecret = "";

        try {
          secretKey = decrypt(settings.stripeSecretKeyEncrypted);
        } catch (error) {
          console.error("[STRIPE] Failed to decrypt legacy secret key");
        }

        if (settings.stripeWebhookSecretEncrypted) {
          try {
            webhookSecret = decrypt(settings.stripeWebhookSecretEncrypted);
          } catch (error) {
            console.error("[STRIPE] Failed to decrypt legacy webhook secret");
          }
        }

        if (secretKey) {
          this.configCache = {
            publishableKey: settings.stripePublishableKey || "",
            secretKey,
            webhookSecret,
            mode: (settings.stripeMode as "test" | "live") || "test",
            configured: true,
          };
          this.lastConfigFetch = now;
          this.stripeClient = null;
          return this.configCache;
        }
      }
    }

    const configuredMode = process.env.STRIPE_MODE as "test" | "live" | undefined;
    
    let envSecretKey = "";
    let envPublishableKey = "";
    let envWebhookSecret = "";
    let resolvedMode: "test" | "live" = "test";

    if (configuredMode === "live") {
      envSecretKey = process.env.STRIPE_SECRET_KEY_LIVE || "";
      envPublishableKey = process.env.STRIPE_PUBLISHABLE_KEY_LIVE || "";
      envWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET_LIVE || "";
      resolvedMode = "live";
      if (!envSecretKey) {
        console.warn("[STRIPE] Mode set to 'live' but STRIPE_SECRET_KEY_LIVE is missing. Falling back to test keys.");
        envSecretKey = process.env.STRIPE_SECRET_KEY_TEST || "";
        envPublishableKey = process.env.STRIPE_PUBLISHABLE_KEY_TEST || "";
        envWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET_TEST || "";
        resolvedMode = "test";
      }
    } else {
      envSecretKey = process.env.STRIPE_SECRET_KEY_TEST || "";
      envPublishableKey = process.env.STRIPE_PUBLISHABLE_KEY_TEST || "";
      envWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET_TEST || "";
      resolvedMode = "test";
      if (!envSecretKey && process.env.STRIPE_SECRET_KEY_LIVE) {
        console.warn("[STRIPE] No test keys found. Falling back to live keys.");
        envSecretKey = process.env.STRIPE_SECRET_KEY_LIVE;
        envPublishableKey = process.env.STRIPE_PUBLISHABLE_KEY_LIVE || "";
        envWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET_LIVE || "";
        resolvedMode = "live";
      }
    }

    if (envSecretKey) {
      const keyMode = envSecretKey.startsWith("sk_live_") ? "live" : "test";
      if (keyMode !== resolvedMode) {
        console.warn(`[STRIPE] Key mode mismatch: resolved mode is '${resolvedMode}' but secret key is for '${keyMode}' mode.`);
        resolvedMode = keyMode;
      }
    }

    this.configCache = {
      publishableKey: envPublishableKey,
      secretKey: envSecretKey,
      webhookSecret: envWebhookSecret,
      mode: resolvedMode,
      configured: !!envSecretKey,
    };
    this.lastConfigFetch = now;
    
    return this.configCache;
  }

  async getClient(): Promise<Stripe | null> {
    const config = await this.getConfig();
    
    if (!config.configured || !config.secretKey) {
      return null;
    }

    if (!this.stripeClient) {
      this.stripeClient = new Stripe(config.secretKey, {
        apiVersion: "2025-01-27.acacia" as any,
      });
    }

    return this.stripeClient;
  }

  async isConfigured(): Promise<boolean> {
    const config = await this.getConfig();
    return config.configured && !!config.secretKey;
  }

  async getPublishableKey(): Promise<string | null> {
    const config = await this.getConfig();
    return config.publishableKey || null;
  }

  async getWebhookSecret(): Promise<string | null> {
    const config = await this.getConfig();
    return config.webhookSecret || null;
  }

  async validateKeys(publishableKey: string, secretKey: string): Promise<{ valid: boolean; error?: string; accountName?: string }> {
    // Validate key formats
    if (!publishableKey.startsWith("pk_test_") && !publishableKey.startsWith("pk_live_")) {
      return { valid: false, error: "Publishable key must start with pk_test_ or pk_live_" };
    }

    if (!secretKey.startsWith("sk_test_") && !secretKey.startsWith("sk_live_")) {
      return { valid: false, error: "Secret key must start with sk_test_ or sk_live_" };
    }

    // Check mode consistency
    const pkMode = publishableKey.startsWith("pk_live_") ? "live" : "test";
    const skMode = secretKey.startsWith("sk_live_") ? "live" : "test";
    
    if (pkMode !== skMode) {
      return { valid: false, error: "Publishable key and secret key must be from the same mode (both test or both live)" };
    }

    try {
      const testStripe = new Stripe(secretKey, {
        apiVersion: "2025-01-27.acacia" as any,
      });

      const account = await testStripe.accounts.retrieve();
      
      return { 
        valid: true, 
        accountName: account.business_profile?.name || account.email || "Account verified"
      };
    } catch (error: any) {
      if (error.type === "StripeAuthenticationError") {
        return { valid: false, error: "Invalid API key" };
      }
      return { valid: false, error: error.message || "Failed to validate keys" };
    }
  }

  clearCache(): void {
    this.configCache = null;
    this.lastConfigFetch = 0;
    this.stripeClient = null;
  }

  // Stripe Connect Express methods

  async createExpressAccount(params: {
    email: string;
    country?: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Account> {
    const client = await this.getClient();
    if (!client) {
      throw new Error("Stripe is not configured");
    }

    return client.accounts.create({
      type: "express",
      email: params.email,
      country: params.country || "US",
      capabilities: {
        transfers: { requested: true },
        card_payments: { requested: true },
      },
      metadata: params.metadata,
    });
  }

  async updateAccountCapabilities(
    accountId: string,
    capabilities: { transfers?: boolean; card_payments?: boolean }
  ): Promise<Stripe.Account> {
    const client = await this.getClient();
    if (!client) {
      throw new Error("Stripe is not configured");
    }

    const capabilitiesPayload: Stripe.AccountUpdateParams["capabilities"] = {};
    if (capabilities.transfers) {
      capabilitiesPayload.transfers = { requested: true };
    }
    if (capabilities.card_payments) {
      capabilitiesPayload.card_payments = { requested: true };
    }

    return client.accounts.update(accountId, {
      capabilities: capabilitiesPayload,
    });
  }

  async createAccountLink(params: {
    accountId: string;
    refreshUrl: string;
    returnUrl: string;
  }): Promise<Stripe.AccountLink> {
    const client = await this.getClient();
    if (!client) {
      throw new Error("Stripe is not configured");
    }

    return client.accountLinks.create({
      account: params.accountId,
      refresh_url: params.refreshUrl,
      return_url: params.returnUrl,
      type: "account_onboarding",
    });
  }

  async retrieveAccount(accountId: string): Promise<Stripe.Account> {
    const client = await this.getClient();
    if (!client) {
      throw new Error("Stripe is not configured");
    }

    return client.accounts.retrieve(accountId);
  }

  async createTransfer(params: {
    amount: number;
    currency: string;
    destination: string;
    metadata?: Record<string, string>;
    idempotencyKey?: string;
  }): Promise<Stripe.Transfer> {
    const client = await this.getClient();
    if (!client) {
      throw new Error("Stripe is not configured");
    }

    const options: Stripe.RequestOptions = {};
    if (params.idempotencyKey) {
      options.idempotencyKey = params.idempotencyKey;
    }

    return client.transfers.create(
      {
        amount: params.amount,
        currency: params.currency,
        destination: params.destination,
        metadata: params.metadata,
      },
      options
    );
  }

  async constructWebhookEvent(
    payload: string | Buffer,
    signature: string,
    secret: string
  ): Promise<Stripe.Event> {
    // Use the configured Stripe client to ensure correct test/live mode
    const client = await this.getClient();
    if (!client) {
      throw new Error("Stripe client is not configured");
    }
    return client.webhooks.constructEvent(payload, signature, secret);
  }
}

export const stripeService = new StripeService();
