import { Request } from "express";

function getAllowedHosts(): Set<string> {
  const hosts = new Set<string>();

  if (process.env.REPLIT_DOMAINS) {
    for (const domain of process.env.REPLIT_DOMAINS.split(",")) {
      const trimmed = domain.trim();
      if (trimmed) hosts.add(trimmed);
    }
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    hosts.add(process.env.REPLIT_DEV_DOMAIN.trim());
  }
  const configuredBaseUrl = process.env.PUBLIC_SITE_URL || process.env.BASE_URL;
  if (configuredBaseUrl) {
    try {
      const parsed = new URL(configuredBaseUrl);
      hosts.add(parsed.host);
    } catch {}
  }

  hosts.add("localhost:5000");
  hosts.add("localhost");
  hosts.add("0.0.0.0:5000");
  hosts.add("powerplunge.com");
  hosts.add("www.powerplunge.com");

  return hosts;
}

function configuredBaseUrl(): string | undefined {
  const value = process.env.PUBLIC_SITE_URL || process.env.BASE_URL;
  return value ? value.replace(/\/+$/, "") : undefined;
}

function isPowerPlungeHost(host: string): boolean {
  const normalized = host.toLowerCase().split(":")[0];
  return normalized === "powerplunge.com" || normalized === "www.powerplunge.com";
}

export function getBaseUrl(req: Request): string {
  const allowedHosts = getAllowedHosts();
  const requestHost = (req.headers["x-forwarded-host"] as string) || req.headers.host;
  const configured = configuredBaseUrl();

  if (requestHost && isPowerPlungeHost(requestHost)) {
    return configured || "https://powerplunge.com";
  }

  if (configured && process.env.NODE_ENV === "production") {
    return configured;
  }

  if (requestHost && allowedHosts.has(requestHost)) {
    const protocol = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
    return `${protocol}://${requestHost}`;
  }

  if (configured) return configured;
  if (process.env.REPLIT_DOMAINS) {
    return `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`;
  }
  return process.env.NODE_ENV === "production" ? "https://powerplunge.com" : "https://localhost:5000";
}

export function getStaticBaseUrl(): string {
  const configured = configuredBaseUrl();
  if (configured) return configured;
  if (process.env.REPLIT_DOMAINS) {
    return `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`;
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    return `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
  }
  return process.env.NODE_ENV === "production" ? "https://powerplunge.com" : "https://localhost:5000";
}
