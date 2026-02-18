import { test, expect } from "@playwright/test";

test.describe("Cart & Checkout @customer", () => {
  test("can add product to cart from detail page and reach checkout", async ({
    page,
  }) => {
    const productsResp = await page.request.get(
      "http://localhost:5000/api/products",
    );
    const products = await productsResp.json();
    const product = products.find((p: { urlSlug: string }) => p.urlSlug);
    test.skip(!product, "No products with a URL slug available");

    await page.goto(`/products/${product.urlSlug}`);
    await expect(
      page.locator('[data-testid="text-product-name"]'),
    ).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid="button-add-to-cart"]').click();

    await page.goto("/checkout");
    await expect(page.locator(`text=${product.name}`)).toBeVisible({
      timeout: 10000,
    });
  });

  test("checkout shows cart items with quantity controls", async ({
    page,
  }) => {
    const productsResp = await page.request.get(
      "http://localhost:5000/api/products",
    );
    const products = await productsResp.json();
    const product = products.find((p: { urlSlug: string }) => p.urlSlug);
    test.skip(!product, "No products with a URL slug available");

    await page.goto("/");
    await page.evaluate(
      (p) => {
        const cart = [
          { id: p.id, name: p.name, price: p.price, quantity: 1, image: "" },
        ];
        localStorage.setItem("cart", JSON.stringify(cart));
      },
      product,
    );

    await page.goto("/checkout");
    const cartItem = page.locator(`[data-testid="cart-item-${product.id}"]`);
    await expect(cartItem).toBeVisible({ timeout: 10000 });

    const qtyDisplay = page.locator(
      `[data-testid="text-qty-${product.id}"]`,
    );
    await expect(qtyDisplay).toHaveText("1");

    await page
      .locator(`[data-testid="button-increase-${product.id}"]`)
      .click();
    await expect(qtyDisplay).toHaveText("2");

    await page
      .locator(`[data-testid="button-decrease-${product.id}"]`)
      .click();
    await expect(qtyDisplay).toHaveText("1");
  });

  test("checkout page renders with email and phone inputs", async ({
    page,
  }) => {
    const productsResp = await page.request.get(
      "http://localhost:5000/api/products",
    );
    const products = await productsResp.json();
    const product = products.find((p: { urlSlug: string }) => p.urlSlug);
    test.skip(!product, "No products with a URL slug available");

    await page.goto("/");
    await page.evaluate(
      (p) => {
        const cart = [
          { id: p.id, name: p.name, price: p.price, quantity: 1, image: "" },
        ];
        localStorage.setItem("cart", JSON.stringify(cart));
      },
      product,
    );

    await page.goto("/checkout");
    await expect(page.locator(`text=${product.name}`)).toBeVisible({
      timeout: 15000,
    });

    const emailInput = page.locator('[data-testid="input-email"]');
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    const phoneInput = page.locator('[data-testid="input-phone"]');
    await expect(phoneInput).toBeVisible();
  });
});
