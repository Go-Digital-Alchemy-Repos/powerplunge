#!/usr/bin/env npx tsx

if (process.env.NODE_ENV === "production") {
  console.error("[SEED] Refusing to seed test users in production. Aborting.");
  process.exit(1);
}

if (!process.argv.includes("--confirm")) {
  console.error(
    "[SEED] This script creates test users in the database.\n" +
    "       Pass --confirm to proceed.\n\n" +
    "       Usage:  npm run seed:dev-users -- --confirm\n"
  );
  process.exit(1);
}

(async () => {
  const { seedTestAdminUsers, seedTestAffiliateAccount, seedTestCustomerAccount } =
    await import("../server/seed");

  await seedTestAdminUsers();
  await seedTestAffiliateAccount();
  await seedTestCustomerAccount();

  const pw = process.env.SEED_TEST_PASSWORD ? "(from SEED_TEST_PASSWORD)" : "(default)";
  console.log(`\n[SEED] Done. Password source: ${pw}`);
  console.log("[SEED] Test accounts:");
  console.log("  admin@test.com        (admin)");
  console.log("  manager@test.com      (store_manager)");
  console.log("  fulfillment@test.com  (fulfillment)");
  console.log("  affiliate@test.com    (affiliate customer)");
  console.log("  customer@test.com     (customer)");
  process.exit(0);
})().catch((err) => {
  console.error("[SEED] Fatal error:", err);
  process.exit(1);
});
