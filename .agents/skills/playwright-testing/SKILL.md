---
name: playwright-testing
description: Run Playwright end-to-end tests against the Power Plunge app, including authenticated admin, customer, and affiliate flows.
---

# Playwright Testing

## Quick Start

```bash
npm run seed:dev-users -- --confirm   # seed test users (see Prerequisites)
npm run dev                            # start server on runtime default port
npm run test:e2e                       # run all Playwright tests
```

## Available npm Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `test:e2e` | `npx playwright test` | Run all Playwright tests |
| `test:unit` | `vitest run` | Run all Vitest unit tests |
| `test` | `vitest run` | Alias for unit tests |
| `ci:check` | typecheck + doctor + schema verify + unit tests | Full CI validation |
| `seed:dev-users` | seed test users | Requires `-- --confirm` flag |

## Infrastructure

| File | Purpose |
|------|---------|
| `playwright.config.ts` | Base config: chromium, 1280x720. Base URL defaults to `:5000` on Replit and `:5001` locally (overridable with `E2E_PORT` / `E2E_BASE_URL`). Projects: `setup` (auth) → `chromium` (tests) |
| `e2e/auth.setup.ts` | Auth setup project — logs in as admin, customer, and affiliate, saves `storageState` to `e2e/.auth/` |
| `e2e/global-setup.ts` | Auto-seeds test users before every Playwright run |
| `e2e/fixtures.ts` | Extended `test` with `adminPage`, `customerPage`, and `affiliatePage` fixtures (pre-authenticated via storageState) |
| `e2e/helpers/auth.ts` | `loginAsAdmin()`, `loginAsCustomer()`, `loginAsAffiliate()` — manual login helpers for standalone use |
| `e2e/helpers/test-data.ts` | `uniqueEmail()`, `uniqueName()`, `uniqueCode()`, `uniqueProductName()` |
| `e2e/helpers/api.ts` | `adminLogin()`, `createProduct()`, `deleteProduct()`, `listPublicProducts()`, `customerLogin()` — API utilities for test data setup |
| `e2e/smoke.spec.ts` | Basic smoke tests (homepage + admin login page) |
| `e2e/admin-auth.spec.ts` | Admin login/auth tests |
| `e2e/customer-auth.spec.ts` | Customer login/auth tests |
| `e2e/affiliate-portal.spec.ts` | Affiliate portal access tests |
| `e2e/shop.spec.ts` | Shop page, product detail, add-to-cart, quantity controls |
| `e2e/admin-products.spec.ts` | Admin product CRUD (create, edit, delete) |
| `e2e/cart-checkout.spec.ts` | Cart and checkout flow tests |

## Prerequisites

### 1. Seed test users

```bash
npm run seed:dev-users -- --confirm
```

This creates the following accounts (idempotent — safe to run repeatedly):

| Email                  | Role / Type        |
|------------------------|--------------------|
| admin@test.com         | admin              |
| manager@test.com       | store_manager      |
| fulfillment@test.com   | fulfillment        |
| affiliate@test.com     | affiliate customer |
| customer@test.com      | customer           |

Password for all accounts: value of `SEED_TEST_PASSWORD` env var, or `testpass123` if unset.

The seed script **refuses to run** when `NODE_ENV=production`.

> **Auto-seed:** `e2e/global-setup.ts` runs the seed automatically before every `npx playwright test` invocation. Manual seeding is only needed when running tests outside Playwright, or if auto-seed fails (e.g. database connectivity issues).

### 2. Ensure the dev server is running

```bash
npm run dev
```

The server binds to `0.0.0.0` and defaults to:

- Replit: `:5000`
- Local/Codex: `:5001`

The Playwright config has `webServer.reuseExistingServer: true`, so it will use an already-running server.

### 3. Local/Codex auth mode

For local/Codex E2E runs, enable dev auth so admin session routes are available:

```bash
ENABLE_DEV_AUTH=true npx playwright test
```

## Auth Architecture

Three login flows exist, each producing a different session mechanism. For the specific selectors used in each flow, see **Key data-testid Selectors** below.

### Admin login (cookie-based)

- Page: `/admin/login`
- POST `/api/admin/login` with `{ email, password }`
- Session cookie is set automatically
- Redirects to `/admin/dashboard`

### Customer login (token-based)

- Page: `/login`
- POST `/api/customer/auth/login` with `{ email, password }`
- Returns a Bearer token stored in localStorage

### Affiliate login

- Same as customer login, using `affiliate@test.com`

