# Scripts Reference

All scripts are located in the `scripts/` directory and run with `npx tsx` from a source checkout, local shell, or `railway run` command. They connect to the live PostgreSQL database and perform read-only checks unless otherwise noted.

## Overview

| Script | Path | Purpose | Destructive |
|--------|------|---------|-------------|
| Doctor | `scripts/doctor.ts` | Environment health check | No |
| Local Test Env Hydration | `scripts/dev/hydrateTestEnvFrom1Password.ts` | Writes ignored `.env.test.local` from 1Password refs | Writes local secret file |
| Local DB Push Guard | `scripts/dev/runLocalDbPush.ts` | Verifies guarded local-test DB connection before Drizzle push | Schema mutation |
| Verify Schema | `scripts/db/verifySchema.ts` | Database table verification | No |
| CMS Parity Check | `scripts/cmsParityCheck.ts` | Legacy vs CMS data consistency | No |
| Content Safety | `scripts/smoke/cmsContentSafety.ts` | Content validation regression tests | No |
| API Smoke | `scripts/smoke/apiSmoke.ts` | HTTP endpoint smoke tests | No |
| Blog Smoke | `scripts/smoke/blogSmoke.ts` | Blog post lifecycle tests | Creates/deletes test data |
| Staging Smoke | `scripts/smoke/stagingSmoke.ts` | Composed staging health/schema/Mailgun smoke command | Mailgun test-mode provider call; optional local E2E mutations |
| Seed Email Templates | `scripts/seed-email-templates.ts` | Seed default email templates | Idempotent writes |
| Mailgun Live Check | `scripts/mailgun-live-check.ts` | DB-backed Mailgun/operator smoke check | Optional provider probe with `--send-to`; add `--test-mode` to suppress delivery |
| Email Preview Audit | `scripts/email-preview-audit.ts` | Static email preview/link audit artifacts | Optional real sends with `EMAIL_PREVIEW_SEND_TO` |

## scripts/doctor.ts

Environment validation script that checks core runtime configuration. Full app and auth startup also require `BETTER_AUTH_SECRET`.

**Run:**
```bash
npx tsx scripts/doctor.ts
```

**Checks performed:**
1. Required doctor environment variables (`DATABASE_URL`)
2. Optional environment variables with warnings (`MAILGUN_API_KEY`, etc.); Stripe test/live aliases satisfy the Stripe checks
3. Database connection (attempts a simple query)
4. Integration configuration status (Stripe, Mailgun)

**Output format:**
```
[checkmark] Environment: DATABASE_URL is set
[warning] Environment: MAILGUN_API_KEY is not set
  -> Set MAILGUN_API_KEY to enable email notifications
[checkmark] Database: Connection successful
```

Exit code: `0` if all required checks pass, `1` if any required check fails.

## scripts/mailgun-live-check.ts

DB-backed Mailgun smoke check for deployed or ops environments. It verifies the active email provider, Mailgun outbound configuration, domain state, inbound signing-key presence, and support inbound-reply setting. It does not call Mailgun's send API unless `--send-to` is supplied.

**Run:**
```bash
npm run mailgun:live:check
npm run mailgun:live:check -- --require-inbound
npm run mailgun:live:check -- --json
```

**Optional no-delivery provider probe:**
```bash
npm run mailgun:live:check -- --send-to review@example.com --test-mode
```

`--test-mode` passes Mailgun `o:testmode=yes`, so Mailgun accepts/processes the message but suppresses delivery. Mailgun may still bill for test-mode messages.

**Optional Mailgun event polling:**

```bash
npm run mailgun:live:check -- --send-to review@example.com --test-mode --poll-events --poll-timeout-ms 90000 --poll-interval-ms 5000
npm run mailgun:live:check -- --send-to review@example.com --poll-events --poll-timeout-ms 90000 --poll-interval-ms 5000
```

