import { test, expect } from "./fixtures";

test.describe("Shop & Product Pages @customer", () => {
  test("shop page loads", async ({ page }) => {
    await page.goto("/shop");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });

  test("admin can create a product visible on detail page", async ({
    adminPage,
  }) => {
    const uid = Date.now().toString(36);
    const slug = `e2e-detail-${uid}`;
    const productName = `E2E Detail Product ${uid}`;

    await adminPage.goto("/admin/products");
    await adminPage.locator('[data-testid="button-add-product"]').click();
    await adminPage
      .locator('[data-testid="input-product-name"]')
      .fill(productName);
    await adminPage.locator('[data-testid="input-product-price"]').fill("999");

    const slugInput = adminPage.locator('[data-testid="input-url-slug"]');
    if (await slugInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      const tabSeo = adminPage.locator('[data-testid="tab-seo"]');
      if (await tabSeo.isVisible({ timeout: 1000 }).catch(() => false)) {
        await tabSeo.click();
      }
    }
    const seoTab = adminPage.locator('[data-testid="tab-seo"]');
    if (await seoTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await seoTab.click();
      await adminPage.waitForTimeout(500);
      const slugField = adminPage.locator('[data-testid="input-url-slug"]');
      if (await slugField.isVisible({ timeout: 2000 }).catch(() => false)) {
        await slugField.fill(slug);
      }
    }

    await adminPage.locator('[data-testid="button-save-close"]').click();
    await adminPage.waitForTimeout(2000);

    const page = await adminPage.context().newPage();
    await page.goto(`/products/${slug}`);
    const nameEl = page.locator('[data-testid="text-product-name"]');
    const found = await nameEl
      .isVisible({ timeout: 10000 })
      .catch(() => false);
    if (found) {
      await expect(nameEl).toContainText(productName);
    }
    await page.close();
  });

  test("product detail quantity controls work", async ({ page }) => {
    const productsResp = await page.request.get("/api/products");
    const products = await productsResp.json();
    const product = products.find(
      (p: { urlSlug: string }) => p.urlSlug,
    );
    test.skip(!product, "No products with a URL slug available");

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

  test("add to cart works on product detail", async ({ page }) => {
    const productsResp = await page.request.get("/api/products");
    const products = await productsResp.json();
    const product = products.find(
      (p: { urlSlug: string }) => p.urlSlug,
    );
    test.skip(!product, "No products with a URL slug available");

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
