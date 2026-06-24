import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";

const mocks = vi.hoisted(() => ({
  getAdminAuthContext: vi.fn(),
  attachAdminAuthContext: vi.fn(),
  serializeAdmin: vi.fn((admin: any) => admin),
}));

vi.mock("../../auth/adminBetterAuth", () => mocks);
vi.mock("../../integrations/replit/auth", () => ({ isAuthenticated: vi.fn() }));

const { requireAdmin, requireFullAccess, requireOrderAccess } = await import("../auth.middleware");

function createReqRes() {
  const req = { session: {} } as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

describe("admin auth middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without a Better Auth admin context", async () => {
    mocks.getAdminAuthContext.mockResolvedValue(null);
    const { req, res, next } = createReqRes();

    await requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("allows full access for admin roles", async () => {
    const context = { admin: { id: "admin-1", role: "admin" } };
    mocks.getAdminAuthContext.mockResolvedValue(context);
    const { req, res, next } = createReqRes();

    await requireFullAccess(req, res, next);

    expect(mocks.attachAdminAuthContext).toHaveBeenCalledWith(req, context);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("blocks fulfillment from full-access routes", async () => {
    mocks.getAdminAuthContext.mockResolvedValue({ admin: { id: "admin-1", role: "fulfillment" } });
    const { req, res, next } = createReqRes();

    await requireFullAccess(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Forbidden: Insufficient permissions" });
    expect(next).not.toHaveBeenCalled();
  });

  it("blocks fulfillment from generic admin routes", async () => {
    mocks.getAdminAuthContext.mockResolvedValue({ admin: { id: "admin-1", role: "fulfillment" } });
    const { req, res, next } = createReqRes();

    await requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("allows fulfillment for order-access routes", async () => {
    const context = { admin: { id: "admin-1", role: "fulfillment" } };
    mocks.getAdminAuthContext.mockResolvedValue(context);
    const { req, res, next } = createReqRes();

    await requireOrderAccess(req, res, next);

    expect(mocks.attachAdminAuthContext).toHaveBeenCalledWith(req, context);
    expect(next).toHaveBeenCalled();
  });

  it("returns 503 when Better Auth is not configured", async () => {
    mocks.getAdminAuthContext.mockRejectedValue(new Error("Better Auth is not configured for admin authentication"));
    const { req, res, next } = createReqRes();

    await requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ message: "Better Auth is not configured for admin authentication" });
    expect(next).not.toHaveBeenCalled();
  });
});
