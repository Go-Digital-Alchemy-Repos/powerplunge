import {
  seedTestAdminUsers,
  seedTestAffiliateAccount,
  seedTestCustomerAccount,
} from "../server/seed";

export default async function globalSetup() {
  if (process.env.NODE_ENV === "production") {
    console.log("[E2E] Skipping seed in production");
    return;
  }

  try {
    console.log("[E2E] Seeding test data...");
    await seedTestAdminUsers();
    await seedTestAffiliateAccount();
    await seedTestCustomerAccount();
    console.log("[E2E] Seed complete");
  } catch (error) {
    console.error("[E2E] Seed failed:", error);
    throw error;
  }
}
