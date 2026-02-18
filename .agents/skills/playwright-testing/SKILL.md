---
name: playwright-testing
description: Run Playwright end-to-end tests against the Power Plunge app, including authenticated admin, customer, and affiliate flows.
---

# Playwright Testing

## Quick Start

```bash
npm run seed:dev-users -- --confirm   # seed test users (idempotent)
npm run dev                            # start server on :5000
npm run test:e2e                       # run all Playwright tests
```

## Infrastructure

| File | Purpose |
|------|---------|
| `playwright.config.ts` | Base config: chromium, 1280x720, baseURL localhost:5000 |
| `e2e/global-setup.ts` | Auto-seeds test users before every Playwright run |
| `e2e/fixtures.ts` | Extended `test` with `adminPage` and `customerPage` fixtures |
| `e2e/helpers/auth.ts` | `loginAsAdmin()`, `loginAsCustomer()`, `loginAsAffiliate()` |
| `e2e/helpers/test-data.ts` | `uniqueEmail()`, `uniqueName()`, `uniqueCode()`, `uniqueProductName()` |
| `e2e/smoke.spec.ts` | Basic smoke tests (homepage + admin login page) |

## Prerequisites

Before running any Playwright test that exercises authenticated flows, the development database **must** contain deterministic test users.

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

The `globalSetup` in `e2e/global-setup.ts` also auto-seeds before every `npx playwright test` run, so manual seeding is only needed if you run tests outside Playwright.

### 2. Ensure the dev server is running

```bash
npm run dev
```

The server binds to `0.0.0.0:5000`. The Playwright config has `webServer.reuseExistingServer: true`, so it will use an already-running server.

## Auth Flow Details

### Admin login

- Page: `/admin/login`
- Selectors: `[data-testid="input-email"]`, `[data-testid="input-password"]`, `[data-testid="button-submit"]`
- POST `/api/admin/login` with `{ email, password }`
- Session cookie is set automatically
- Redirects to `/admin/dashboard`

### Customer login

- Page: `/login`
- Selectors: `#login-email`, `#login-password`, `form button[type="submit"]`
- POST `/api/customer/login` with `{ email, password }`
- Returns a Bearer token stored in localStorage

### Affiliate login

- Same as customer login using `affiliate@test.com`

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
```

## Test Data Isolation

Use helpers from `e2e/helpers/test-data.ts` for unique test resources:

```typescript
import { uniqueEmail, uniqueCode } from "../helpers/test-data";

const email = uniqueEmail();  // "test-a1b2c3d4@example.com"
const code = uniqueCode();    // "TESTA1B2C3D4"
```

## Writing Test Plans

When writing a Playwright test plan for `run_test`:

1. Always start with `[New Context] Create a new browser context`
2. For admin flows, log in via the admin login page before testing
3. For customer flows, log in via the customer login page before testing
4. Use `data-testid` attributes for element selection where available
5. Generate unique values for any created resources to avoid collisions

## Failure Behavior

If seed users are missing, auth-dependent tests will fail at the login step with a 401 response. When this happens:

1. Run `npm run seed:dev-users -- --confirm`
2. Verify the server is running (`npm run dev`)
3. Re-run the test

## Available npm Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `test:e2e` | `npx playwright test` | Run all Playwright tests |
| `test:unit` | `vitest run` | Run all Vitest unit tests |
| `test` | `vitest run` | Alias for unit tests |
| `ci:check` | typecheck + doctor + schema verify + unit tests | Full CI validation |
| `seed:dev-users` | seed test users | Requires `-- --confirm` flag |

## Common Test Patterns

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
