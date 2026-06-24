import express from "express";
import { createServer, type Server } from "http";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const selectBuilder = {
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
  };
  const insertBuilder = {
    values: vi.fn(),
  };
  const returningBuilder = {
    returning: vi.fn(),
  };

  selectBuilder.from.mockReturnValue(selectBuilder);
  selectBuilder.where.mockReturnValue(selectBuilder);
  insertBuilder.values.mockReturnValue(returningBuilder);

  return {
    customerIdentityService: {
      resolve: vi.fn(),
    },
    db: {
      query: {
        orders: {
          findFirst: vi.fn(),
        },
      },
      insert: vi.fn(() => insertBuilder),
      select: vi.fn(() => selectBuilder),
    },
    selectBuilder,
    insertBuilder,
    returningBuilder,
  };
});

vi.mock("../../../../db", () => ({ db: mocks.db }));
vi.mock("../../../services/customer-identity.service", () => ({
  customerIdentityService: mocks.customerIdentityService,
}));
vi.mock("../../../middleware", () => ({
  requireAdmin: (_req: any, _res: any, next: any) => next(),
}));
vi.mock("../../../services/notification.service", () => ({
  notificationService: {
    notifyCustomerOfAdminReply: vi.fn(),
    notifyCustomerOfStatusChange: vi.fn(),
  },
}));
vi.mock("../../../services/support-email.service", () => ({
  sendAdminReplyToCustomer: vi.fn(),
  sendStatusChangeToCustomer: vi.fn(),
}));

const router = (await import("../support.routes")).default;

async function startApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/customer/support", router);

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

describe("customer support routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.selectBuilder.from.mockReturnValue(mocks.selectBuilder);
    mocks.selectBuilder.where.mockReturnValue(mocks.selectBuilder);
    mocks.selectBuilder.orderBy.mockResolvedValue([]);
    mocks.insertBuilder.values.mockReturnValue(mocks.returningBuilder);
  });

  afterEach(async () => {
    if (!server) return;
    await new Promise<void>((resolve, reject) => {
      server!.close((error) => (error ? reject(error) : resolve()));
    });
    server = undefined;
  });

  it("returns 401 when customer identity is missing", async () => {
    mocks.customerIdentityService.resolve.mockResolvedValue({
      ok: false,
      error: { httpStatus: 401, message: "No authentication credentials provided" },
    });
    const app = await startApp();
    server = app.server;

    const response = await app.request("/api/customer/support");

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ message: "No authentication credentials provided" });
  });

  it("creates a ticket for the resolved Better Auth customer", async () => {
    const customer = { id: "cust-1", email: "customer@example.com", name: "Customer" };
    const ticket = { id: "ticket-1", customerId: "cust-1", subject: "Help" };
    mocks.customerIdentityService.resolve.mockResolvedValue({
      ok: true,
      identity: { customerId: "cust-1", customer, source: "better_auth" },
    });
    mocks.returningBuilder.returning.mockResolvedValue([ticket]);
    const app = await startApp();
    server = app.server;

    const response = await app.request("/api/customer/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: "Help",
        message: "Need help with my order",
        type: "general",
      }),
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ ticket });
    expect(mocks.insertBuilder.values).toHaveBeenCalledWith(expect.objectContaining({
      customerId: "cust-1",
      subject: "Help",
    }));
  });

  it("rejects order IDs outside the resolved customer scope", async () => {
    const customer = { id: "cust-1", email: "customer@example.com", name: "Customer" };
    mocks.customerIdentityService.resolve.mockResolvedValue({
      ok: true,
      identity: { customerId: "cust-1", customer, source: "better_auth" },
    });
    mocks.db.query.orders.findFirst.mockResolvedValue(null);
    const app = await startApp();
    server = app.server;

    const response = await app.request("/api/customer/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: "Help",
        message: "Need help with my order",
        orderId: "order-other",
        type: "general",
      }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ message: "Order not found or does not belong to you" });
    expect(mocks.db.insert).not.toHaveBeenCalled();
  });

  it("lists tickets only for the resolved Better Auth customer", async () => {
    const customer = { id: "cust-1", email: "customer@example.com", name: "Customer" };
    const tickets = [{ id: "ticket-1", customerId: "cust-1", subject: "Help" }];
    mocks.customerIdentityService.resolve.mockResolvedValue({
      ok: true,
      identity: { customerId: "cust-1", customer, source: "better_auth" },
    });
    mocks.selectBuilder.orderBy.mockResolvedValue(tickets);
    const app = await startApp();
    server = app.server;

    const response = await app.request("/api/customer/support");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ tickets });
    expect(mocks.selectBuilder.where).toHaveBeenCalled();
  });
});
