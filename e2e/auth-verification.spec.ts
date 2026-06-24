import { test, expect } from "./fixtures";
import { uniqueEmail, uniqueName } from "./helpers/test-data";

const CUSTOMER_EMAIL = "customer@test.com";
const CUSTOMER_PHONE = "(555) 123-4567";

test.describe("Better Auth verification flows @customer @affiliate", () => {
  test("seeded customer can access account, support, and logout", async ({ customerPage }) => {
    await customerPage.goto("/my-account?tab=account");
    await expect(customerPage.locator('[data-testid="text-account-title"]')).toBeVisible({ timeout: 15000 });
    await expect(customerPage.locator('[data-testid="input-email"]')).toHaveValue(CUSTOMER_EMAIL);

    await customerPage.locator('[data-testid="tab-support"]').click();
    await expect(customerPage.locator('[data-testid="text-support-title"]')).toBeVisible();

    await customerPage.locator('[data-testid="button-logout"]').click();
    await customerPage.waitForURL(/\/login\?redirect=\/my-account/, { timeout: 10000 });
  });

  test("seeded affiliate can access portal links", async ({ affiliatePage }) => {
    await affiliatePage.goto("/affiliate-portal");
    await expect(affiliatePage.locator('[data-testid="text-affiliate-title"]')).toBeVisible({ timeout: 15000 });
    await expect(affiliatePage.locator('[data-testid="input-referral-link"]')).toHaveValue(/ref=TESTFF/);
    await expect(affiliatePage.locator('[data-testid="text-ff-code"]')).toContainText("FFTESTFF");
  });

  test("authenticated checkout prefills seeded customer identity", async ({ customerPage }) => {
    const productsResp = await customerPage.request.get("/api/products");
    const products = await productsResp.json();
    const product = products.find((p: { id: string; urlSlug?: string }) => p.urlSlug);
    test.skip(!product, "No products with a URL slug available");

    await customerPage.goto("/");
    await customerPage.evaluate((p) => {
      localStorage.setItem("cart", JSON.stringify([
        { id: p.id, name: p.name, price: p.price, quantity: 1, image: "" },
      ]));
    }, product);

    await customerPage.goto("/checkout");
    await expect(customerPage.locator('[data-testid="input-email"]')).toHaveValue(CUSTOMER_EMAIL);
    await expect(customerPage.locator('[data-testid="input-phone"]')).toHaveValue(CUSTOMER_PHONE);
  });
});

test.describe("Better Auth registration @customer", () => {
  test("new customer can register with cookie session and no legacy token", async ({ page }) => {
    const email = uniqueEmail();
    const name = uniqueName();
    const password = "RegisterFlow123!";

    const registerResponse = page.waitForResponse((response) =>
      response.url().includes("/api/customer/auth/register") &&
      response.request().method() === "POST",
    );

    await page.goto("/register");
    await page.locator('[data-testid="input-name"]').fill(name);
    await page.locator('[data-testid="input-email"]').fill(email);
    await page.locator('[data-testid="input-password"]').fill(password);
    await page.locator('[data-testid="input-confirm-password"]').fill(password);
    await page.locator('[data-testid="button-create-account"]').click();

    const response = await registerResponse;
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ success: true, customer: { email } });
    expect(body.sessionToken).toBeUndefined();

    const meResponse = await page.request.get("/api/customer/auth/me");
    expect(meResponse.status()).toBe(200);
    const me = await meResponse.json();
    expect(me.email).toBe(email);
  });
});
