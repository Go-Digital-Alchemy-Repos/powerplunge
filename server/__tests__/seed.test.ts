import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  storage: {
    getCustomerByEmail: vi.fn(),
    getAffiliateByCustomerId: vi.fn(),
    getAffiliateAgreements: vi.fn(),
    createAffiliateAgreement: vi.fn(),
    createCustomer: vi.fn(),
    updateCustomer: vi.fn(),
    getOrdersByCustomerId: vi.fn(),
    getActiveProducts: vi.fn(),
    getAdminUserByEmail: vi.fn(),
    createAdminUser: vi.fn(),
    updateAdminUser: vi.fn(),
  },
  db: {
    select: vi.fn(),
  },
  syncBetterAuthCustomerUser: vi.fn(),
  syncBetterAuthAdminUser: vi.fn(),
}));

vi.mock("../storage", () => ({ storage: mocks.storage }));
vi.mock("../db", () => ({ db: mocks.db }));
vi.mock("../src/auth/customerBetterAuth", () => ({
  BETTER_AUTH_CUSTOMER_PASSWORD_PLACEHOLDER: "better-auth-managed",
  syncBetterAuthCustomerUser: mocks.syncBetterAuthCustomerUser,
}));
vi.mock("../src/auth/adminBetterAuth", () => ({
  BETTER_AUTH_LEGACY_PASSWORD_PLACEHOLDER: "better-auth-managed",
  syncBetterAuthAdminUser: mocks.syncBetterAuthAdminUser,
}));

const { seedTestAdminUsers, seedTestAffiliateAccount, seedTestCustomerAccount } = await import("../seed");

function mockAffiliateCodeLookup(row: unknown = undefined) {
  mocks.db.select.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue(Promise.resolve(row ? [row] : [])),
    }),
  });
}

describe("seed test auth fixtures", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, NODE_ENV: "development", SEED_TEST_PASSWORD: "SeedPass123!" };
    mocks.syncBetterAuthCustomerUser.mockResolvedValue(undefined);
    mocks.storage.updateCustomer.mockImplementation(async (id: string, data: Record<string, unknown>) => ({
      id,
      ...data,
    }));
    mocks.storage.getAffiliateAgreements.mockResolvedValue([]);
    mocks.storage.createAffiliateAgreement.mockResolvedValue({});
    mocks.storage.getActiveProducts.mockResolvedValue([]);
    mocks.storage.getOrdersByCustomerId.mockResolvedValue([]);
    mocks.syncBetterAuthAdminUser.mockResolvedValue(undefined);
    mocks.storage.updateAdminUser.mockImplementation(async (id: string, data: Record<string, unknown>) => ({
      id,
      email: "admin@test.com",
      ...data,
    }));
    mockAffiliateCodeLookup();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("marks existing seeded admins as Better Auth managed after syncing credentials", async () => {
    const admin = {
      id: "admin-1",
      email: "admin@test.com",
      password: "legacy-hash",
      firstName: "Old",
      lastName: "User",
      name: "Old User",
      role: "fulfillment",
    };
    mocks.storage.getAdminUserByEmail
      .mockResolvedValueOnce(admin)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    mocks.storage.createAdminUser.mockImplementation(async (input: Record<string, unknown>) => ({
      id: `created-${input.email}`,
      ...input,
    }));

    await seedTestAdminUsers();

    expect(mocks.storage.updateAdminUser).toHaveBeenCalledWith("admin-1", {
      password: "better-auth-managed",
      firstName: "Test",
      lastName: "Admin",
      name: "Test Admin",
      role: "admin",
    });
    expect(mocks.syncBetterAuthAdminUser).toHaveBeenCalledWith(expect.objectContaining({
      id: "admin-1",
      password: "better-auth-managed",
      role: "admin",
    }), "SeedPass123!");
  });

  it("syncs an existing customer before the existing-order early return", async () => {
    const customer = {
      id: "cust-1",
      email: "customer@test.com",
      name: "Test Customer",
      passwordHash: "legacy-hash",
    };
    mocks.storage.getCustomerByEmail.mockResolvedValue(customer);
    mocks.storage.getOrdersByCustomerId.mockResolvedValue([{ id: "order-1" }]);

    await seedTestCustomerAccount();

    expect(mocks.storage.updateCustomer).toHaveBeenCalledWith("cust-1", expect.objectContaining({
      phone: "(555) 123-4567",
      address: "123 Test Street",
    }));
    expect(mocks.syncBetterAuthCustomerUser).toHaveBeenCalledWith(expect.objectContaining({
      id: "cust-1",
      phone: "(555) 123-4567",
    }), "SeedPass123!");
    expect(mocks.storage.updateCustomer).toHaveBeenCalledWith("cust-1", { passwordHash: "better-auth-managed" });
    expect(mocks.storage.getActiveProducts).not.toHaveBeenCalled();
  });

  it("creates new customer fixtures as Better Auth managed and syncs credentials", async () => {
    const customer = {
      id: "cust-new",
      email: "customer@test.com",
      name: "Test Customer",
      passwordHash: "better-auth-managed",
    };
    mocks.storage.getCustomerByEmail.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    mocks.storage.createCustomer.mockResolvedValue(customer);

    await seedTestCustomerAccount();

    expect(mocks.storage.createCustomer).toHaveBeenCalledWith(expect.objectContaining({
      email: "customer@test.com",
      passwordHash: "better-auth-managed",
    }));
    expect(mocks.syncBetterAuthCustomerUser).toHaveBeenCalledWith(customer, "SeedPass123!");
  });

  it("syncs an existing affiliate customer before the existing-affiliate early return", async () => {
    const customer = {
      id: "cust-aff",
      email: "affiliate@test.com",
      name: "Test Affiliate",
      passwordHash: "legacy-hash",
    };
    const affiliate = { id: "aff-1", customerId: "cust-aff", affiliateCode: "TESTFF" };
    mocks.storage.getCustomerByEmail.mockResolvedValue(customer);
    mocks.storage.getAffiliateByCustomerId.mockResolvedValue(affiliate);

    await seedTestAffiliateAccount();

    expect(mocks.syncBetterAuthCustomerUser).toHaveBeenCalledWith(customer, "SeedPass123!");
    expect(mocks.storage.updateCustomer).toHaveBeenCalledWith("cust-aff", {
      passwordHash: "better-auth-managed",
    });
    expect(mocks.storage.createAffiliateAgreement).toHaveBeenCalledWith(expect.objectContaining({
      affiliateId: "aff-1",
      signatureName: "Test Affiliate",
    }));
  });
});
