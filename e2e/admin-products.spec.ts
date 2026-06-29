import { test, expect } from "./fixtures";
import { createE2EProductTracker } from "./helpers/api";

test.describe("Admin Product Management @admin", () => {
  const products = createE2EProductTracker();

  test.afterEach(async ({ request }) => {
    await products.cleanup(request);
  });

  test("admin can view product list", async ({ adminPage }) => {
    await adminPage.goto("/admin/products");
    await expect(adminPage.locator('[data-testid="button-add-product"]')).toBeVisible();
  });

  test("admin can create a new product", async ({ adminPage }) => {
    const uid = Date.now().toString(36);
    const productName = `E2E Admin Product ${uid}`;

    await adminPage.goto("/admin/products");
    await adminPage.locator('[data-testid="button-add-product"]').click();

    await adminPage.locator('[data-testid="input-product-name"]').fill(productName);
    await adminPage.locator('[data-testid="input-product-price"]').fill("1999");
    await adminPage.locator('[data-testid="input-product-tagline"]').fill("E2E test tagline");
    await adminPage.locator('[data-testid="input-product-description"]').fill("Created by E2E test");

    products.trackName(productName);
    await adminPage.locator('[data-testid="button-save-close"]').click();

    const productCard = adminPage
      .locator('[data-testid^="product-card-"]')
      .filter({ hasText: productName })
      .first();
    await expect(productCard).toBeVisible({ timeout: 10000 });

    const testId = await productCard.getAttribute("data-testid");
    if (!testId) {
      throw new Error(`Could not identify created product card for ${productName}`);
    }
    products.track(testId.replace("product-card-", ""));
  });

  test("admin can edit a product", async ({ adminPage, request }) => {
    const product = await products.create(request, {
      name: `E2E Admin Editable ${Date.now().toString(36)}`,
    });
    const updatedName = `${product.name} Updated`;

    await adminPage.goto("/admin/products");

    const productCard = adminPage.locator(`[data-testid="product-card-${product.id}"]`);
    await expect(productCard).toBeVisible({ timeout: 10000 });
    await productCard.locator(`[data-testid="button-edit-${product.id}"]`).click();

    const nameInput = adminPage.locator('[data-testid="input-product-name"]');
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill(updatedName);
    await adminPage.locator('[data-testid="button-save-close"]').click();

    await expect(adminPage.locator(`text=${updatedName}`)).toBeVisible({ timeout: 10000 });
  });

  test("admin can delete a product", async ({ adminPage, request }) => {
    const product = await products.create(request, {
      name: `E2E Admin Deletable ${Date.now().toString(36)}`,
    });

    await adminPage.goto("/admin/products");

    const productCard = adminPage.locator(`[data-testid="product-card-${product.id}"]`);
    await expect(productCard).toBeVisible({ timeout: 10000 });

    const deleteButton = productCard.locator(`[data-testid="button-delete-${product.id}"]`);

    adminPage.on("dialog", (dialog) => dialog.accept());
    await deleteButton.click();

    await expect(productCard).not.toBeVisible({ timeout: 10000 });
    await products.cleanup(request);
  });
});
