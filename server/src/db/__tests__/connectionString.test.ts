import { describe, expect, it } from "vitest";
import { normalizePostgresConnectionString } from "../connectionString";

describe("normalizePostgresConnectionString", () => {
  it.each(["prefer", "require", "verify-ca", "REQUIRE"])(
    "makes sslmode=%s explicit as verify-full",
    (sslmode) => {
      const result = normalizePostgresConnectionString(
        `postgresql://user:pass@example.test:5432/db?sslmode=${sslmode}&application_name=powerplunge`,
      );

      const url = new URL(result);
      expect(url.searchParams.get("sslmode")).toBe("verify-full");
      expect(url.searchParams.get("application_name")).toBe("powerplunge");
    },
  );

  it("preserves connection strings without sslmode aliases", () => {
    expect(
      normalizePostgresConnectionString("postgres://user:pass@localhost:5432/powerplunge"),
    ).toBe("postgres://user:pass@localhost:5432/powerplunge");
    expect(
      normalizePostgresConnectionString("postgres://user:pass@example.test/db?sslmode=disable"),
    ).toBe("postgres://user:pass@example.test/db?sslmode=disable");
    expect(
      normalizePostgresConnectionString("postgres://user:pass@example.test/db?sslmode=verify-full"),
    ).toBe("postgres://user:pass@example.test/db?sslmode=verify-full");
  });

  it("ignores non-postgres or invalid connection strings", () => {
    expect(normalizePostgresConnectionString("mysql://user:pass@example.test/db?sslmode=require")).toBe(
      "mysql://user:pass@example.test/db?sslmode=require",
    );
    expect(normalizePostgresConnectionString("not a url")).toBe("not a url");
  });
});
