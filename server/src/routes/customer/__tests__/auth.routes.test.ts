import express from "express";
import { createServer, type Server } from "http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  storage: {
    getCustomerByEmail: vi.fn(),
    updateCustomer: vi.fn(),
    createCustomer: vi.fn(),
    deleteCustomer: vi.fn(),
    getCustomer: vi.fn(),
    getAdminUserByEmail: vi.fn(),
  },
  customerBetterAuth: {
    BETTER_AUTH_CUSTOMER_PASSWORD_PLACEHOLDER: "better-auth-managed",
    applyBetterAuthHeaders: vi.fn((res: any) => res.set("x-auth-headers-applied", "true")),
    attachCustomerAuthContext: vi.fn(),
    changeCustomerPassword: vi.fn(),
    getBetterAuthUserByCustomerId: vi.fn(),
    getCustomerAuthContext: vi.fn(),
    isBetterAuthEmailReservedForAdmin: vi.fn(),
    normalizeCustomerEmail: vi.fn((email: string) => email.trim().toLowerCase()),
    requestCustomerMagicLink: vi.fn(),
    requestCustomerPasswordReset: vi.fn(),
    resetCustomerPasswordAndCreateSession: vi.fn(),
    serializeCustomer: vi.fn((customer: any) => ({
      id: customer.id,
      email: customer.email,
      name: customer.name,
      avatarUrl: customer.avatarUrl || null,
    })),
    signInCustomerWithPassword: vi.fn(),
    signOutCustomer: vi.fn(),
    syncBetterAuthCustomerUser: vi.fn(),
    verifyCustomerMagicLink: vi.fn(),
  },
  requireCustomerAuth: vi.fn((req: any, _res: any, next: any) => {
    req.customerSession = { customerId: "cust-1", email: "customer@example.com" };
    next();
  }),
  claimOrdersByEmail: vi.fn(),
}));

vi.mock("../../../../storage", () => ({ storage: mocks.storage }));
vi.mock("../../../auth/customerBetterAuth", () => mocks.customerBetterAuth);
vi.mock("../../../middleware/customer-auth.middleware", () => ({
  requireCustomerAuth: mocks.requireCustomerAuth,
}));
vi.mock("../../../middleware/rate-limiter", () => ({
  authLimiter: (_req: any, _res: any, next: any) => next(),
  passwordResetLimiter: (_req: any, _res: any, next: any) => next(),
}));
vi.mock("../../../services/order-claim.service", () => ({
  claimOrdersByEmail: mocks.claimOrdersByEmail,
}));

const router = (await import("../auth.routes")).default;

async function startApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/customer/auth", router);

  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Failed to listen");

  return {
    server,
    request: (path: string, init?: RequestInit) =>
      fetch(`http://127.0.0.1:${address.port}${path}`, init),
  };
}

let server: Server | undefined;

