const LOCAL_DEV_AUTH_PORT = "5001";

function firstConfiguredValue(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => value && value.trim().length > 0)?.trim();
}

function normalizeBaseURL(value: string): string {
  const url = new URL(value);
  return url.toString().replace(/\/+$/, "");
}

function addOrigin(origins: Set<string>, value: string | undefined): void {
  if (!value) return;
  try {
    origins.add(new URL(value).origin);
  } catch {}
}

function addCommaSeparatedOrigins(origins: Set<string>, value: string | undefined): void {
  if (!value) return;
  for (const origin of value.split(",")) {
    addOrigin(origins, origin.trim());
  }
}

export function isBetterAuthEnabled(): boolean {
  return process.env.USE_BETTER_AUTH === "true";
}

export function getBetterAuthBaseURL(): string {
  const configured = firstConfiguredValue(
    process.env.BETTER_AUTH_BASE_URL,
    process.env.PUBLIC_SITE_URL,
    process.env.BASE_URL,
    process.env.APP_URL,
    process.env.E2E_BASE_URL,
  );

  if (configured) return normalizeBaseURL(configured);

  if (process.env.REPLIT_DOMAINS) {
    const [domain] = process.env.REPLIT_DOMAINS.split(",").map((entry) => entry.trim()).filter(Boolean);
    if (domain) return `https://${domain}`;
  }

  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN.trim()}`;
  }

  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    return `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
  }

  if (process.env.NODE_ENV === "production") {
    return "https://powerplunge.com";
  }

  return `http://localhost:${process.env.PORT || LOCAL_DEV_AUTH_PORT}`;
}

export function getBetterAuthTrustedOrigins(): string[] {
  const origins = new Set<string>();

  addOrigin(origins, getBetterAuthBaseURL());
  addOrigin(origins, process.env.PUBLIC_SITE_URL);
  addOrigin(origins, process.env.BASE_URL);
  addOrigin(origins, process.env.APP_URL);
  addOrigin(origins, process.env.E2E_BASE_URL);
  addCommaSeparatedOrigins(origins, process.env.CORS_ALLOWED_ORIGINS);

  if (process.env.REPLIT_DOMAINS) {
    for (const domain of process.env.REPLIT_DOMAINS.split(",")) {
      const trimmed = domain.trim();
      if (trimmed) origins.add(`https://${trimmed}`);
    }
  }

  if (process.env.REPLIT_DEV_DOMAIN) {
    origins.add(`https://${process.env.REPLIT_DEV_DOMAIN.trim()}`);
  }

  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:5000");
    origins.add("http://localhost:5001");
    origins.add("http://localhost:5002");
  }

  return [...origins];
}

export function assertBetterAuthReady(): void {
  if (!isBetterAuthEnabled()) return;

  if (!process.env.BETTER_AUTH_SECRET) {
    throw new Error("USE_BETTER_AUTH=true requires BETTER_AUTH_SECRET");
  }

  getBetterAuthBaseURL();
}