`--poll-events` tags the probe and polls Mailgun events. Test-mode probes pass on Mailgun `accepted` or `delivered` events because delivery is suppressed. Real-send probes wait for `delivered` or failure events; an `accepted` event alone is not treated as delivery. A test-mode event timeout is a warning because Mailgun's accepted API response is the no-delivery signal; a real-send event timeout is a failure.

**Optional real send:**
```bash
npm run mailgun:live:check -- --send-to review@example.com
npm run mailgun:live:check -- --send-to review@example.com --poll-events
```

Omit `--test-mode` only when you intentionally want a real inbox delivery check. `--require-inbound` turns missing inbound replies/signing-key checks from warnings into failures. Output never prints API keys or webhook signing keys.

## scripts/smoke/stagingSmoke.ts

Composed smoke command for pre/post-deploy checks. It runs HTTP API smoke checks, DB schema/invariant checks, and a Mailgun `o:testmode=yes` provider probe that suppresses delivery. It can also run the local/internal Stripe webhook E2E order/email assertions, but only with explicit mutation approval flags.

**Run against staging:**
```bash
STAGING_SMOKE_MAILGUN_SEND_TO=qa@example.com npm run staging:smoke
```

**Run in the Railway staging service:**
```bash
railway run --environment staging --service powerplunge -- npm run staging:smoke -- --mailgun-send-to qa@example.com
```

**Run local/internal Stripe webhook E2E path:**
```bash
npm run staging:smoke -- --base-url http://powerplunge.localhost --mailgun-send-to qa@example.com --stripe-webhook-e2e --allow-e2e-mutation
```

Default checks:
1. `scripts/smoke/apiSmoke.ts` with `SMOKE_BASE_URL` set to the target URL
2. `scripts/db/verifySchema.ts`
3. `npm run mailgun:live:check -- --require-inbound --send-to <email> --test-mode --poll-events`

Safety:
- The Mailgun check always uses `--test-mode`; it calls Mailgun but does not deliver a real email.
- The Stripe webhook E2E path is limited to localhost/internal targets and requires `--allow-e2e-mutation`.
- The Stripe webhook E2E path expects the target server to run with `E2E_TEST_MODE=true` and `E2E_EMAIL_MODE=outbox`; remote production-like staging should not expose those routes.
- Use `--skip-http`, `--skip-db`, or `--skip-mailgun` only when isolating a known failure.

## scripts/email-preview-audit.ts

Static first-pass email QA script. It renders the seeded email-template matrix with sample merge data, audits internal links when `PUBLIC_SITE_URL` is explicitly set, scans known runtime email sender files for `emailService.sendEmail` call sites, and writes artifacts under `tmp/email-preview-audit/<YYYY-MM-DD>/`.

**Run:**
```bash
npm run email:preview:audit
```

**Useful environment:**
```bash
PUBLIC_SITE_URL=https://powerplunge.com npm run email:preview:audit
EMAIL_PREVIEW_SKIP_ARTIFACTS=1 npm run email:preview:audit
EMAIL_PREVIEW_SKIP_LINK_AUDIT=1 npm run email:preview:audit
```

Set `EMAIL_PREVIEW_SEND_TO=review@example.com` only when you intentionally want each preview sent as a real email through the configured provider. The default run is offline/static and performs no DB writes, provider calls, or real sends.

## Local automated test env

The local-test flow keeps real secret values and 1Password item refs out of committed files while allowing one-command verification against local Postgres or an isolated Neon test branch.

Requires the 1Password CLI (`op`) signed in locally.

**Setup:**
```bash
cp env.test.local.example .env.test.local.template
# Replace placeholders with local-test 1Password refs and host pin.
npm run env:test:hydrate
```

`scripts/dev/hydrateTestEnvFrom1Password.ts` runs `op inject`, writes only `.env.test.local`, and sets file mode `0600`. Re-run with `npm run env:test:hydrate:force` to replace the hydrated file.

`scripts/dev/withLocalBetterAuthEnv.ts` loads `.env.test.local` automatically, sets Better Auth and email-outbox defaults, and refuses remote database URLs unless `LOCAL_TEST_DATABASE=true` and `LOCAL_TEST_DATABASE_HOST` exactly match the URL host. `scripts/dev/runLocalDbPush.ts` verifies the database connection before `drizzle-kit push` and fails if Drizzle stops at a create/rename prompt.

