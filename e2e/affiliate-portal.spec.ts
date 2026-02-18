import { test, expect } from "@playwright/test";

const AFFILIATE_EMAIL = "affiliate@test.com";
const AFFILIATE_PASSWORD = process.env.SEED_TEST_PASSWORD || "testpass123";

test.describe("Affiliate Portal", () => {
  test("affiliate can log in", async ({ page }) => {
    const responsePromise = page.waitForResponse(
      (resp) => resp.url().includes("/api/customer/auth/login") && resp.request().method() === "POST"
    );
    await page.goto("/login");
    await page.locator("#login-email").fill(AFFILIATE_EMAIL);
    await page.locator("#login-password").fill(AFFILIATE_PASSWORD);
    await page.locator('form button[type="submit"]').click();
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10000 });
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("affiliate portal page is accessible after login", async ({ page }) => {
    const responsePromise = page.waitForResponse(
      (resp) => resp.url().includes("/api/customer/auth/login") && resp.request().method() === "POST"
    );
    await page.goto("/login");
    await page.locator("#login-email").fill(AFFILIATE_EMAIL);
    await page.locator("#login-password").fill(AFFILIATE_PASSWORD);
    await page.locator('form button[type="submit"]').click();
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10000 });
    await page.goto("/affiliate-portal");
    await expect(page).toHaveURL(/\/affiliate-portal/);
    await expect(page.locator("body")).toBeVisible();
  });
});
