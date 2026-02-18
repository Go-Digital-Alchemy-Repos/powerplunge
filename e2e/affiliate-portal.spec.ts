import { test, expect } from "./fixtures";

test.describe("Affiliate Portal @affiliate", () => {
  test("affiliate portal page is accessible", async ({ affiliatePage }) => {
    await affiliatePage.goto("/affiliate-portal");
    await expect(affiliatePage).toHaveURL(/\/affiliate-portal/);
    await expect(affiliatePage.locator("body")).toBeVisible();
  });
});
