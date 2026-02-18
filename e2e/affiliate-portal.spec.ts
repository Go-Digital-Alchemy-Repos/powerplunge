import { test, expect } from "@playwright/test";

const AFFILIATE_EMAIL = "affiliate@test.com";
const AFFILIATE_PASSWORD = process.env.SEED_TEST_PASSWORD || "testpass123";

test.describe("Affiliate Portal", () => {
  test("affiliate can log in", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#login-email").fill(AFFILIATE_EMAIL);
    await page.locator("#login-password").fill(AFFILIATE_PASSWORD);
    await page.locator('form button[type="submit"]').click();
    await page.waitForURL(/\/(my-account|account|dashboard|affiliate|\?)/, { timeout: 15000 });
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("affiliate portal page is accessible after login", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#login-email").fill(AFFILIATE_EMAIL);
    await page.locator("#login-password").fill(AFFILIATE_PASSWORD);
    await page.locator('form button[type="submit"]').click();
    await page.waitForURL(/\/(my-account|account|dashboard|affiliate|\?)/, { timeout: 15000 });
    await page.goto("/affiliate-portal");
    await expect(page.locator("body")).toBeVisible();
  });
});
