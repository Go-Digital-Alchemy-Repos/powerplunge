import express from "express";
import { createServer, type Server } from "http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAttachedCustomerAuthContext: vi.fn((req: any) => {
    req.customerAuth = {
      customerId: "cust-1",
      email: "customer@example.com",
      customer: { id: "cust-1", email: "customer@example.com" },
      betterAuthSession: {},
    };
    return Promise.resolve({
      customer: { id: "cust-1", email: "customer@example.com" },
      betterAuthSession: {},
    });
  }),
  notificationService: {
    listForRecipient: vi.fn(),
    getUnreadCount: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  },
}));

vi.mock("../../../auth/customerBetterAuth", () => ({
  getAttachedCustomerAuthContext: mocks.getAttachedCustomerAuthContext,
}));

vi.mock("../../../services/notification.service", () => ({
  notificationService: mocks.notificationService,
}));

const router = (await import("../notifications.routes")).default;

async function startApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/customer/notifications", router);

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

describe("customer notification routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAttachedCustomerAuthContext.mockImplementation((req: any) => {
      req.customerAuth = {
        customerId: "cust-1",
        email: "customer@example.com",
        customer: { id: "cust-1", email: "customer@example.com" },
        betterAuthSession: {},
      };
      return Promise.resolve({
        customer: { id: "cust-1", email: "customer@example.com" },
        betterAuthSession: {},
      });
    });
    mocks.notificationService.listForRecipient.mockResolvedValue({ notifications: [], total: 0 });
    mocks.notificationService.getUnreadCount.mockResolvedValue(2);
    mocks.notificationService.markRead.mockResolvedValue(true);
    mocks.notificationService.markAllRead.mockResolvedValue(4);
  });

  afterEach(async () => {
    if (!server) return;
    await new Promise<void>((resolve, reject) => {
      server!.close((error) => (error ? reject(error) : resolve()));
    });
    server = undefined;
  });

  it("uses the Better Auth customer id when listing notifications", async () => {
    const app = await startApp();
    server = app.server;

    const response = await app.request("/api/customer/notifications?limit=20&offset=5");

    expect(response.status).toBe(200);
    expect(mocks.notificationService.listForRecipient).toHaveBeenCalledWith("customer", "cust-1", 20, 5);
  });

  it("uses the Better Auth customer id for unread and read mutations", async () => {
    const app = await startApp();
    server = app.server;

    await app.request("/api/customer/notifications/unread-count");
    await app.request("/api/customer/notifications/notif-1/read", { method: "PATCH" });
    await app.request("/api/customer/notifications/mark-all-read", { method: "PATCH" });

    expect(mocks.notificationService.getUnreadCount).toHaveBeenCalledWith("customer", "cust-1");
    expect(mocks.notificationService.markRead).toHaveBeenCalledWith("notif-1", "customer", "cust-1");
    expect(mocks.notificationService.markAllRead).toHaveBeenCalledWith("customer", "cust-1");
  });

  it("rejects missing, misconfigured, disabled, and merged Better Auth customer sessions", async () => {
    const app = await startApp();
    server = app.server;

    mocks.getAttachedCustomerAuthContext.mockResolvedValueOnce(null);
    expect((await app.request("/api/customer/notifications")).status).toBe(401);

    mocks.getAttachedCustomerAuthContext.mockRejectedValueOnce(
      new Error("Better Auth is not configured for customer authentication"),
    );
    expect((await app.request("/api/customer/notifications")).status).toBe(503);

    mocks.getAttachedCustomerAuthContext.mockRejectedValueOnce(
      Object.assign(new Error("This account has been disabled"), { statusCode: 403 }),
    );
    expect((await app.request("/api/customer/notifications")).status).toBe(403);

    mocks.getAttachedCustomerAuthContext.mockRejectedValueOnce(
      Object.assign(new Error("This account has been merged. Please use your primary account."), {
        statusCode: 409,
        mergedInto: "cust-primary",
      }),
    );
    const merged = await app.request("/api/customer/notifications");
    expect(merged.status).toBe(409);
    expect(await merged.json()).toMatchObject({ mergedInto: "cust-primary" });
  });
});
