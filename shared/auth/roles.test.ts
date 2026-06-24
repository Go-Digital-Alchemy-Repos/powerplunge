import { describe, expect, it } from "vitest";
import {
  isBetterAuthAdminRole,
  isBetterAuthFullAccessRole,
  normalizeBetterAuthRole,
} from "./roles";

describe("Better Auth roles", () => {
  it("preserves app role spelling and normalizes legacy Better Auth spelling", () => {
    expect(normalizeBetterAuthRole("super_admin")).toBe("super_admin");
    expect(normalizeBetterAuthRole("superadmin")).toBe("super_admin");
    expect(normalizeBetterAuthRole("admin")).toBe("admin");
  });

  it("falls back unknown or missing roles to customer", () => {
    expect(normalizeBetterAuthRole(undefined)).toBe("customer");
    expect(normalizeBetterAuthRole(null)).toBe("customer");
    expect(normalizeBetterAuthRole("owner")).toBe("customer");
  });

  it("classifies admin and full-access roles", () => {
    expect(isBetterAuthAdminRole("fulfillment")).toBe(true);
    expect(isBetterAuthFullAccessRole("fulfillment")).toBe(false);
    expect(isBetterAuthFullAccessRole("superadmin")).toBe(true);
  });
});
