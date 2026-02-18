import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = "admin@test.com";
const ADMIN_PASSWORD = process.env.SEED_TEST_PASSWORD || "testpass123";

test.describe("Admin Authentication", () => {
  test("can log in with valid credentials", async ({ page }) => {
    await page.goto("/admin/login");
    await page.locator('[data-testid="input-email"]').fill(ADMIN_EMAIL);
    await page.locator('[data-testid="input-password"]').fill(ADMIN_PASSWORD);
    await page.locator('[data-testid="button-submit"]').click();
    await page.waitForURL(/\/admin\/(dashboard|orders)/, { timeout: 25000 });
    await expect(page).toHaveURL(/\/admin\//);
  });

  test("rejects invalid credentials", async ({ page }) => {
    const responsePromise = page.waitForResponse(
      (resp) => resp.url().includes("/api/admin/login") && resp.request().method() === "POST"
    );
    await page.goto("/admin/login");
    await page.locator('[data-testid="input-email"]').fill("wrong@test.com");
    await page.locator('[data-testid="input-password"]').fill("wrongpassword");
    await page.locator('[data-testid="button-submit"]').click();
    const response = await responsePromise;
    expect(response.status()).toBe(401);
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("admin dashboard is accessible after login", async ({ page }) => {
    await page.goto("/admin/login");
    await page.locator('[data-testid="input-email"]').fill(ADMIN_EMAIL);
    await page.locator('[data-testid="input-password"]').fill(ADMIN_PASSWORD);
    await page.locator('[data-testid="button-submit"]').click();
    await page.waitForURL(/\/admin\/(dashboard|orders)/, { timeout: 25000 });

    const meResponse = await page.request.get("/api/admin/me");
    expect(meResponse.status()).toBe(200);
    const meBody = await meResponse.json();
    expect(meBody.email).toBe(ADMIN_EMAIL);
  });
});
