import { test, expect } from "@playwright/test";

test("homepage loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Power Plunge/i);
});

test("admin login page loads", async ({ page }) => {
  await page.goto("/admin/login");
  await expect(
    page.locator('[data-testid="input-email"]'),
  ).toBeVisible();
});
