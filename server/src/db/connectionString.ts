const POSTGRES_PROTOCOLS = new Set(["postgres:", "postgresql:"]);
const VERIFY_FULL_ALIASES = new Set(["prefer", "require", "verify-ca"]);

export function normalizePostgresConnectionString(connectionString: string): string {
  let url: URL;

  try {
    url = new URL(connectionString);
  } catch {
    return connectionString;
  }

  if (!POSTGRES_PROTOCOLS.has(url.protocol)) {
    return connectionString;
  }

  const sslmode = url.searchParams.get("sslmode");
  if (!sslmode || !VERIFY_FULL_ALIASES.has(sslmode.toLowerCase())) {
    return connectionString;
  }

  url.searchParams.set("sslmode", "verify-full");
  return url.toString();
}
