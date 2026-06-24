import express from "express";
import { createServer, type Server } from "http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  storage: {
    getAdminUsers: vi.fn(),
    getAdminUser: vi.fn(),
    getAdminUserByEmail: vi.fn(),
    createAdminUser: vi.fn(),
    updateAdminUser: vi.fn(),
    deleteAdminUser: vi.fn(),
  },
  adminBetterAuth: {
    BETTER_AUTH_LEGACY_PASSWORD_PLACEHOLDER: "better-auth-managed",
    deleteBetterAuthAdminUser: vi.fn(),
    getBetterAuthUserByEmail: vi.fn(),
    syncBetterAuthAdminUser: vi.fn(),
  },
}));

vi.mock("../../../../storage", () => ({ storage: mocks.storage }));
vi.mock("../../../auth/adminBetterAuth", () => mocks.adminBetterAuth);

const router = (await import("../team.routes")).default;

async function startApp(adminUser?: { id: string }) {
  const app = express();
  app.use(express.json());
  if (adminUser) {
    app.use((req: any, _res, next) => {
      req.adminUser = adminUser;
      next();
    });
  }
  app.use("/api/admin/team", router);

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

describe("admin team routes", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks.storage)) mock.mockReset();
    for (const mock of Object.values(mocks.adminBetterAuth)) {
      if (typeof mock === "function" && "mockReset" in mock) mock.mockReset();
    }
    mocks.storage.getAdminUserByEmail.mockResolvedValue(undefined);
    mocks.storage.deleteAdminUser.mockResolvedValue(undefined);
    mocks.adminBetterAuth.getBetterAuthUserByEmail.mockResolvedValue(undefined);
    mocks.adminBetterAuth.deleteBetterAuthAdminUser.mockResolvedValue(undefined);
    mocks.adminBetterAuth.syncBetterAuthAdminUser.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    if (!server) return;
    await new Promise<void>((resolve, reject) => {
      server!.close((error) => (error ? reject(error) : resolve()));
    });
    server = undefined;
  });

  it("rolls back admin row when Better Auth sync fails during create", async () => {
    const app = await startApp();
    server = app.server;
    mocks.storage.createAdminUser.mockResolvedValue({
      id: "admin-1",
      email: "admin@example.com",
      firstName: "Admin",
      lastName: "User",
      name: "Admin User",
      phone: "",
      role: "admin",
    });
    mocks.adminBetterAuth.syncBetterAuthAdminUser.mockRejectedValue(new Error("sync failed"));

    const response = await app.request("/api/admin/team", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "Admin@Example.com",
        password: "password123",
        firstName: "Admin",
        lastName: "User",
        role: "admin",
      }),
    });

    expect(response.status).toBe(500);
    expect(mocks.storage.createAdminUser).toHaveBeenCalledWith(expect.objectContaining({
      email: "admin@example.com",
      password: "better-auth-managed",
    }));
    expect(mocks.storage.deleteAdminUser).toHaveBeenCalledWith("admin-1");
  });

  it("rejects create when a Better Auth user already owns the email", async () => {
    const app = await startApp();
    server = app.server;
    mocks.adminBetterAuth.getBetterAuthUserByEmail.mockResolvedValue({ id: "ba-customer" });

    const response = await app.request("/api/admin/team", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "admin@example.com",
        password: "password123",
        firstName: "Admin",
        lastName: "User",
        role: "admin",
      }),
    });

    expect(response.status).toBe(400);
    expect(mocks.storage.createAdminUser).not.toHaveBeenCalled();
  });

  it("allows super admin profile update when role remains super_admin", async () => {
    const app = await startApp();
    server = app.server;
    mocks.storage.getAdminUser.mockResolvedValue({
      id: "super-1",
      email: "owner@example.com",
      name: "Owner",
      role: "super_admin",
    });
    mocks.storage.updateAdminUser.mockResolvedValue({
      id: "super-1",
      email: "owner@example.com",
      firstName: "Owner",
      lastName: "User",
      name: "Owner User",
      phone: "",
      role: "super_admin",
    });

    const response = await app.request("/api/admin/team/super-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ firstName: "Owner", lastName: "User", role: "super_admin" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.adminBetterAuth.syncBetterAuthAdminUser).toHaveBeenCalled();
  });

  it("blocks self-delete through req.adminUser", async () => {
    const app = await startApp({ id: "admin-1" });
    server = app.server;

    const response = await app.request("/api/admin/team/admin-1", { method: "DELETE" });

    expect(response.status).toBe(400);
    expect(mocks.storage.deleteAdminUser).not.toHaveBeenCalled();
  });

  it("deletes admin row before Better Auth account", async () => {
    const app = await startApp({ id: "admin-1" });
    server = app.server;
    mocks.storage.getAdminUser.mockResolvedValue({ id: "admin-2", role: "fulfillment" });

    const response = await app.request("/api/admin/team/admin-2", { method: "DELETE" });

    expect(response.status).toBe(200);
    expect(mocks.storage.deleteAdminUser).toHaveBeenCalledWith("admin-2");
    expect(mocks.adminBetterAuth.deleteBetterAuthAdminUser).toHaveBeenCalledWith("admin-2");
    expect(mocks.storage.deleteAdminUser.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.adminBetterAuth.deleteBetterAuthAdminUser.mock.invocationCallOrder[0]);
  });
});
