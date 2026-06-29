import { describe, expect, it, vi } from "vitest";
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
  serializeCustomer,
} = await import("../customerBetterAuth");

describe("customer Better Auth request seam", () => {
  it("attaches canonical customer auth and legacy compatibility fields", () => {
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
    expect(req.customerSession).toEqual({
      customerId: "cust-1",
      email: "customer@example.com",
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
    expect(req.customerSession?.customerId).toBe("cust-1");
  });
});
