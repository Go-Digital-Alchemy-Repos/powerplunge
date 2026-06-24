import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  storage: {
    getCustomer: vi.fn(),
  },
  getCustomerAuthContext: vi.fn(),
}));

vi.mock("../../../storage", () => ({ storage: mocks.storage }));
vi.mock("../../auth/customerBetterAuth", () => ({
  getCustomerAuthContext: mocks.getCustomerAuthContext,
}));

const { customerIdentityService } = await import("../customer-identity.service");

describe("customerIdentityService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when there is no Better Auth session", async () => {
    mocks.getCustomerAuthContext.mockResolvedValue(null);

    const result = await customerIdentityService.resolve({});

    expect(result).toEqual({
      ok: false,
      error: {
        code: "NO_IDENTITY",
        message: "No authentication credentials provided",
        httpStatus: 401,
      },
    });
  });

  it("returns 503 when Better Auth is not configured", async () => {
    mocks.getCustomerAuthContext.mockRejectedValue(new Error("Better Auth is not configured for customer authentication"));

    const result = await customerIdentityService.resolve({});

    expect(result).toEqual({
      ok: false,
      error: {
        code: "NO_IDENTITY",
        message: "Better Auth is not configured for customer authentication",
        httpStatus: 503,
      },
    });
  });

  it("returns 403 for disabled Better Auth customers", async () => {
    mocks.getCustomerAuthContext.mockRejectedValue(
      Object.assign(new Error("This account has been disabled"), { statusCode: 403 }),
    );

    const result = await customerIdentityService.resolve({});

    expect(result).toEqual({
      ok: false,
      error: {
        code: "DISABLED_ACCOUNT",
        message: "This account has been disabled",
        httpStatus: 403,
      },
    });
  });

  it("returns 409 for merged Better Auth customers", async () => {
    mocks.getCustomerAuthContext.mockRejectedValue(
      Object.assign(new Error("This account has been merged. Please use your primary account."), { statusCode: 409 }),
    );

    const result = await customerIdentityService.resolve({});

    expect(result).toEqual({
      ok: false,
      error: {
        code: "MERGED_ACCOUNT",
        message: "This account has been merged. Please use your primary account.",
        httpStatus: 409,
      },
    });
  });

  it("resolves a valid Better Auth customer session", async () => {
    const customer = { id: "cust-1", email: "customer@example.com", name: "Customer" };
    mocks.getCustomerAuthContext.mockResolvedValue({
      customer,
      betterAuthSession: { id: "session-1" },
    });
    mocks.storage.getCustomer.mockResolvedValue(customer);

    const result = await customerIdentityService.resolve({});

    expect(result).toEqual({
      ok: true,
      identity: {
        customerId: "cust-1",
        customer,
        source: "better_auth",
      },
    });
  });
});
