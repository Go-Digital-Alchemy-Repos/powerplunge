import express from "express";
import { createServer, type Server } from "http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminAuthContext: vi.fn(),
  attachAdminAuthContext: vi.fn((req: any, context: any) => {
    req.adminId = context.admin.id;
    req.adminUser = context.admin;
  }),
  notificationService: {
    listForRecipient: vi.fn(),
    getUnreadCount: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  },
}));

vi.mock("../../../auth/adminBetterAuth", () => ({
  getAdminAuthContext: mocks.getAdminAuthContext,
  attachAdminAuthContext: mocks.attachAdminAuthContext,
}));

vi.mock("../../../services/notification.service", () => ({
  notificationService: mocks.notificationService,
}));

const router = (await import("../notifications.routes")).default;

async function startApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/admin/notifications", router);

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

describe("admin notification routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminAuthContext.mockResolvedValue({
      admin: { id: "admin-1", role: "admin", email: "admin@example.com" },
      role: "admin",
      betterAuthSession: {},
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

  it("uses the Better Auth admin id when listing notifications", async () => {
    const app = await startApp();
    server = app.server;

    const response = await app.request("/api/admin/notifications?limit=20&offset=5");

    expect(response.status).toBe(200);
    expect(mocks.notificationService.listForRecipient).toHaveBeenCalledWith("admin", "admin-1", 20, 5);
  });

  it("uses the Better Auth admin id for unread and read mutations", async () => {
    const app = await startApp();
    server = app.server;

    await app.request("/api/admin/notifications/unread-count");
    await app.request("/api/admin/notifications/notif-1/read", { method: "PATCH" });
    await app.request("/api/admin/notifications/mark-all-read", { method: "PATCH" });

    expect(mocks.notificationService.getUnreadCount).toHaveBeenCalledWith("admin", "admin-1");
    expect(mocks.notificationService.markRead).toHaveBeenCalledWith("notif-1", "admin", "admin-1");
    expect(mocks.notificationService.markAllRead).toHaveBeenCalledWith("admin", "admin-1");
  });

  it("rejects missing, misconfigured, and insufficient Better Auth admin sessions", async () => {
    const app = await startApp();
    server = app.server;

    mocks.getAdminAuthContext.mockResolvedValueOnce(null);
    expect((await app.request("/api/admin/notifications")).status).toBe(401);

    mocks.getAdminAuthContext.mockRejectedValueOnce(new Error("Better Auth is not configured for admin authentication"));
    expect((await app.request("/api/admin/notifications")).status).toBe(503);

    mocks.getAdminAuthContext.mockResolvedValueOnce({
      admin: { id: "fulfill-1", role: "fulfillment" },
      role: "fulfillment",
      betterAuthSession: {},
    });
    expect((await app.request("/api/admin/notifications")).status).toBe(403);
  });
});