**Full local check:**
```bash
npm run check:local
```

This runs guarded DB push, dev-user seeding, Better Auth seed verification, typecheck, local doctor, schema verification, unit tests, the CMS landing-page generator test, and Playwright e2e.

## scripts/db/verifySchema.ts

Verifies that all Drizzle schema-exported database tables exist in PostgreSQL and checks key data invariants.

**Run:**
```bash
npx tsx scripts/db/verifySchema.ts
```

**Checks performed:**
1. Queries `pg_tables` for all public tables
2. Compares against the table names exported from `shared/schema.ts`
3. Reports missing tables and unexpected extra tables
4. Checks data invariants:
   - `site_settings` "main" row exists
   - Exactly one page has `is_home = true`
   - Exactly one page has `is_shop = true`
   - At least one active product exists

**Expected output:**
```
=== DB Schema Verification ===
Checked: <schema-derived count> expected tables
PASS:    <schema-derived count>
FAIL:    0
Extra tables (not in schema, may be from plugins/migrations):
  - better_auth_account
  - ...
=== Seed Invariants ===
PASS  site_settings 'main' row exists
PASS  exactly 1 home page ("Home")
PASS  exactly 1 shop page ("Shop")
PASS  1 active product(s) found
```

Exit code: `0` if all tables exist and invariants hold, `1` otherwise.

## scripts/smoke/apiSmoke.ts

HTTP-based smoke test that hits 22 key endpoints and checks status codes, auth enforcement, and response shapes.

**Run:**
```bash
npx tsx scripts/smoke/apiSmoke.ts
```

**Requires:** A running server.

Set `SMOKE_BASE_URL` when your server is not on `http://localhost:5000`:

```bash
SMOKE_BASE_URL=http://localhost:5001 npx tsx scripts/smoke/apiSmoke.ts
```

**Endpoint categories tested (22 checks):**

### CMS & Health (9 checks)
| Check | Endpoint | Expected |
|-------|----------|----------|
| CMS health | `GET /api/admin/cms/health` | 200 with auth, 401 without |
| Admin pages | `GET /api/admin/cms/pages` | 401 (no auth) |
| Admin sections | `GET /api/admin/cms/sections` | 401 (no auth) |
| Admin templates | `GET /api/admin/cms/templates` | 401 (no auth) |
| Admin themes | `GET /api/admin/cms/themes` | 401 (no auth) |
| Admin posts | `GET /api/admin/cms/posts` | 401 (no auth) |
| Admin menus | `GET /api/admin/cms/menus` | 401 (no auth) |
| Admin site-settings | `GET /api/admin/cms/site-settings` | 401 (no auth) |

### Public Endpoints (10 checks)
| Check | Endpoint | Expected |
|-------|----------|----------|
| Products | `GET /api/products` | 200, JSON array |
| Home page | `GET /api/pages/home` | 200 or 404 |
| Shop page | `GET /api/pages/shop` | 200 or 404 |
| Site settings | `GET /api/site-settings` | 200 |
| Blog posts | `GET /api/blog/posts` | 200, array or paginated object |
| Blog tags | `GET /api/blog/tags` | 200, array |
| Blog categories | `GET /api/blog/categories` | 200, array |
| Blog post (404) | `GET /api/blog/posts/nonexistent-slug-xyz` | 404 |
| Menu (main) | `GET /api/menus/main` | 200, menu or null |
| Menu (footer) | `GET /api/menus/footer` | 200, menu or null |

### Auth Enforcement (2 checks)
| Check | Endpoint | Expected |
|-------|----------|----------|
| Admin orders | `GET /api/admin/orders` | 401 |
| Customer profile | `GET /api/customer/profile` | 401 |

### Stripe (1 check)
| Check | Endpoint | Expected |
|-------|----------|----------|
| Stripe config | `GET /api/stripe/config` | 200 or 500 (if key missing) |

