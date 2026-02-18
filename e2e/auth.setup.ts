import { test as setup, expect } from "@playwright/test";
import { ADMIN_STATE, CUSTOMER_STATE, AFFILIATE_STATE } from "./auth-paths";

const ADMIN_EMAIL = "admin@test.com";
const CUSTOMER_EMAIL = "customer@test.com";
const AFFILIATE_EMAIL = "affiliate@test.com";
const PASSWORD = process.env.SEED_TEST_PASSWORD || "testpass123";

setup("authenticate as admin", async ({ page }) => {
  await page.goto("/admin/login");
  await page.locator('[data-testid="input-email"]').fill(ADMIN_EMAIL);
  await page.locator('[data-testid="input-password"]').fill(PASSWORD);
  await page.locator('[data-testid="button-submit"]').click();
  await page.waitForURL(/\/admin\/(dashboard|orders)/, { timeout: 25000 });
  await expect(page).toHaveURL(/\/admin\//);
  await page.context().storageState({ path: ADMIN_STATE });
});

setup("authenticate as customer", async ({ page }) => {
  await page.goto("/login");
  await page.locator("#login-email").fill(CUSTOMER_EMAIL);
  await page.locator("#login-password").fill(PASSWORD);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 10000,
  });
  await page.context().storageState({ path: CUSTOMER_STATE });
});

setup("authenticate as affiliate", async ({ page }) => {
  await page.goto("/login");
  await page.locator("#login-email").fill(AFFILIATE_EMAIL);
  await page.locator("#login-password").fill(PASSWORD);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 10000,
  });
  await page.context().storageState({ path: AFFILIATE_STATE });
});
