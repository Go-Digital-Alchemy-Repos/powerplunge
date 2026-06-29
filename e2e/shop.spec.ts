import { test, expect } from "./fixtures";
import { createE2EProductTracker } from "./helpers/api";

test.describe("Shop & Product Pages @customer", () => {
  const products = createE2EProductTracker();

  test.afterEach(async ({ request }) => {
    await products.cleanup(request);
  });

  test("shop page loads", async ({ page }) => {
    await page.goto("/shop");
    await expect(page.locator('[data-testid="button-cart"]')).toBeVisible();
  });

  test("created product is visible on detail page", async ({ page, request }) => {
    const product = await products.create(request);

    await page.goto(`/products/${product.urlSlug}`);
    await expect(page.locator('[data-testid="text-product-name"]')).toContainText(
      product.name,
      { timeout: 15000 },
    );
  });

  test("product detail quantity controls work", async ({ page, request }) => {
    const product = await products.create(request);

    await page.goto(`/products/${product.urlSlug}`);
    await expect(
      page.locator('[data-testid="text-product-name"]'),
    ).toBeVisible({ timeout: 15000 });

    const qtyText = page.locator('[data-testid="text-quantity"]');
    await expect(qtyText).toHaveText("1");
    await page.locator('[data-testid="button-quantity-increase"]').click();
    await expect(qtyText).toHaveText("2");
    await page.locator('[data-testid="button-quantity-decrease"]').click();
    await expect(qtyText).toHaveText("1");
  });

  test("add to cart works on product detail", async ({ page, request }) => {
    const product = await products.create(request);

    await page.goto(`/products/${product.urlSlug}`);
    await expect(
      page.locator('[data-testid="text-product-name"]'),
    ).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid="button-add-to-cart"]').click();
    await expect(
      page.locator('[data-testid="button-cart"]').first(),
    ).toBeVisible();
  });
});