**Output format:**
```
=== API Smoke Tests ===
  PASS  CMS health  (200 with auth, 401 without)
  ...
=== Results: 22 passed, 0 failed, 0 warnings ===
```

Exit code: `0` if all checks pass, `1` if any fail.

## scripts/smoke/blogSmoke.ts

Tests the full blog post lifecycle via the service layer (does not require HTTP). Creates test posts, exercises publish/unpublish/delete, and verifies public visibility filtering.

**Run:**
```bash
npx tsx scripts/smoke/blogSmoke.ts
```

**Requires:** Database connection (uses service layer directly).

**Test lifecycle (19 checks):**

1. Admin list: returns array
2. Create draft post with unique slug
3. Verify post appears in admin list
4. Verify draft NOT visible in public list
5. Verify draft returns 404 by slug (public)
6. Publish the post
7. Verify status is "published" and `publishedAt` is set
8. Verify published post IS visible in public list
9. Verify published post returns 200 by slug (public)
10. Verify post body content matches
11. Verify tags endpoint includes test tag
12. Verify categories endpoint includes test category
13. Unpublish the post
14. Verify status reverts to "draft"
15. Verify unpublished post NOT in public list
16. Verify unpublished post returns 404 by slug (public)
17. Delete the post
18. Verify deleted post gone from admin list
19. Verify deleted post returns 404 by ID

**Note:** This script creates and deletes test data during each run. Test posts use unique slugs with timestamps to avoid conflicts.

**Output format:**
```
=== Blog Smoke Tests ===
  PASS  Admin list returns array
  ...
=== Results: 19 passed, 0 failed ===
```

Exit code: `0` if all 19 checks pass, `1` otherwise.

## scripts/cmsParityCheck.ts

Compares data between the legacy CMS storage layer and the CMS repository to verify consistency.

**Run:**
```bash
npx tsx scripts/cmsParityCheck.ts
```

**Checks performed:**
1. **List parity:** Compares page lists from both APIs (count and field-level match)
2. **Home page parity:** Verifies both APIs return the same home page
3. **Shop page parity:** Verifies both APIs return the same shop page
4. **Individual page parity:** Deep-compares each page across 26 fields

**Fields compared:**
```
id, title, slug, content, contentJson, pageType, isHome, isShop,
template, metaTitle, metaDescription, metaKeywords, canonicalUrl,
ogTitle, ogDescription, ogImage, twitterCard, twitterTitle,
twitterDescription, twitterImage, robots, featuredImage, status,
showInNav, navOrder, createdAt, updatedAt
```

**Output format:**
```
=== CMS Parity Check ===
PASS  List count matches (3 pages)
PASS  Home page matches
PASS  Shop page matches
PASS  Page "about" fields match
FAIL  Page "faq" field diff: metaDescription
```

Exit code: `0` if all checks pass, `1` if any field differs.

## scripts/smoke/cmsContentSafety.ts

Regression test suite for the content validation and HTML sanitization functions.

**Run:**
```bash
npx tsx scripts/smoke/cmsContentSafety.ts
```

**Does not require a running server or database.** Imports functions directly from `server/src/utils/contentValidation.ts`.

**Test categories:**

### contentJson Validation (13 assertions)

| Test | Expected |
|------|----------|
| `null` contentJson | Valid (empty blocks) |
| Empty blocks array | Valid |
| String input | Rejected |
| Array input | Rejected |
| Missing `blocks` key | Rejected |
| Valid block | Accepted |
| Empty block `id` | Rejected |
| Empty block `type` | Rejected |
| Non-object `data` | Rejected |
| Unknown block type | Accepted with warning |
| Warning text includes type name | Yes |
| Mixed known + unknown blocks | Accepted |
| Only unknown blocks produce warnings | Yes |

### HTML Sanitization (8 assertions)

