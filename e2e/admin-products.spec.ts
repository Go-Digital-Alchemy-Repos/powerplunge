import { test, expect } from "./fixtures";

test.describe("Admin Product Management @admin", () => {
  const uid = Date.now().toString(36);
  const productName = `E2E Admin Product ${uid}`;

  test("admin can view product list", async ({ adminPage }) => {
    await adminPage.goto("/admin/products");
    await expect(adminPage.locator('[data-testid="button-add-product"]')).toBeVisible();
  });

  test("admin can create a new product", async ({ adminPage }) => {
    await adminPage.goto("/admin/products");
    await adminPage.locator('[data-testid="button-add-product"]').click();

    await adminPage.locator('[data-testid="input-product-name"]').fill(productName);
    await adminPage.locator('[data-testid="input-product-price"]').fill("1999");
    await adminPage.locator('[data-testid="input-product-tagline"]').fill("E2E test tagline");
    await adminPage.locator('[data-testid="input-product-description"]').fill("Created by E2E test");

    await adminPage.locator('[data-testid="button-save-close"]').click();

    await adminPage.waitForTimeout(2000);
    await expect(adminPage.locator(`text=${productName}`)).toBeVisible({ timeout: 10000 });
  });

  test("admin can edit a product", async ({ adminPage }) => {
    await adminPage.goto("/admin/products");
    await adminPage.waitForTimeout(1000);

    const productCard = adminPage.locator(`text=${productName}`).first();
    await expect(productCard).toBeVisible({ timeout: 10000 });
    await productCard.click();

    const nameInput = adminPage.locator('[data-testid="input-product-name"]');
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill(`${productName} Updated`);
    await adminPage.locator('[data-testid="button-save-close"]').click();

    await adminPage.waitForTimeout(2000);
    await expect(adminPage.locator(`text=${productName} Updated`)).toBeVisible({ timeout: 10000 });
  });

  test("admin can delete a product", async ({ adminPage }) => {
    await adminPage.goto("/admin/products");
    await adminPage.waitForTimeout(1000);

    const productCard = adminPage.locator(`text=${productName} Updated`).first();
    await expect(productCard).toBeVisible({ timeout: 10000 });

    const card = adminPage.locator('[data-testid^="product-card-"]').filter({ hasText: `${productName} Updated` });
    const deleteButton = card.locator('[data-testid^="button-delete-"]');

    adminPage.on("dialog", (dialog) => dialog.accept());
    await deleteButton.click();

    await adminPage.waitForTimeout(2000);
    await expect(adminPage.locator(`text=${productName} Updated`)).not.toBeVisible({ timeout: 10000 });
  });
});
