import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";

const mocks = vi.hoisted(() => ({
  attachCustomerAuthContext: vi.fn(),
  getCustomerAuthContext: vi.fn(),
}));

vi.mock("../../auth/customerBetterAuth", () => mocks);

const { requireCustomerAuth } = await import("../customer-auth.middleware");

function createReqRes() {
  const req = {} as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

describe("customer auth middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without a Better Auth customer session", async () => {
    mocks.getCustomerAuthContext.mockResolvedValue(null);
    const { req, res, next } = createReqRes();

    await requireCustomerAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Authentication required" });
    expect(next).not.toHaveBeenCalled();
  });

  it("attaches customer context and continues for a valid Better Auth session", async () => {
    const context = { customer: { id: "cust-1", email: "customer@example.com" } };
    mocks.getCustomerAuthContext.mockResolvedValue(context);
    const { req, res, next } = createReqRes();

    await requireCustomerAuth(req, res, next);

    expect(mocks.attachCustomerAuthContext).toHaveBeenCalledWith(req, context);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 409 for merged customer accounts", async () => {
    const error = Object.assign(new Error("This account has been merged. Please use your primary account."), {
      statusCode: 409,
      mergedInto: "cust-primary",
    });
    mocks.getCustomerAuthContext.mockRejectedValue(error);
    const { req, res, next } = createReqRes();

    await requireCustomerAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      message: "This account has been merged. Please use your primary account.",
      mergedInto: "cust-primary",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 503 when Better Auth is not configured", async () => {
    mocks.getCustomerAuthContext.mockRejectedValue(new Error("Better Auth is not configured for customer authentication"));
    const { req, res, next } = createReqRes();

    await requireCustomerAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ message: "Better Auth is not configured for customer authentication" });
    expect(next).not.toHaveBeenCalled();
  });
});
