import Stripe from "stripe";
import { storage } from "../../../storage";
import { decrypt } from "../../utils/encryption";

export type ConfigSource = "database" | "database_legacy" | "environment" | "none";

export interface StripeConfig {
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
  mode: "test" | "live";
  configured: boolean;
  source: ConfigSource;
  resolvedMode: "test" | "live";
}

function detectKeyMode(secretKey: string): "test" | "live" | null {
  if (secretKey.startsWith("sk_live_")) return "live";
  if (secretKey.startsWith("sk_test_")) return "test";
  return null;
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
      const activeModeHasKeys = activeMode === "live"
        ? !!(settings.stripePublishableKeyLive && settings.stripeSecretKeyLiveEncrypted)
        : !!(settings.stripePublishableKeyTest && settings.stripeSecretKeyTestEncrypted);

      const oppositeMode = activeMode === "live" ? "test" : "live";
      const oppositeModeHasKeys = oppositeMode === "live"
        ? !!(settings.stripePublishableKeyLive && settings.stripeSecretKeyLiveEncrypted)
        : !!(settings.stripePublishableKeyTest && settings.stripeSecretKeyTestEncrypted);

      if (activeModeHasKeys) {
        const pkField = activeMode === "live" ? settings.stripePublishableKeyLive : settings.stripePublishableKeyTest;
        const skField = activeMode === "live" ? settings.stripeSecretKeyLiveEncrypted : settings.stripeSecretKeyTestEncrypted;
        const whField = activeMode === "live" ? settings.stripeWebhookSecretLiveEncrypted : settings.stripeWebhookSecretTestEncrypted;

        let secretKey = "";
        let webhookSecret = "";

        try {
          secretKey = decrypt(skField!);
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
          const keyMode = detectKeyMode(secretKey);
          if (keyMode && keyMode !== activeMode) {
            console.error(`[STRIPE] CRITICAL: Mode/key mismatch! activeMode='${activeMode}' but decrypted secret key is for '${keyMode}' mode. Treating as unconfigured to prevent wrong-mode charges.`);
            this.configCache = {
              publishableKey: "",
              secretKey: "",
              webhookSecret: "",
              mode: activeMode,
              configured: false,
              source: "none",
              resolvedMode: activeMode,
            };
            this.lastConfigFetch = now;
            this.stripeClient = null;
            return this.configCache;
          }

          this.configCache = {
            publishableKey: pkField!,
            secretKey,
            webhookSecret,
            mode: activeMode,
            configured: true,
            source: "database",
            resolvedMode: activeMode,
          };
          this.lastConfigFetch = now;
          this.stripeClient = null;
          return this.configCache;
        }
      }

      if (oppositeModeHasKeys) {
        console.warn(`[STRIPE] Active mode is '${activeMode}' but only '${oppositeMode}' keys exist in DB. NOT falling back to '${oppositeMode}' keys to prevent mode mismatch. Stripe will be reported as unconfigured for '${activeMode}' mode.`);
        this.configCache = {
          publishableKey: "",
          secretKey: "",
          webhookSecret: "",
          mode: activeMode,
          configured: false,
          source: "none",
          resolvedMode: activeMode,
        };
        this.lastConfigFetch = now;
        this.stripeClient = null;
        return this.configCache;
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
          const legacyMode = (settings.stripeMode as "test" | "live") || "test";
          const keyMode = detectKeyMode(secretKey);
          if (keyMode && keyMode !== legacyMode) {
            console.warn(`[STRIPE] Legacy config: stripeMode='${legacyMode}' but key is for '${keyMode}'. Using key's actual mode.`);
          }
          const resolvedMode = keyMode || legacyMode;

          console.log(`[STRIPE] Using legacy DB config (source=database_legacy, mode=${resolvedMode})`);
          this.configCache = {
            publishableKey: settings.stripePublishableKey || "",
            secretKey,
            webhookSecret,
            mode: resolvedMode,
            configured: true,
            source: "database_legacy",
            resolvedMode,
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
    let resolvedMode: "test" | "live" = configuredMode || "test";

    if (resolvedMode === "live") {
      envSecretKey = process.env.STRIPE_SECRET_KEY_LIVE || "";
      envPublishableKey = process.env.STRIPE_PUBLISHABLE_KEY_LIVE || "";
      envWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET_LIVE || process.env.STRIPE_LIVE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET || "";
      if (!envSecretKey) {
        console.warn("[STRIPE] ENV mode set to 'live' but STRIPE_SECRET_KEY_LIVE is missing. NOT falling back to test keys to prevent mode mismatch.");
        this.configCache = {
          publishableKey: "",
          secretKey: "",
          webhookSecret: "",
          mode: "live",
          configured: false,
          source: "none",
          resolvedMode: "live",
        };
        this.lastConfigFetch = now;
        return this.configCache;
      }
    } else {
      envSecretKey = process.env.STRIPE_SECRET_KEY_TEST || "";
      envPublishableKey = process.env.STRIPE_PUBLISHABLE_KEY_TEST || "";
      envWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET_TEST || process.env.STRIPE_DEV_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET || "";
      if (!envSecretKey) {
        console.warn("[STRIPE] ENV mode is 'test' but no test keys found. NOT falling back to live keys to prevent mode mismatch.");
        this.configCache = {
          publishableKey: "",
          secretKey: "",
          webhookSecret: "",
          mode: "test",
          configured: false,
          source: "none",
          resolvedMode: "test",
        };
        this.lastConfigFetch = now;
        return this.configCache;
      }
    }

    if (envSecretKey) {
      const keyMode = detectKeyMode(envSecretKey);
      if (keyMode && keyMode !== resolvedMode) {
        console.error(`[STRIPE] ENV key mode mismatch: STRIPE_MODE='${resolvedMode}' but secret key is for '${keyMode}'. Treating as unconfigured.`);
        this.configCache = {
          publishableKey: "",
          secretKey: "",
          webhookSecret: "",
          mode: resolvedMode,
          configured: false,
          source: "none",
          resolvedMode,
        };
        this.lastConfigFetch = now;
        return this.configCache;
      }
    }

    console.log(`[STRIPE] Using environment config (source=environment, mode=${resolvedMode})`);
    this.configCache = {
      publishableKey: envPublishableKey,
      secretKey: envSecretKey,
      webhookSecret: envWebhookSecret,
      mode: resolvedMode,
      configured: !!envSecretKey,
      source: envSecretKey ? "environment" : "none",
      resolvedMode,
    };
    this.lastConfigFetch = now;
    
    return this.configCache;
  }

  async getDbOnlyWebhookSecret(): Promise<{ secret: string; source: string; mode: string; reason?: string }> {
    const settings = await storage.getIntegrationSettings();

    if (!settings) {
      return {
        secret: "",
        source: "none",
        mode: "unknown",
        reason: "No integration settings found in database. Configure Stripe at Admin → Integrations → Stripe.",
      };
    }

    const activeMode = (settings.stripeActiveMode as "test" | "live") || "test";

    const whField = activeMode === "live"
      ? settings.stripeWebhookSecretLiveEncrypted
      : settings.stripeWebhookSecretTestEncrypted;

    if (whField) {
      try {
        const webhookSecret = decrypt(whField);
        if (webhookSecret) {
          return { secret: webhookSecret, source: "database", mode: activeMode };
        }
      } catch (error) {
        return {
          secret: "",
          source: "database",
          mode: activeMode,
          reason: `Failed to decrypt ${activeMode}-mode webhook secret from database. The encryption key may have changed. Re-save the webhook secret at Admin → Integrations → Stripe.`,
        };
      }
    }

    if (settings.stripeWebhookSecretEncrypted) {
      try {
        const webhookSecret = decrypt(settings.stripeWebhookSecretEncrypted);
        if (webhookSecret) {
          const legacyMode = (settings.stripeMode as "test" | "live") || "test";
          return { secret: webhookSecret, source: "database_legacy", mode: legacyMode };
        }
      } catch (error) {
        return {
          secret: "",
          source: "database_legacy",
          mode: activeMode,
          reason: `Failed to decrypt legacy webhook secret from database. Re-save the webhook secret at Admin → Integrations → Stripe.`,
        };
      }
    }

    return {
      secret: "",
      source: "none",
      mode: activeMode,
      reason: `Stripe ${activeMode}-mode webhook signing secret (whsec_...) not found in database. Add it at Admin → Integrations → Stripe → Webhook Secret field.`,
    };
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
    if (!publishableKey.startsWith("pk_test_") && !publishableKey.startsWith("pk_live_")) {
      return { valid: false, error: "Publishable key must start with pk_test_ or pk_live_" };
    }

    if (!secretKey.startsWith("sk_test_") && !secretKey.startsWith("sk_live_")) {
      return { valid: false, error: "Secret key must start with sk_test_ or sk_live_" };
    }

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
    console.log("[STRIPE] Cache cleared - next getConfig() will re-resolve from DB/env");
  }

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
    const client = await this.getClient();
    if (!client) {
      throw new Error("Stripe client is not configured");
    }
    return client.webhooks.constructEvent(payload, signature, secret);
  }
}

export const stripeService = new StripeService();
