import { describe, expect, it } from "vitest";
import { getMailgunDomainVerificationError } from "../mailgun-domain-verification";

describe("getMailgunDomainVerificationError", () => {
  it("accepts top-level active domain state", () => {
    expect(
      getMailgunDomainVerificationError(
        { name: "mg.powerplunge.com", state: "active" },
        "mg.powerplunge.com",
      ),
    ).toBeNull();
  });

  it("accepts nested active domain state", () => {
    expect(
      getMailgunDomainVerificationError(
        { domain: { name: "mg.powerplunge.com", state: "active" } },
        "mg.powerplunge.com",
      ),
    ).toBeNull();
  });

  it("rejects non-active domain state with returned domain name", () => {
    expect(
      getMailgunDomainVerificationError(
        { domain: { name: "mg.powerplunge.com", state: "unverified" } },
        "mg.powerplunge.com",
      ),
    ).toBe("Mailgun domain mg.powerplunge.com is unverified");
  });

  it("rejects missing state as unknown", () => {
    expect(
      getMailgunDomainVerificationError({}, "mg.powerplunge.com"),
    ).toBe("Mailgun domain mg.powerplunge.com is unknown");
  });

  it("rejects active but disabled domains", () => {
    expect(
      getMailgunDomainVerificationError(
        { domain: { name: "mg.powerplunge.com", state: "active", is_disabled: true } },
        "mg.powerplunge.com",
      ),
    ).toBe("Mailgun domain mg.powerplunge.com is disabled");
  });
});
