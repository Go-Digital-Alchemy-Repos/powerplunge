#!/usr/bin/env npx tsx
import { and, eq, sql } from "drizzle-orm";
import { verifyPassword } from "better-auth/crypto";
import { db } from "../../server/db";
import { adminUsers, affiliates, affiliateAgreements, customers } from "../../shared/schema";
import { betterAuthAccount, betterAuthUser } from "../../shared/models/better-auth";
import { BETTER_AUTH_LEGACY_PASSWORD_PLACEHOLDER } from "../../server/src/auth/adminBetterAuth";
import { BETTER_AUTH_CUSTOMER_PASSWORD_PLACEHOLDER } from "../../server/src/auth/customerBetterAuth";
import { normalizeBetterAuthRole } from "../../shared/auth/roles";

type CheckResult = "PASS" | "FAIL";

let fail = 0;
let pass = 0;
const seedPassword = process.env.SEED_TEST_PASSWORD || "testpass123";

function check(result: CheckResult, message: string) {
  if (result === "PASS") pass++;
  else fail++;
  console.log(`${result}  ${message}`);
}

async function credentialPasswordMatches(userId: string) {
  const [account] = await db
    .select({ id: betterAuthAccount.id, password: betterAuthAccount.password })
    .from(betterAuthAccount)
    .where(
      and(
        eq(betterAuthAccount.userId, userId),
        eq(betterAuthAccount.providerId, "credential"),
        sql`${betterAuthAccount.password} IS NOT NULL`,
      ),
    )
    .limit(1);
  if (!account?.password) return false;
  return verifyPassword({ password: seedPassword, hash: account.password });
}

async function verifyAdmin(email: string, expectedRole: string) {
  const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
  check(admin ? "PASS" : "FAIL", `${email} admin row exists`);
  if (!admin) return;

  check(
    admin.password === BETTER_AUTH_LEGACY_PASSWORD_PLACEHOLDER ? "PASS" : "FAIL",
    `${email} admin row is Better Auth managed`,
  );

  const [user] = await db
    .select()
    .from(betterAuthUser)
    .where(eq(betterAuthUser.adminUserId, admin.id))
    .limit(1);
  check(user ? "PASS" : "FAIL", `${email} Better Auth user is linked to admin`);
  if (!user) return;

  check(user.email === email ? "PASS" : "FAIL", `${email} Better Auth email matches`);
  check(normalizeBetterAuthRole(user.role) === expectedRole ? "PASS" : "FAIL", `${email} Better Auth role is ${expectedRole}`);
  check(await credentialPasswordMatches(user.id) ? "PASS" : "FAIL", `${email} credential password matches seed password`);
}

async function verifyCustomer(email: string, label: string) {
  const [customer] = await db.select().from(customers).where(eq(customers.email, email)).limit(1);
  check(customer ? "PASS" : "FAIL", `${label} customer row exists`);
  if (!customer) return null;

  check(
    customer.passwordHash === BETTER_AUTH_CUSTOMER_PASSWORD_PLACEHOLDER ? "PASS" : "FAIL",
    `${label} customer row is Better Auth managed`,
  );

  const [user] = await db
    .select()
    .from(betterAuthUser)
    .where(eq(betterAuthUser.customerId, customer.id))
    .limit(1);
  check(user ? "PASS" : "FAIL", `${label} Better Auth user is linked to customer`);
  if (!user) return customer;

  check(user.email === email ? "PASS" : "FAIL", `${label} Better Auth email matches`);
  check(user.role === "customer" ? "PASS" : "FAIL", `${label} Better Auth role is customer`);
  check(await credentialPasswordMatches(user.id) ? "PASS" : "FAIL", `${label} credential password matches seed password`);
  return customer;
}

async function verifySeedAuthFixtures() {
  console.log("=== Seed Auth Fixture Verification ===\n");

  await verifyAdmin("admin@test.com", "admin");
  await verifyAdmin("manager@test.com", "store_manager");
  await verifyAdmin("fulfillment@test.com", "fulfillment");

  await verifyCustomer("customer@test.com", "customer@test.com");
  const affiliateCustomer = await verifyCustomer("affiliate@test.com", "affiliate@test.com");

  if (affiliateCustomer) {
    const [affiliate] = await db
      .select()
      .from(affiliates)
      .where(eq(affiliates.customerId, affiliateCustomer.id))
      .limit(1);
    check(affiliate ? "PASS" : "FAIL", "affiliate@test.com affiliate row exists");

    if (affiliate) {
      check(affiliate.status === "active" ? "PASS" : "FAIL", "affiliate@test.com affiliate status is active");
      check(affiliate.affiliateCode === "TESTFF" ? "PASS" : "FAIL", "affiliate@test.com affiliate code is TESTFF");

      const [agreement] = await db
        .select({ id: affiliateAgreements.id })
        .from(affiliateAgreements)
        .where(eq(affiliateAgreements.affiliateId, affiliate.id))
        .limit(1);
      check(agreement ? "PASS" : "FAIL", "affiliate@test.com agreement exists");
    }
  }

  console.log("");
  console.log(`PASS: ${pass}`);
  console.log(`FAIL: ${fail}`);
  process.exit(fail > 0 ? 1 : 0);
}

verifySeedAuthFixtures().catch((error) => {
  console.error("Seed auth fixture verification failed:", error);
  process.exit(1);
});