| Test | Expected |
|------|----------|
| Script tags removed | `<script>` stripped |
| Safe content preserved | Non-script HTML intact |
| Event handlers removed | `onclick`, `onmouseover` stripped |
| Element preserved after handler removal | Tag structure intact |
| `javascript:` URI neutralized | Replaced with `#` |
| Link element preserved | `<a>` tag intact |
| Safe HTML unchanged | Clean HTML passes through |
| Multiple script tags removed | All `<script>` blocks stripped |

**Output:**
```
=== contentJson Validation ===
PASS  null contentJson is valid (becomes empty blocks)
...
=== HTML Sanitization ===
PASS  script tags removed
...
=== Results: 21 passed, 0 failed ===
```

Exit code: `0` if all 21 assertions pass, `1` otherwise.

## scripts/seed-email-templates.ts

Seeds default email templates into the `email_templates` database table.

**Run:**
```bash
npx tsx scripts/seed-email-templates.ts
```

**Behavior:**
- Iterates through a predefined list of default templates (abandoned cart, order confirmation, etc.)
- For each template, checks if one with the same `key` already exists
- Only inserts templates that do not already exist (idempotent)
- Logs each template as "created" or "already exists"

**Templates seeded:**
- `ABANDONED_CART` — Abandoned cart reminder
- `ORDER_CONFIRMATION` — Order confirmation
- `SHIPPING_NOTIFICATION` — Shipping update
- `AFFILIATE_WELCOME` — Affiliate welcome email
- `AFFILIATE_PAYOUT` — Payout notification
- `RECOVERY_REMINDER` — Cart recovery follow-up

## Post-Refactor Route Verification

After extracting routes from `routes.ts` into modular router files, use these verification steps:

### Quick Smoke Test

```bash
BASE_URL="${BASE_URL:-http://localhost:5001}" # use 5000 in Replit
curl -s "$BASE_URL/api/products" | head -c 100
curl -s "$BASE_URL/api/pages/home" | head -c 100
curl -s "$BASE_URL/api/site-settings" | head -c 100
curl -s "$BASE_URL/api/stripe/config" | head -c 100
curl -s "$BASE_URL/api/health/config" | head -c 100
```

All should return valid JSON (200 OK). These are public endpoints that don't require authentication.

### Admin Endpoint Verification (requires admin Better Auth cookie)

```bash
BASE_URL="${BASE_URL:-http://localhost:5001}" # use 5000 in Replit
COOKIE_JAR="$(mktemp)"
curl -s -c "$COOKIE_JAR" -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"testpass123"}' \
  "$BASE_URL/api/admin/login"
curl -s -b "$COOKIE_JAR" "$BASE_URL/api/admin/me"
curl -s -b "$COOKIE_JAR" "$BASE_URL/api/admin/dashboard"
curl -s -b "$COOKIE_JAR" "$BASE_URL/api/admin/orders"
```

### Auth Enforcement Check

```bash
BASE_URL="${BASE_URL:-http://localhost:5001}" # use 5000 in Replit
curl -s "$BASE_URL/api/admin/orders"
```

Should return `401 Unauthorized` — confirms `requireAdmin` middleware is active.

### Route File Inventory

To verify all router files are present:

```bash
find server/src/routes -name "*.ts" -not -name "index.ts" | wc -l
```

### Check for Orphaned Inline Handlers

To confirm no inline handlers remain in `routes.ts`:

```bash
grep -c 'app\.\(get\|post\|put\|patch\|delete\)(' server/routes.ts
```

Expected output: `0` — all handlers should be in router files.

## Running All Checks

To run all non-destructive verification scripts:

```bash
npx tsx scripts/doctor.ts && \
npx tsx scripts/db/verifySchema.ts && \
npx tsx scripts/cmsParityCheck.ts && \
npx tsx scripts/smoke/cmsContentSafety.ts && \
SMOKE_BASE_URL="${SMOKE_BASE_URL:-http://localhost:5001}" npx tsx scripts/smoke/apiSmoke.ts
```

All scripts exit with code `0` on success and `1` on failure, so they can be chained with `&&` for a full health check.

To additionally run the blog lifecycle test (creates/deletes test data):

```bash
npx tsx scripts/smoke/blogSmoke.ts
```
