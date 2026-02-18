import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = "admin@test.com";
const ADMIN_PASSWORD = process.env.SEED_TEST_PASSWORD || "testpass123";

test.describe("Admin Authentication", () => {
  test("can log in with valid credentials", async ({ page }) => {
    await page.goto("/admin/login");
    await page.locator('[data-testid="input-email"]').fill(ADMIN_EMAIL);
    await page.locator('[data-testid="input-password"]').fill(ADMIN_PASSWORD);
    await page.locator('[data-testid="button-submit"]').click();
    await page.waitForURL(/\/admin\/(dashboard|orders)/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/admin\//);
  });

  test("rejects invalid credentials", async ({ page }) => {
    await page.goto("/admin/login");
    await page.locator('[data-testid="input-email"]').fill("wrong@test.com");
    await page.locator('[data-testid="input-password"]').fill("wrongpassword");
    await page.locator('[data-testid="button-submit"]').click();
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("admin dashboard is accessible after login", async ({ page }) => {
    await page.goto("/admin/login");
    await page.locator('[data-testid="input-email"]').fill(ADMIN_EMAIL);
    await page.locator('[data-testid="input-password"]').fill(ADMIN_PASSWORD);
    await page.locator('[data-testid="button-submit"]').click();
    await page.waitForURL(/\/admin\/(dashboard|orders)/, { timeout: 15000 });
    const heading = page.locator("h1, h2").first();
    await expect(heading).toBeVisible();
  });
});