### StorageState (recommended for tests)

The `setup` project in `playwright.config.ts` runs `e2e/auth.setup.ts` before any test. It logs in as admin, customer, and affiliate via the UI, then saves the browser state (cookies, localStorage) to `e2e/.auth/*.json`.

The fixture-based `test` in `e2e/fixtures.ts` creates new browser contexts with the saved storage state, so tests start already authenticated — no login UI flow needed.

Files saved:
- `e2e/.auth/admin.json` — admin session cookie
- `e2e/.auth/customer.json` — customer Bearer token in localStorage
- `e2e/.auth/affiliate.json` — affiliate Bearer token in localStorage

## Using Fixtures

For tests requiring pre-authenticated sessions, use the extended `test` from `e2e/fixtures.ts`:

```typescript
import { test, expect } from "../fixtures";

test("admin can view dashboard", async ({ adminPage }) => {
  await adminPage.goto("/admin/dashboard");
  await expect(adminPage.locator("h1")).toContainText("Dashboard");
});

test("customer can view orders", async ({ customerPage }) => {
  await customerPage.goto("/my-account");
  await expect(customerPage.locator("h1")).toBeVisible();
});

test("affiliate can view portal", async ({ affiliatePage }) => {
  await affiliatePage.goto("/affiliate-portal");
  await expect(affiliatePage).toHaveURL(/\/affiliate-portal/);
});
```

## Using API Helpers

For setting up test data via API calls (faster than UI clicks), use `e2e/helpers/api.ts`:

```typescript
import { createProduct, deleteProduct } from "./helpers/api";

test.describe("My tests", () => {
  let product: { id: string; name: string; urlSlug: string };

  test.beforeAll(async ({ request }) => {
    product = await createProduct(request, {
      name: "My Test Product",
      price: 9999,
      urlSlug: `test-${Date.now()}`,
    });
  });

  test.afterAll(async ({ request }) => {
    if (product?.id) {
      await deleteProduct(request, product.id);
    }
  });

  test("product appears on shop page", async ({ page }) => {
    await page.goto("/shop");
    await expect(page.locator(`text=${product.name}`)).toBeVisible();
  });
});
```

## Test Data Isolation

Use helpers from `e2e/helpers/test-data.ts` for unique test resources:

```typescript
import { uniqueEmail, uniqueCode } from "../helpers/test-data";

const email = uniqueEmail();  // "test-a1b2c3d4@example.com"
const code = uniqueCode();    // "TESTA1B2C3D4"
```

## Test Tagging

Tests use tags in `test.describe` names for filtering:

| Tag | Scope |
|-----|-------|
| `@smoke` | Basic app health checks |
| `@admin` | Admin panel features |
| `@customer` | Customer-facing features |
| `@affiliate` | Affiliate portal features |

### Running tagged subsets

```bash
npx playwright test --grep @smoke        # smoke tests only
npx playwright test --grep @admin        # admin tests only
npx playwright test --grep @customer     # customer tests only
npx playwright test --grep @affiliate    # affiliate tests only
npx playwright test --grep "@admin|@customer"  # multiple tags
```

## Key data-testid Selectors

### Admin Login (`/admin/login`)

- `[data-testid="input-email"]` — admin email field
- `[data-testid="input-password"]` — admin password field
- `[data-testid="button-submit"]` — login submit button

### Customer / Affiliate Login (`/login`)

> **Note:** The customer login page uses `id` selectors, not `data-testid` attributes.

- `#login-email` — email field
- `#login-password` — password field
- `form button[type="submit"]` — login submit button

### Admin Products (`/admin/products`)

- `[data-testid="button-add-product"]` — open new product panel
- `[data-testid="product-card-{id}"]` — product card in list
- `[data-testid="input-product-name"]`, `[data-testid="input-product-price"]`, `[data-testid="input-product-tagline"]`, `[data-testid="input-product-description"]`
- `[data-testid="button-save"]`, `[data-testid="button-save-close"]`, `[data-testid="button-cancel"]`
- `[data-testid="button-edit-{id}"]`, `[data-testid="button-delete-{id}"]`
- `[data-testid="select-status"]`, `[data-testid="switch-product-active"]`

### Shop Page (`/shop`)

- `[data-testid="product-card-{id}"]` — product card
- `[data-testid="add-to-cart-{id}"]` — add to cart from shop

### Product Detail (`/products/{slug}`)

