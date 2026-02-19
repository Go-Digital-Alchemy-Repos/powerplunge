import { describe, expect, it } from "vitest";
import {
  getFailureStatus,
  getRetryDelaySeconds,
  normalizeCity,
  normalizeEmail,
  normalizePhone,
  normalizeState,
  normalizeZip,
  resolveMetaProductId,
  sha256,
} from "../meta-utils";

describe("meta-utils normalization and hashing", () => {
  it("normalizes and hashes canonical PII values", () => {
    expect(normalizeEmail("  Test@Example.COM ")).toBe("test@example.com");
    expect(normalizePhone("+1 (919) 555-1212")).toBe("19195551212");
    expect(normalizeCity(" Raleigh ")).toBe("raleigh");
    expect(normalizeState(" N.C. ")).toBe("nc");
    expect(normalizeZip("27513-1234")).toBe("27513");

    expect(sha256("test@example.com")).toBe(
      "973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b",
    );
  });

  it("returns null for empty values", () => {
    expect(normalizeEmail(" ")).toBeNull();
    expect(normalizePhone("---")).toBeNull();
    expect(normalizeCity("")).toBeNull();
    expect(normalizeState(null)).toBeNull();
    expect(normalizeZip(undefined)).toBeNull();
  });
});

describe("meta-utils product identity", () => {
  it("uses SKU first and falls back to product ID", () => {
    expect(resolveMetaProductId("SKU-123", "prod_1")).toBe("SKU-123");
    expect(resolveMetaProductId("  ", "prod_1")).toBe("prod_1");
    expect(resolveMetaProductId(null, "prod_1")).toBe("prod_1");
  });
});

describe("meta-utils retry behavior", () => {
  it("returns retry status while retryable attempts remain", () => {
    expect(getFailureStatus(1, true, 8)).toBe("retry");
    expect(getFailureStatus(7, true, 8)).toBe("retry");
  });

  it("returns failed on exhausted attempts or non-retryable errors", () => {
    expect(getFailureStatus(8, true, 8)).toBe("failed");
    expect(getFailureStatus(1, false, 8)).toBe("failed");
  });

  it("computes exponential delay with jitter", () => {
    expect(getRetryDelaySeconds(1, 0)).toBe(30);
    expect(getRetryDelaySeconds(2, 3)).toBe(63);
    expect(getRetryDelaySeconds(6, 0)).toBe(960);
    expect(getRetryDelaySeconds(10, 0)).toBe(3600);
  });
});
