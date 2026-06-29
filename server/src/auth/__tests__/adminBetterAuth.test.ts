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
    getAdminUser: vi.fn(),
  },
}));

vi.mock("../betterAuth", () => ({ auth: mocks.auth }));
vi.mock("../../../db", () => ({ db: mocks.db }));
vi.mock("../../../storage", () => ({ storage: mocks.storage }));

const {
  attachAdminAuthContext,
  attachAdminRequestAuth,
  serializeAdmin,
} = await import("../adminBetterAuth");

describe("admin Better Auth request seam", () => {
  it("attaches canonical admin auth and legacy compatibility fields", () => {
    const admin = serializeAdmin({
      id: "admin-1",
      email: "admin@example.com",
      name: "Admin User",
      firstName: "Admin",
      lastName: "User",
      phone: "555-0100",
      role: "superadmin",
      avatarUrl: "",
    } as any);
    const req = { session: {} } as Request;
    const betterAuthSession = {
      session: { id: "session-1", userId: "ba-1", token: "token", expiresAt: new Date() },
      user: { id: "ba-1", email: "admin@example.com", name: "Admin", adminUserId: "admin-1" },
    } as any;

    attachAdminRequestAuth(req, admin, { betterAuthSession });

    expect(req.adminAuth).toMatchObject({
      adminId: "admin-1",
      adminUser: admin,
      role: "super_admin",
      betterAuthSession,
    });
    expect(req.adminId).toBe("admin-1");
    expect(req.adminUser).toBe(admin);
    expect(req.betterAuthSession).toBe(betterAuthSession);
    expect(req.session).toMatchObject({
      adminId: "admin-1",
      adminRole: "super_admin",
      adminEmail: "admin@example.com",
      adminUser: admin,
    });
  });

  it("attaches an authenticated context through the same request seam", () => {
    const req = { session: {} } as Request;
    const betterAuthSession = {
      session: { id: "session-1", userId: "ba-1", token: "token", expiresAt: new Date() },
      user: { id: "ba-1", email: "admin@example.com", name: "Admin", adminUserId: "admin-1" },
    } as any;

    attachAdminAuthContext(req, {
      betterAuthSession,
      role: "store_manager",
      admin: {
        id: "admin-1",
        email: "admin@example.com",
        name: "Admin User",
        firstName: "Admin",
        lastName: "User",
        phone: null,
        role: "store_manager",
        avatarUrl: null,
      } as any,
    });

    expect(req.adminAuth).toMatchObject({
      adminId: "admin-1",
      role: "store_manager",
      betterAuthSession,
    });
    expect(req.session?.adminUser?.email).toBe("admin@example.com");
  });
});
