import type { Page } from "@playwright/test";

const DEFAULT_PASSWORD = process.env.SEED_TEST_PASSWORD || "testpass123";

export async function loginAsAdmin(
  page: Page,
  email = "admin@test.com",
  password = DEFAULT_PASSWORD,
) {
  await page.goto("/admin/login");
  await page.locator('[data-testid="input-email"]').fill(email);
  await page.locator('[data-testid="input-password"]').fill(password);
  await page.locator('[data-testid="button-submit"]').click();
  await page.waitForURL(/\/admin\/(dashboard|orders)/);
}

export async function loginAsCustomer(
  page: Page,
  email = "customer@test.com",
  password = DEFAULT_PASSWORD,
) {
  await page.goto("/login");
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(/\/(my-account|account|dashboard|\?)/);
}

export async function loginAsAffiliate(
  page: Page,
  email = "affiliate@test.com",
  password = DEFAULT_PASSWORD,
) {
  await loginAsCustomer(page, email, password);
}