- `[data-testid="text-product-name"]`, `[data-testid="text-product-price"]`, `[data-testid="text-product-tagline"]`
- `[data-testid="text-product-description"]`
- `[data-testid="text-feature-{idx}"]`, `[data-testid="text-included-{idx}"]`
- `[data-testid="button-add-to-cart"]`, `[data-testid="text-quantity"]`
- `[data-testid="button-quantity-increase"]`, `[data-testid="button-quantity-decrease"]`
- `[data-testid="button-cart"]`

### Checkout (`/checkout`)

> **Note:** The checkout `input-email` and `input-phone` testids are scoped to the checkout page and are distinct from the admin login `input-email` — they will not conflict because they live on different routes.

- `[data-testid="input-email"]` — customer email for order
- `[data-testid="input-phone"]` — customer phone for order
- `[data-testid="button-continue-to-payment"]`, `[data-testid="button-edit-shipping"]`
- `[data-testid="cart-item-{id}"]` — cart line item
- `[data-testid="text-qty-{id}"]`, `[data-testid="button-increase-{id}"]`, `[data-testid="button-decrease-{id}"]`
- `[data-testid="button-remove-{id}"]`
- `[data-testid="error-email"]`, `[data-testid="error-phone"]`, `[data-testid="error-shipping-address"]`

## Writing Test Plans

When writing a Playwright test plan for `run_test`:

1. Always start with `[New Context] Create a new browser context`
2. For admin flows, log in via `/admin/login` before testing
3. For customer flows, log in via `/login` before testing
4. Use `data-testid` attributes for element selection where available (customer login uses `id` selectors — see above)
5. Generate unique values for any created resources to avoid collisions
6. Clean up created resources in `afterAll` or `afterEach`

## Common Test Patterns

### Admin product CRUD

```
1. [New Context] Create a new browser context
2. [Browser] Navigate to /admin/login
3. [Browser] Fill [data-testid="input-email"] with "admin@test.com"
4. [Browser] Fill [data-testid="input-password"] with "testpass123"
5. [Browser] Click [data-testid="button-submit"]
6. [Verify] Assert redirect to /admin/dashboard
7. [Browser] Navigate to /admin/products
8. [Browser] Click [data-testid="button-add-product"]
9. [Browser] Fill [data-testid="input-product-name"] with a unique product name
10. [Browser] Fill [data-testid="input-product-price"] with "1999"
11. [Browser] Click [data-testid="button-save-close"]
12. [Verify] Assert the new product appears in the product list
```

### Shop browse and add to cart

```
1. [New Context] Create a new browser context
2. [API] Create a test product via POST /api/admin/products (requires admin login first)
3. [Browser] Navigate to /shop
4. [Verify] Assert at least one product card is visible
5. [Browser] Click on the test product card
6. [Verify] Assert redirect to /products/{slug}
7. [Verify] Assert product name, price, and features are visible
8. [Browser] Click [data-testid="button-add-to-cart"]
9. [Verify] Assert cart button is visible
```

### Checkout validation

```
1. [New Context] Create a new browser context
2. [API] Create a test product
3. [Browser] Navigate to /products/{slug}
4. [Browser] Click [data-testid="button-add-to-cart"]
5. [Browser] Navigate to /checkout
6. [Verify] Assert cart item is displayed
7. [Browser] Click [data-testid="button-continue-to-payment"] without filling fields
8. [Verify] Assert validation errors appear for required fields
```

### Admin dashboard smoke test

```
1. [New Context] Create a new browser context
2. [Browser] Navigate to /admin/login
3. [Browser] Fill [data-testid="input-email"] with "admin@test.com"
4. [Browser] Fill [data-testid="input-password"] with "testpass123"
5. [Browser] Click [data-testid="button-submit"]
6. [Verify] Assert redirect to /admin/dashboard
7. [Verify] Assert dashboard metrics are visible
```

### Customer order history

```
1. [New Context] Create a new browser context
2. [Browser] Navigate to /login
3. [Browser] Fill #login-email with "customer@test.com"
4. [Browser] Fill #login-password with "testpass123"
5. [Browser] Click form button[type="submit"]
6. [Verify] Assert redirect to customer dashboard
7. [Browser] Navigate to order history
8. [Verify] Assert at least one order is displayed
```

## Troubleshooting

If auth-dependent tests fail at the login step with a 401 response:

1. Verify the dev server is running on port 5000 (`npm run dev`)
2. Re-seed test users: `npm run seed:dev-users -- --confirm`
3. Check that auto-seed in `e2e/global-setup.ts` completed without errors (look for seed output in Playwright logs)
4. Re-run the failing test
