type EnvVarLevel = "required" | "optional";

interface EnvVarSpec {
  level: EnvVarLevel;
  feature: string;
  description: string;
}

const ENV_VARS: Record<string, EnvVarSpec> = {
  DATABASE_URL: {
    level: "required",
    feature: "Database",
    description: "PostgreSQL connection string",
  },
  SESSION_SECRET: {
    level: "required",
    feature: "Auth",
    description: "Secret used to sign session cookies",
  },
  STRIPE_SECRET_KEY: {
    level: "required",
    feature: "Payments",
    description: "Stripe API secret key",
  },
  STRIPE_PUBLISHABLE_KEY: {
    level: "required",
    feature: "Payments",
    description: "Stripe publishable key (exposed to client)",
  },
  STRIPE_WEBHOOK_SECRET: {
    level: "required",
    feature: "Payments",
    description: "Stripe webhook signing secret",
  },

  APP_SECRETS_ENCRYPTION_KEY: {
    level: "optional",
    feature: "Admin Settings",
    description: "AES-256 key for encrypting stored secrets (e.g. Twilio auth token)",
  },
  MAILGUN_API_KEY: {
    level: "optional",
    feature: "Email",
    description: "Mailgun API key for transactional emails",
  },
  MAILGUN_DOMAIN: {
    level: "optional",
    feature: "Email",
    description: "Mailgun sending domain",
  },
  CLOUDFLARE_R2_ACCESS_KEY_ID: {
    level: "optional",
    feature: "Media Storage (R2)",
    description: "Cloudflare R2 access key ID",
  },
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: {
    level: "optional",
    feature: "Media Storage (R2)",
    description: "Cloudflare R2 secret access key",
  },
  CLOUDFLARE_R2_BUCKET_NAME: {
    level: "optional",
    feature: "Media Storage (R2)",
    description: "Cloudflare R2 bucket name",
  },
  CLOUDFLARE_ACCOUNT_ID: {
    level: "optional",
    feature: "Media Storage (R2)",
    description: "Cloudflare account ID for R2 endpoint",
  },
  STRIPE_CONNECT_WEBHOOK_SECRET: {
    level: "optional",
    feature: "Affiliate Payouts",
    description: "Stripe Connect webhook signing secret",
  },
  TWILIO_ACCOUNT_SID: {
    level: "optional",
    feature: "SMS",
    description: "Twilio account SID for SMS verification",
  },
  TWILIO_AUTH_TOKEN: {
    level: "optional",
    feature: "SMS",
    description: "Twilio auth token",
  },
  TWILIO_PHONE_NUMBER: {
    level: "optional",
    feature: "SMS",
    description: "Twilio sender phone number",
  },
  PUBLIC_SITE_URL: {
    level: "optional",
    feature: "SEO / Meta Tags",
    description: "Canonical public URL used for OpenGraph meta image URLs during build",
  },
  BETTER_AUTH_SECRET: {
    level: "optional",
    feature: "Better Auth",
    description: "Secret for Better Auth sessions (only if USE_BETTER_AUTH=true)",
  },
  IP_HASH_SALT: {
    level: "optional",
    feature: "Security",
    description: "Salt for hashing IP addresses in analytics and fraud detection",
  },
};

export interface ValidationResult {
  ok: boolean;
  missing: { name: string; spec: EnvVarSpec }[];
  warnings: { name: string; spec: EnvVarSpec }[];
  disabledFeatures: string[];
}

export function validateEnv(): ValidationResult {
  const missing: ValidationResult["missing"] = [];
  const warnings: ValidationResult["warnings"] = [];
  const disabledFeaturesSet = new Set<string>();

  for (const [name, spec] of Object.entries(ENV_VARS)) {
    if (!process.env[name]) {
      if (spec.level === "required") {
        missing.push({ name, spec });
      } else {
        warnings.push({ name, spec });
        disabledFeaturesSet.add(spec.feature);
      }
    }
  }

  return {
    ok: missing.length === 0,
    missing,
    warnings,
    disabledFeatures: [...disabledFeaturesSet],
  };
}

export function enforceEnv(): void {
  const isProduction = process.env.NODE_ENV === "production";
  const result = validateEnv();

  if (result.warnings.length > 0) {
    console.warn("\n⚠  Optional env vars not set (features will be disabled):");
    for (const { name, spec } of result.warnings) {
      console.warn(`   ${name} — ${spec.description} [${spec.feature}]`);
    }
    if (result.disabledFeatures.length > 0) {
      console.warn(`   Disabled features: ${result.disabledFeatures.join(", ")}`);
    }
    console.warn("");
  }

  if (result.missing.length > 0) {
    const lines = result.missing.map(
      ({ name, spec }) => `   ${name} — ${spec.description} [${spec.feature}]`
    );
    const message = `\n✖  Missing required env vars:\n${lines.join("\n")}\n`;

    if (isProduction) {
      console.error(message);
      throw new Error(
        `Server cannot start: ${result.missing.length} required env var(s) missing — ${result.missing.map((m) => m.name).join(", ")}`
      );
    } else {
      console.warn(message + "   (dev mode — continuing with degraded functionality)\n");
    }
  }

  if (result.ok) {
    console.log("✓  All required env vars present\n");
  }
}

export { ENV_VARS };
