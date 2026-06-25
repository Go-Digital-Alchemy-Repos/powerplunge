import express from "express";
import { createServer, type Server } from "http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  storage: {
    getAdminUsers: vi.fn(),
    createAdminUser: vi.fn(),
    deleteAdminUser: vi.fn(),
    getAdminUserByEmail: vi.fn(),
    updateAdminUser: vi.fn(),
  },
  adminBetterAuth: {
    BETTER_AUTH_LEGACY_PASSWORD_PLACEHOLDER: "better-auth-managed",
    applyBetterAuthHeaders: vi.fn((res: any) => res.set("x-auth-headers-applied", "true")),
    assertAdminBetterAuthReady: vi.fn(),
    attachAdminAuthContext: vi.fn(),
    changeAdminPassword: vi.fn(),
    deleteBetterAuthUserById: vi.fn(),
    getAdminAuthContext: vi.fn(),
    getBetterAuthUserByAdminId: vi.fn(),
    requestAdminPasswordReset: vi.fn(),
    resetAdminPasswordAndCreateSession: vi.fn(),
    serializeAdmin: vi.fn((admin: any) => ({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      firstName: admin.firstName,
      lastName: admin.lastName,
      phone: admin.phone,
      role: admin.role,
      avatarUrl: admin.avatarUrl || null,
    })),
    signInAdminWithPassword: vi.fn(),
    signOutAdmin: vi.fn(),
    signUpAdminAndCreateSession: vi.fn(),
    syncBetterAuthAdminUser: vi.fn(),
    updateBetterAuthAdminUser: vi.fn(),
    validateAdminPasswordResetToken: vi.fn(),
  },
}));

vi.mock("../../../../storage", () => ({ storage: mocks.storage }));
vi.mock("../../../auth/adminBetterAuth", () => mocks.adminBetterAuth);
vi.mock("../../../middleware/rate-limiter", () => ({
  authLimiter: (_req: any, _res: any, next: any) => next(),
  passwordResetLimiter: (_req: any, _res: any, next: any) => next(),
}));

const router = (await import("../auth.routes")).default;

async function startApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/admin", router);

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

