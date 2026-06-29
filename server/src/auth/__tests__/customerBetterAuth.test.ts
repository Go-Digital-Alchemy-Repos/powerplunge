import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request } from "express";

const mocks = vi.hoisted(() => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
  db: {
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    insert: vi.fn(),
  },
  storage: {
    getCustomer: vi.fn(),
    getCustomerByEmail: vi.fn(),
    createCustomer: vi.fn(),
  },
}));

vi.mock("../betterAuth", () => ({ auth: mocks.auth }));
vi.mock("../../../db", () => ({ db: mocks.db }));
vi.mock("../../../storage", () => ({ storage: mocks.storage }));

const {
  attachCustomerAuthContext,
  attachCustomerRequestAuth,
  getCustomerAuthContext,
  serializeCustomer,
} = await import("../customerBetterAuth");

describe("customer Better Auth request seam", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BETTER_AUTH_SECRET = "test-secret";
  });

  it("attaches canonical customer auth fields", () => {
    const customer = serializeCustomer({
      id: "cust-1",
      email: "customer@example.com",
      name: "Customer User",
      phone: "555-0100",
      address: "123 Main St",
      city: "Denver",
      state: "CO",
      zipCode: "80202",
      country: "US",
      avatarUrl: "",
    } as any);
    const req = {} as Request;
    const betterAuthSession = {
      session: { id: "session-1", userId: "ba-1", token: "token", expiresAt: new Date() },
      user: { id: "ba-1", email: "customer@example.com", name: "Customer", customerId: "cust-1" },
    } as any;

    attachCustomerRequestAuth(req, customer, { betterAuthSession });

    expect(req.customerAuth).toMatchObject({
      customerId: "cust-1",
      email: "customer@example.com",
      customer,
      betterAuthSession,
    });
    expect(req.betterAuthSession).toBe(betterAuthSession);
  });

  it("attaches an authenticated context through the same request seam", () => {
    const req = {} as Request;
    const betterAuthSession = {
      session: { id: "session-1", userId: "ba-1", token: "token", expiresAt: new Date() },
      user: { id: "ba-1", email: "customer@example.com", name: "Customer", customerId: "cust-1" },
    } as any;

    attachCustomerAuthContext(req, {
      betterAuthSession,
      customer: {
        id: "cust-1",
        email: "customer@example.com",
        name: "Customer User",
        phone: null,
        address: null,
        city: null,
        state: null,
        zipCode: null,
        country: null,
        avatarUrl: null,
      } as any,
    });

    expect(req.customerAuth).toMatchObject({
      customerId: "cust-1",
      email: "customer@example.com",
      betterAuthSession,
    });
    expect(req.customerAuth?.customer).toMatchObject({
      id: "cust-1",
      email: "customer@example.com",
      avatarUrl: null,
    });
    expect(req.customerAuth?.customerId).toBe("cust-1");
  });

  it("resolves a Better Auth session to the linked customer profile", async () => {
    const betterAuthSession = {
      session: { id: "session-1", userId: "ba-1", token: "token", expiresAt: new Date() },
      user: { id: "ba-1", email: "customer@example.com", name: "Customer", customerId: "cust-1" },
    } as any;
    const customer = {
      id: "cust-1",
      email: "customer@example.com",
      name: "Customer User",
      isDisabled: false,
      mergedIntoCustomerId: null,
    } as any;
    mocks.auth.api.getSession.mockResolvedValue(betterAuthSession);
    mocks.storage.getCustomer.mockResolvedValue(customer);

    const context = await getCustomerAuthContext({
      headers: { cookie: "better-auth.session_token=session-token" },
    } as Request);

    expect(mocks.auth.api.getSession).toHaveBeenCalledWith({
      headers: expect.any(Headers),
    });
    expect(mocks.storage.getCustomer).toHaveBeenCalledWith("cust-1");
    expect(context).toEqual({
      betterAuthSession,
      customer,
    });
  });

  it("rejects Better Auth sessions linked to admin users", async () => {
    mocks.auth.api.getSession.mockResolvedValue({
      session: { id: "session-1", userId: "ba-admin", token: "token", expiresAt: new Date() },
      user: { id: "ba-admin", email: "admin@example.com", name: "Admin", adminUserId: "admin-1" },
    });

    await expect(getCustomerAuthContext({ headers: {} } as Request)).rejects.toMatchObject({
      message: "This email is managed by an admin account. Please use a different customer email.",
      statusCode: 400,
    });
    expect(mocks.storage.getCustomer).not.toHaveBeenCalled();
  });

  it("rejects disabled or merged linked customer profiles", async () => {
    mocks.auth.api.getSession.mockResolvedValue({
      session: { id: "session-1", userId: "ba-1", token: "token", expiresAt: new Date() },
      user: { id: "ba-1", email: "customer@example.com", name: "Customer", customerId: "cust-1" },
    });
    mocks.storage.getCustomer.mockResolvedValueOnce({
      id: "cust-1",
      email: "customer@example.com",
      isDisabled: true,
      mergedIntoCustomerId: null,
    });

    await expect(getCustomerAuthContext({ headers: {} } as Request)).rejects.toMatchObject({
      message: "This account has been disabled",
      statusCode: 403,
    });

    mocks.storage.getCustomer.mockResolvedValueOnce({
      id: "cust-1",
      email: "customer@example.com",
      isDisabled: false,
      mergedIntoCustomerId: "cust-primary",
    });

    await expect(getCustomerAuthContext({ headers: {} } as Request)).rejects.toMatchObject({
      message: "This account has been merged. Please use your primary account.",
      statusCode: 409,
      mergedInto: "cust-primary",
    });
  });
});
