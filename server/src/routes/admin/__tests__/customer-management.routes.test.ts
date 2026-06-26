import express from "express";
import { createServer, type Server } from "http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  storage: {
    getCustomer: vi.fn(),
    createAdminAuditLog: vi.fn(),
    updateCustomer: vi.fn(),
  },
  customerBetterAuth: {
    BETTER_AUTH_CUSTOMER_PASSWORD_PLACEHOLDER: "better-auth-managed",
    requestCustomerPasswordReset: vi.fn(),
    syncBetterAuthCustomerUser: vi.fn(),
  },
}));

vi.mock("../../../../storage", () => ({ storage: mocks.storage }));
vi.mock("../../../auth/customerBetterAuth", () => mocks.customerBetterAuth);

const router = (await import("../customer-management.routes")).default;

async function startApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.adminId = "admin-1";
    next();
  });
  app.use("/api/admin/customers", router);

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

describe("admin customer management routes", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks.storage)) mock.mockReset();
    for (const mock of Object.values(mocks.customerBetterAuth)) {
      if (typeof mock === "function" && "mockReset" in mock) mock.mockReset();
    }
    mocks.storage.createAdminAuditLog.mockResolvedValue(undefined);
    mocks.customerBetterAuth.requestCustomerPasswordReset.mockResolvedValue(undefined);
    mocks.customerBetterAuth.syncBetterAuthCustomerUser.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    if (!server) return;
    await new Promise<void>((resolve, reject) => {
      server!.close((error) => (error ? reject(error) : resolve()));
    });
    server = undefined;
  });

  it("sends admin-initiated customer password reset through Better Auth", async () => {
    const app = await startApp();
    server = app.server;
    const customer = {
      id: "cust-1",
      email: "customer@example.com",
      name: "Customer",
    };
    mocks.storage.getCustomer.mockResolvedValue(customer);

    const response = await app.request("/api/admin/customers/cust-1/send-password-reset", {
      method: "POST",
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ success: true });
    expect(mocks.customerBetterAuth.syncBetterAuthCustomerUser).toHaveBeenCalledWith(customer);
    expect(mocks.customerBetterAuth.requestCustomerPasswordReset).toHaveBeenCalledWith("customer@example.com");
    expect(mocks.storage.createAdminAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      adminId: "admin-1",
      action: "send_password_reset",
      targetId: "cust-1",
    }));
  });
});
