import { createServer, type Server as HttpServer } from "http";
import type { AddressInfo } from "net";
import { io as createClient, type Socket as ClientSocket } from "socket.io-client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Server as SocketIOServer } from "socket.io";

const mocks = vi.hoisted(() => ({
  getAdminAuthContext: vi.fn(),
  getCustomerAuthContext: vi.fn(),
  notificationService: {
    getUnreadCount: vi.fn(),
  },
}));

vi.mock("../../auth/adminBetterAuth", () => ({
  getAdminAuthContext: mocks.getAdminAuthContext,
}));

vi.mock("../../auth/customerBetterAuth", () => ({
  getCustomerAuthContext: mocks.getCustomerAuthContext,
}));

vi.mock("../../services/notification.service", () => ({
  notificationService: mocks.notificationService,
}));

const {
  emitNotification,
  emitTicketUpdated,
  emitToAllAdmins,
  emitUnreadCount,
  initializeSocketServer,
} = await import("../socketServer");

async function waitFor<T>(fn: () => T | undefined | false, timeoutMs = 1000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = fn();
    if (result) return result;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for condition");
}

async function startSocketServer() {
  const httpServer = createServer();
  const ioServer = initializeSocketServer(httpServer);
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const address = httpServer.address() as AddressInfo;
  return { httpServer, ioServer, url: `http://127.0.0.1:${address.port}` };
}

async function connectClient(
  url: string,
  role: "admin" | "customer",
  extraHeaders: Record<string, string> = {},
) {
  const socket = createClient(url, {
    path: "/socket.io",
    auth: { role },
    extraHeaders,
    withCredentials: true,
    transports: ["websocket"],
    reconnection: false,
    forceNew: true,
  });

  await new Promise<void>((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("connect_error", reject);
  });

  return socket;
}

async function connectError(url: string, auth?: Record<string, unknown>) {
  const socket = createClient(url, {
    path: "/socket.io",
    auth,
    transports: ["websocket"],
    reconnection: false,
    forceNew: true,
  });

  try {
    return await new Promise<Error>((resolve, reject) => {
      socket.once("connect", () => reject(new Error("Expected socket connection to fail")));
      socket.once("connect_error", resolve);
    });
  } finally {
    socket.disconnect();
  }
}

let httpServer: HttpServer | undefined;
let ioServer: SocketIOServer | undefined;
let url = "";
const clients: ClientSocket[] = [];

describe("Socket.IO Better Auth", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.notificationService.getUnreadCount.mockResolvedValue(0);
    const server = await startSocketServer();
    httpServer = server.httpServer;
    ioServer = server.ioServer;
    url = server.url;
  });

  afterEach(async () => {
    for (const client of clients.splice(0)) client.disconnect();
    await new Promise<void>((resolve) => ioServer?.close(() => resolve()) ?? resolve());
    await new Promise<void>((resolve, reject) => {
      if (!httpServer?.listening) return resolve();
      httpServer.close((error) => (error ? reject(error) : resolve()));
    });
    httpServer = undefined;
    ioServer = undefined;
    url = "";
  });

  it("accepts an admin Better Auth session and joins admin rooms", async () => {
    mocks.getAdminAuthContext.mockResolvedValue({
      admin: { id: "admin-1" },
      role: "admin",
      betterAuthSession: {},
    });

    const admin = await connectClient(url, "admin", {
      cookie: "better-auth.session_token=admin-session",
    });
    clients.push(admin);

    await waitFor(() => ioServer?.sockets.adapter.rooms.get("admin:admin-1")?.size === 1);
    expect(ioServer?.sockets.adapter.rooms.get("role:admin")?.size).toBe(1);
    expect(mocks.getAdminAuthContext).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          cookie: "better-auth.session_token=admin-session",
        }),
      }),
    );
    expect(mocks.getCustomerAuthContext).not.toHaveBeenCalled();
  });

  it("accepts a customer Better Auth session and isolates customer notifications", async () => {
    mocks.getCustomerAuthContext.mockImplementation(async () => ({
      customer: { id: "cust-1" },
      betterAuthSession: {},
    }));
    mocks.getAdminAuthContext.mockResolvedValue({
      admin: { id: "admin-1" },
      role: "admin",
      betterAuthSession: {},
    });

    const customer = await connectClient(url, "customer", {
      cookie: "better-auth.session_token=customer-session",
    });
    const admin = await connectClient(url, "admin");
    clients.push(customer, admin);

    await waitFor(() => ioServer?.sockets.adapter.rooms.get("customer:cust-1")?.size === 1);
    expect(ioServer?.sockets.adapter.rooms.get("role:admin")?.size).toBe(1);
    expect(ioServer?.sockets.adapter.rooms.get("customer:cust-1")).toBeDefined();
    expect(mocks.getCustomerAuthContext).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          cookie: "better-auth.session_token=customer-session",
        }),
      }),
    );

    const customerEvents: unknown[] = [];
    const adminEvents: unknown[] = [];
    customer.on("notif:new", (payload) => customerEvents.push(payload));
    admin.on("notif:new", (payload) => adminEvents.push(payload));

    emitNotification("customer", "cust-1", { id: "notif-1", recipientType: "customer" } as any);

    await waitFor(() => customerEvents.length === 1);
    expect(adminEvents).toHaveLength(0);
  });

  it("rejects missing roles, invalid sessions, and thrown auth lookups", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await expect(connectError(url)).resolves.toMatchObject({ message: "Authentication required" });

      mocks.getAdminAuthContext.mockResolvedValue(null);
      await expect(connectError(url, { role: "admin" })).resolves.toMatchObject({
        message: "Invalid admin session",
      });

      mocks.getCustomerAuthContext.mockRejectedValue(new Error("session lookup failed"));
      await expect(connectError(url, { role: "customer" })).resolves.toMatchObject({
        message: "Authentication failed",
      });
    } finally {
      consoleError.mockRestore();
    }
  });

  it("emits unread counts, ticket updates, and admin broadcasts to the authorized rooms only", async () => {
    mocks.getCustomerAuthContext.mockResolvedValue({
      customer: { id: "cust-1" },
      betterAuthSession: {},
    });
    mocks.getAdminAuthContext.mockResolvedValue({
      admin: { id: "admin-1" },
      role: "admin",
      betterAuthSession: {},
    });
    mocks.notificationService.getUnreadCount.mockResolvedValue(3);

    const customer = await connectClient(url, "customer");
    const admin = await connectClient(url, "admin");
    clients.push(customer, admin);

    const customerCounts: unknown[] = [];
    const customerTickets: unknown[] = [];
    const adminBroadcasts: unknown[] = [];
    const customerBroadcasts: unknown[] = [];
    customer.on("notif:unread_count", (payload) => customerCounts.push(payload));
    customer.on("ticket:updated", (payload) => customerTickets.push(payload));
    customer.on("admin:event", (payload) => customerBroadcasts.push(payload));
    admin.on("admin:event", (payload) => adminBroadcasts.push(payload));

    await emitUnreadCount("customer", "cust-1");
    emitTicketUpdated("customer", "cust-1", { ticketId: "ticket-1" });
    emitToAllAdmins("admin:event", { ok: true });

    await waitFor(() => customerCounts.length === 1 && customerTickets.length === 1 && adminBroadcasts.length === 1);
    expect(customerCounts[0]).toEqual({ unreadCount: 3 });
    expect(customerTickets[0]).toEqual({ ticketId: "ticket-1" });
    expect(adminBroadcasts[0]).toEqual({ ok: true });
    expect(customerBroadcasts).toHaveLength(0);
  });
});
