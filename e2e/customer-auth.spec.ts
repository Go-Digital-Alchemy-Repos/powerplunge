import { test, expect } from "@playwright/test";

const CUSTOMER_EMAIL = "customer@test.com";
const CUSTOMER_PASSWORD = process.env.SEED_TEST_PASSWORD || "testpass123";

test.describe("Customer Authentication", () => {
  test("customer login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("#login-email")).toBeVisible();
    await expect(page.locator("#login-password")).toBeVisible();
  });

  test("can log in with valid credentials", async ({ page }) => {
    const responsePromise = page.waitForResponse(
      (resp) => resp.url().includes("/api/customer/auth/login") && resp.request().method() === "POST"
    );
    await page.goto("/login");
    await page.locator("#login-email").fill(CUSTOMER_EMAIL);
    await page.locator("#login-password").fill(CUSTOMER_PASSWORD);
    await page.locator('form button[type="submit"]').click();
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10000 });
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("rejects invalid credentials", async ({ page }) => {
    const responsePromise = page.waitForResponse(
      (resp) => resp.url().includes("/api/customer/auth/login") && resp.request().method() === "POST"
    );
    await page.goto("/login");
    await page.locator("#login-email").fill("nobody@test.com");
    await page.locator("#login-password").fill("wrongpassword");
    await page.locator('form button[type="submit"]').click();
    const response = await responsePromise;
    expect(response.status()).toBe(401);
    await expect(page).toHaveURL(/\/login/);
  });
});
