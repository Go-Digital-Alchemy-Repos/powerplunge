import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  abandonedCarts,
  failedPayments,
  metaCapiEvents,
  orders,
  refunds,
  supportTickets,
  vipActivityLog,
} from "@shared/schema";

const mockFindById = vi.fn();
const mockGetOrdersByCustomerId = vi.fn();
const mockTransaction = vi.fn();

vi.mock("../../db/repositories/customers.repo", () => ({
  customersRepository: {
    findById: (...args: any[]) => mockFindById(...args),
    getOrdersByCustomerId: (...args: any[]) => mockGetOrdersByCustomerId(...args),
  },
}));

vi.mock("../../../db", () => ({
  db: {
    transaction: (...args: any[]) => mockTransaction(...args),
  },
}));

import { customersService } from "../customers.service";

describe("customersService.deleteCustomer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes FK-dependent records before refunds and orders", async () => {
    mockFindById.mockResolvedValue({ id: "cust_1" });
    mockGetOrdersByCustomerId.mockResolvedValue([{ id: "ord_1" }]);

    const state = {
      metaDeletes: 0,
      supportByOrderDeleted: false,
      vipActivityByOrderDeleted: false,
      abandonedByRecoveredOrderDeleted: false,
      failedByOrderDeleted: false,
    };

    const tx = {
      select: vi.fn(() => ({
        from: vi.fn((table) => ({
          where: vi.fn(async () => {
            if (table === refunds) return [{ id: "ref_1" }];
            return [];
          }),
        })),
      })),
      delete: vi.fn((table) => ({
        where: vi.fn(async () => {
          if (table === metaCapiEvents) state.metaDeletes += 1;
          if (table === supportTickets) state.supportByOrderDeleted = true;
          if (table === vipActivityLog) state.vipActivityByOrderDeleted = true;
          if (table === abandonedCarts) state.abandonedByRecoveredOrderDeleted = true;
          if (table === failedPayments) state.failedByOrderDeleted = true;

          // Simulate FK from meta_capi_events.refund_id -> refunds.id
          if (table === refunds && state.metaDeletes < 2) {
            throw new Error("FK violation: meta_capi_events.refund_id");
          }

          // Simulate FK dependents that must be deleted before orders
          if (table === orders) {
            if (
              !state.supportByOrderDeleted ||
              !state.vipActivityByOrderDeleted ||
              !state.abandonedByRecoveredOrderDeleted ||
              !state.failedByOrderDeleted
            ) {
              throw new Error("FK violation: order dependents still exist");
            }
          }
        }),
      })),
    };

    mockTransaction.mockImplementation(async (cb: (tx: typeof tx) => Promise<void>) => cb(tx));

    await expect(customersService.deleteCustomer("cust_1")).resolves.toBeUndefined();
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it("throws NotFoundError when customer does not exist", async () => {
    mockFindById.mockResolvedValue(undefined);

    await expect(customersService.deleteCustomer("missing_customer")).rejects.toThrow("Customer not found");
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});