describe("admin auth routes", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks.storage)) mock.mockReset();
    for (const mock of Object.values(mocks.adminBetterAuth)) {
      if (typeof mock === "function" && "mockReset" in mock) mock.mockReset();
    }
    mocks.storage.deleteAdminUser.mockResolvedValue(undefined);
    mocks.adminBetterAuth.deleteBetterAuthUserById.mockResolvedValue(undefined);
    mocks.adminBetterAuth.requestAdminPasswordReset.mockResolvedValue(undefined);
    mocks.adminBetterAuth.resetAdminPasswordAndCreateSession.mockResolvedValue(undefined);
    mocks.adminBetterAuth.syncBetterAuthAdminUser.mockResolvedValue(undefined);
    mocks.adminBetterAuth.updateBetterAuthAdminUser.mockResolvedValue(undefined);
    mocks.adminBetterAuth.validateAdminPasswordResetToken.mockResolvedValue(false);
    mocks.adminBetterAuth.applyBetterAuthHeaders.mockImplementation((res: any) => res.set("x-auth-headers-applied", "true"));
    mocks.adminBetterAuth.serializeAdmin.mockImplementation((admin: any) => ({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      firstName: admin.firstName,
      lastName: admin.lastName,
      phone: admin.phone,
      role: admin.role,
      avatarUrl: admin.avatarUrl || null,
    }));
  });

  afterEach(async () => {
    if (!server) return;
    await new Promise<void>((resolve, reject) => {
      server!.close((error) => (error ? reject(error) : resolve()));
    });
    server = undefined;
  });

  it("rejects login when the signed-in Better Auth user is linked to a different admin", async () => {
    const app = await startApp();
    server = app.server;
    mocks.adminBetterAuth.signInAdminWithPassword.mockResolvedValue({
      response: { user: { id: "ba-other", email: "admin@example.com", name: "Admin" } },
      headers: new Headers(),
    });
    mocks.storage.getAdminUserByEmail.mockResolvedValue({
      id: "admin-1",
      email: "admin@example.com",
      name: "Admin",
      role: "admin",
    });
    mocks.adminBetterAuth.getBetterAuthUserByAdminId.mockResolvedValue({ id: "ba-linked" });

    const response = await app.request("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "admin@example.com", password: "password123" }),
    });

    expect(response.status).toBe(401);
    expect(mocks.adminBetterAuth.applyBetterAuthHeaders).not.toHaveBeenCalled();
  });

  it("returns current admin profile from Better Auth context", async () => {
    const app = await startApp();
    server = app.server;
    mocks.adminBetterAuth.getAdminAuthContext.mockResolvedValue({
      admin: {
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin",
        role: "admin",
      },
    });

    const response = await app.request("/api/admin/me");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ id: "admin-1", email: "admin@example.com", role: "admin" });
  });

  it("returns 401 from /me without Better Auth admin context", async () => {
    const app = await startApp();
    server = app.server;
    mocks.adminBetterAuth.getAdminAuthContext.mockResolvedValue(null);

    const response = await app.request("/api/admin/me");

    expect(response.status).toBe(401);
  });

  it("rolls back created admin and Better Auth user when setup sync fails", async () => {
    const app = await startApp();
    server = app.server;
    mocks.storage.getAdminUsers.mockResolvedValue([]);
    mocks.storage.createAdminUser.mockResolvedValue({
      id: "admin-1",
      email: "admin@example.com",
      name: "Admin",
      role: "super_admin",
    });
    mocks.adminBetterAuth.signUpAdminAndCreateSession.mockResolvedValue({
      response: { user: { id: "ba-1", email: "admin@example.com", name: "Admin" } },
      headers: new Headers(),
    });
    mocks.adminBetterAuth.updateBetterAuthAdminUser.mockRejectedValue(new Error("sync failed"));

    const response = await app.request("/api/admin/setup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "admin@example.com", password: "password123", name: "Admin" }),
    });

    expect(response.status).toBe(500);
    expect(mocks.storage.deleteAdminUser).toHaveBeenCalledWith("admin-1");
    expect(mocks.adminBetterAuth.deleteBetterAuthUserById).toHaveBeenCalledWith("ba-1");
  });

  it("links setup to the exact Better Auth user created by signup", async () => {
    const app = await startApp();
    server = app.server;
    const admin = {
      id: "admin-1",
      email: "admin@example.com",
      name: "Admin",
      role: "super_admin",
    };
    mocks.storage.getAdminUsers.mockResolvedValue([]);
    mocks.storage.createAdminUser.mockResolvedValue(admin);
    mocks.adminBetterAuth.signUpAdminAndCreateSession.mockResolvedValue({
      response: { user: { id: "ba-1", email: "admin@example.com", name: "Admin" } },
      headers: new Headers(),
    });

    const response = await app.request("/api/admin/setup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "admin@example.com", password: "password123", name: "Admin" }),
    });

    expect(response.status).toBe(201);
    expect(mocks.adminBetterAuth.updateBetterAuthAdminUser).toHaveBeenCalledWith("ba-1", admin);
    expect(mocks.adminBetterAuth.syncBetterAuthAdminUser).not.toHaveBeenCalled();
  });

  it("returns a generic forgot-password response without sending when no admin exists", async () => {
    const app = await startApp();
    server = app.server;
    mocks.storage.getAdminUserByEmail.mockResolvedValue(null);

    const response = await app.request("/api/admin/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "missing@example.com" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ success: true });
    expect(mocks.adminBetterAuth.requestAdminPasswordReset).not.toHaveBeenCalled();
  });

  it("does not fail forgot-password for legacy-only admins without a linked Better Auth user", async () => {
    const app = await startApp();
    server = app.server;
    mocks.storage.getAdminUserByEmail.mockResolvedValue({
      id: "admin-legacy",
      email: "legacy@example.com",
      name: "Legacy Admin",
      role: "admin",
    });
    mocks.adminBetterAuth.getBetterAuthUserByAdminId.mockResolvedValue(null);

    const response = await app.request("/api/admin/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "legacy@example.com" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.adminBetterAuth.syncBetterAuthAdminUser).not.toHaveBeenCalled();
    expect(mocks.adminBetterAuth.requestAdminPasswordReset).not.toHaveBeenCalled();
  });

  it("requests a Better Auth reset for linked admins", async () => {
    const app = await startApp();
    server = app.server;
    const admin = {
      id: "admin-1",
      email: "admin@example.com",
      name: "Admin",
      role: "admin",
    };
    mocks.storage.getAdminUserByEmail.mockResolvedValue(admin);
    mocks.adminBetterAuth.getBetterAuthUserByAdminId.mockResolvedValue({ id: "ba-1", adminUserId: "admin-1" });

    const response = await app.request("/api/admin/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "ADMIN@example.com" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.adminBetterAuth.syncBetterAuthAdminUser).toHaveBeenCalledWith(admin);
    expect(mocks.adminBetterAuth.requestAdminPasswordReset).toHaveBeenCalledWith("admin@example.com");
  });

  it("keeps forgot-password response generic when linked admin reset delivery fails", async () => {
    const app = await startApp();
    server = app.server;
    const admin = {
      id: "admin-1",
      email: "admin@example.com",
      name: "Admin",
      role: "admin",
    };
    mocks.storage.getAdminUserByEmail.mockResolvedValue(admin);
    mocks.adminBetterAuth.getBetterAuthUserByAdminId.mockResolvedValue({ id: "ba-1", adminUserId: "admin-1" });
    mocks.adminBetterAuth.requestAdminPasswordReset.mockRejectedValue(new Error("email down"));

    const response = await app.request("/api/admin/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "admin@example.com" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ success: true });
  });

  it("validates admin reset tokens through the admin Better Auth guard", async () => {
    const app = await startApp();
    server = app.server;
    mocks.adminBetterAuth.validateAdminPasswordResetToken.mockResolvedValue(true);

    const response = await app.request("/api/admin/validate-reset-token?token=reset-token");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ valid: true });
    expect(mocks.adminBetterAuth.validateAdminPasswordResetToken).toHaveBeenCalledWith("reset-token");
  });

  it("resets an admin password and returns the serialized admin", async () => {
    const app = await startApp();
    server = app.server;
    const admin = {
      id: "admin-1",
      email: "admin@example.com",
      name: "Admin",
      role: "admin",
    };
    mocks.adminBetterAuth.resetAdminPasswordAndCreateSession.mockResolvedValue({
      admin,
      signIn: { response: { user: { id: "ba-1" } }, headers: new Headers() },
    });

    const response = await app.request("/api/admin/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: "reset-token", password: "newpass123" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.adminBetterAuth.resetAdminPasswordAndCreateSession).toHaveBeenCalledWith(expect.anything(), {
      token: "reset-token",
      newPassword: "newpass123",
    });
    expect(body).toMatchObject({ success: true, admin: { id: "admin-1", email: "admin@example.com" } });
  });

  it("rejects invalid admin reset payloads", async () => {
    const app = await startApp();
    server = app.server;

    const response = await app.request("/api/admin/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: "reset-token", password: "short" }),
    });

    expect(response.status).toBe(400);
    expect(mocks.adminBetterAuth.resetAdminPasswordAndCreateSession).not.toHaveBeenCalled();
  });
});