describe("customer auth routes", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks.storage)) mock.mockReset();
    for (const mock of Object.values(mocks.customerBetterAuth)) {
      if (typeof mock === "function" && "mockReset" in mock) mock.mockReset();
    }
    mocks.requireCustomerAuth.mockClear();
    mocks.claimOrdersByEmail.mockClear();
    mocks.claimOrdersByEmail.mockResolvedValue(undefined);
    mocks.customerBetterAuth.BETTER_AUTH_CUSTOMER_PASSWORD_PLACEHOLDER = "better-auth-managed";
    mocks.customerBetterAuth.applyBetterAuthHeaders.mockImplementation((res: any) => res.set("x-auth-headers-applied", "true"));
    mocks.customerBetterAuth.isBetterAuthEmailReservedForAdmin.mockResolvedValue(false);
    mocks.customerBetterAuth.normalizeCustomerEmail.mockImplementation((email: string) => email.trim().toLowerCase());
    mocks.customerBetterAuth.serializeCustomer.mockImplementation((customer: any) => ({
      id: customer.id,
      email: customer.email,
      name: customer.name,
      avatarUrl: customer.avatarUrl || null,
    }));
  });

  afterEach(async () => {
    if (!server) return;
    await new Promise<void>((resolve, reject) => {
      server!.close((error) => (error ? reject(error) : resolve()));
    });
    server = undefined;
  });

  it("upgrades a valid legacy customer password to Better Auth and sets cookie headers", async () => {
    const app = await startApp();
    server = app.server;
    const legacyHash = await import("bcryptjs").then(({ default: bcrypt }) => bcrypt.hash("password123", 4));
    const customer = {
      id: "cust-1",
      email: "customer@example.com",
      name: "Customer One",
      passwordHash: legacyHash,
      isDisabled: false,
      mergedIntoCustomerId: null,
    };

    mocks.storage.getCustomerByEmail.mockResolvedValue(customer);
    mocks.customerBetterAuth.signInCustomerWithPassword
      .mockRejectedValueOnce(Object.assign(new Error("Invalid credentials"), { statusCode: 401 }))
      .mockResolvedValueOnce({
        response: { user: { id: "ba-1", email: customer.email, name: customer.name } },
        headers: new Headers(),
      });
    mocks.customerBetterAuth.getBetterAuthUserByCustomerId.mockResolvedValue({ id: "ba-1" });

    const response = await app.request("/api/customer/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: " CUSTOMER@example.com ", password: "password123" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-auth-headers-applied")).toBe("true");
    expect(mocks.customerBetterAuth.syncBetterAuthCustomerUser).toHaveBeenCalledWith(customer, "password123");
    expect(mocks.storage.updateCustomer).toHaveBeenCalledWith("cust-1", { passwordHash: "better-auth-managed" });
    expect(body).toMatchObject({ success: true, customer: { id: "cust-1", email: "customer@example.com" } });
    expect(body.sessionToken).toBeUndefined();
  });

  it("does not mark a legacy password as Better Auth managed when post-sync sign-in fails", async () => {
    const app = await startApp();
    server = app.server;
    const legacyHash = await import("bcryptjs").then(({ default: bcrypt }) => bcrypt.hash("password123", 4));
    const customer = {
      id: "cust-1",
      email: "customer@example.com",
      name: "Customer One",
      passwordHash: legacyHash,
      isDisabled: false,
      mergedIntoCustomerId: null,
    };

    mocks.storage.getCustomerByEmail.mockResolvedValue(customer);
    mocks.customerBetterAuth.signInCustomerWithPassword
      .mockRejectedValueOnce(Object.assign(new Error("Invalid credentials"), { statusCode: 401 }))
      .mockRejectedValueOnce(new Error("post-sync sign-in failed"));

    const response = await app.request("/api/customer/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "customer@example.com", password: "password123" }),
    });

    expect(response.status).toBe(500);
    expect(mocks.customerBetterAuth.syncBetterAuthCustomerUser).toHaveBeenCalledWith(customer, "password123");
    expect(mocks.storage.updateCustomer).not.toHaveBeenCalledWith("cust-1", { passwordHash: "better-auth-managed" });
  });

  it("returns cookie-session validity without requiring a bearer token", async () => {
    const app = await startApp();
    server = app.server;
    mocks.customerBetterAuth.getCustomerAuthContext.mockResolvedValue({
      customer: { id: "cust-1", email: "customer@example.com", name: "Customer One" },
    });

    const response = await app.request("/api/customer/auth/verify-session", { method: "POST" });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      valid: true,
      customer: { id: "cust-1", email: "customer@example.com" },
    });
  });

  it("does not request Better Auth password reset when no customer profile exists", async () => {
    const app = await startApp();
    server = app.server;
    mocks.storage.getCustomerByEmail.mockResolvedValue(null);

    const response = await app.request("/api/customer/auth/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "admin-only@example.com" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ success: true });
    expect(mocks.customerBetterAuth.requestCustomerPasswordReset).not.toHaveBeenCalled();
  });

  it("rejects registration for an admin-reserved Better Auth email", async () => {
    const app = await startApp();
    server = app.server;
    mocks.storage.getCustomerByEmail.mockResolvedValue(null);
    mocks.customerBetterAuth.isBetterAuthEmailReservedForAdmin.mockResolvedValue(true);

    const response = await app.request("/api/customer/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "admin@example.com", password: "password123", name: "Admin" }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toContain("already exists");
    expect(mocks.customerBetterAuth.syncBetterAuthCustomerUser).not.toHaveBeenCalled();
  });

  it("rejects registration for an existing Better Auth-managed customer", async () => {
    const app = await startApp();
    server = app.server;
    mocks.storage.getCustomerByEmail.mockResolvedValue({
      id: "cust-1",
      email: "customer@example.com",
      name: "Customer One",
      passwordHash: "better-auth-managed",
      isDisabled: false,
      mergedIntoCustomerId: null,
    });

    const response = await app.request("/api/customer/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "customer@example.com", password: "password123", name: "Attacker" }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toContain("already exists");
    expect(mocks.customerBetterAuth.syncBetterAuthCustomerUser).not.toHaveBeenCalled();
    expect(mocks.customerBetterAuth.signInCustomerWithPassword).not.toHaveBeenCalled();
    expect(mocks.storage.updateCustomer).not.toHaveBeenCalled();
  });

  it("rolls back a newly-created customer profile when Better Auth sync fails during registration", async () => {
    const app = await startApp();
    server = app.server;
    const customer = {
      id: "cust-new",
      email: "new@example.com",
      name: "New Customer",
      passwordHash: null,
      isDisabled: false,
      mergedIntoCustomerId: null,
    };
    mocks.storage.getCustomerByEmail.mockResolvedValue(null);
    mocks.storage.createCustomer.mockResolvedValue(customer);
    mocks.storage.deleteCustomer.mockResolvedValue(undefined);
    mocks.customerBetterAuth.syncBetterAuthCustomerUser.mockRejectedValue(new Error("sync failed"));

    const response = await app.request("/api/customer/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "new@example.com", password: "password123", name: "New Customer" }),
    });

    expect(response.status).toBe(500);
    expect(mocks.storage.createCustomer).toHaveBeenCalledWith({ email: "new@example.com", name: "New Customer" });
    expect(mocks.storage.deleteCustomer).toHaveBeenCalledWith("cust-new");
    expect(mocks.storage.updateCustomer).not.toHaveBeenCalledWith("cust-new", expect.objectContaining({ passwordHash: "better-auth-managed" }));
  });
});
