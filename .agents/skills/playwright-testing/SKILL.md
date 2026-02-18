---
name: playwright-testing
description: Run Playwright end-to-end tests against the Power Plunge app, including authenticated admin, customer, and affiliate flows.
---

# Playwright Testing

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

### 2. Ensure the dev server is running

```bash
npm run dev
```

The server binds to `0.0.0.0:5000`.

## Auth Flow Details

### Admin login

- Navigate to `/admin`
- POST `/api/admin/login` with `{ email, password }`
- Session cookie is set automatically

### Customer login

- Navigate to `/account/login`
- POST `/api/customer/login` with `{ email, password }`
- Returns a Bearer token stored in localStorage

### Affiliate login

- Same as customer login using the affiliate email

## Writing Test Plans

When writing a Playwright test plan for `run_test`:

1. Always start with `[New Context] Create a new browser context`
2. For admin flows, log in via the admin login page before testing
3. For customer flows, log in via the customer login page before testing
4. Use `data-testid` attributes for element selection where available
5. Generate unique values (e.g., `nanoid`) for any created resources to avoid collisions

## Failure Behavior

If seed users are missing, auth-dependent tests will fail at the login step with a 401 response. When this happens:

1. Run `npm run seed:dev-users -- --confirm`
2. Verify the server is running (`npm run dev`)
3. Re-run the test

## Common Test Patterns

### Admin dashboard smoke test

```
1. [New Context] Create a new browser context
2. [Browser] Navigate to /admin
3. [Browser] Fill email input with "admin@test.com"
4. [Browser] Fill password input with "testpass123"
5. [Browser] Click login button
6. [Verify] Assert redirect to /admin/dashboard
7. [Verify] Assert dashboard metrics are visible
```

### Customer order history

```
1. [New Context] Create a new browser context
2. [Browser] Navigate to /account/login
3. [Browser] Fill email input with "customer@test.com"
4. [Browser] Fill password input with "testpass123"
5. [Browser] Click login button
6. [Verify] Assert redirect to customer dashboard
7. [Browser] Navigate to order history
8. [Verify] Assert at least one order is displayed
```
