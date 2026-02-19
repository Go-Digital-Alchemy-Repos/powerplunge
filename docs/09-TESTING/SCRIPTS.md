# Scripts Reference

All scripts are located in the `scripts/` directory and run with `npx tsx`. They connect to the live PostgreSQL database and perform read-only checks unless otherwise noted.

## Overview

| Script | Path | Purpose | Destructive |
|--------|------|---------|-------------|
| Doctor | `scripts/doctor.ts` | Environment health check | No |
| Verify Schema | `scripts/db/verifySchema.ts` | Database table verification | No |
| CMS Parity Check | `scripts/cmsParityCheck.ts` | Legacy vs CMS data consistency | No |
| Content Safety | `scripts/smoke/cmsContentSafety.ts` | Content validation regression tests | No |
| API Smoke | `scripts/smoke/apiSmoke.ts` | HTTP endpoint smoke tests | No |
| Blog Smoke | `scripts/smoke/blogSmoke.ts` | Blog post lifecycle tests | Creates/deletes test data |
| Seed Email Templates | `scripts/seed-email-templates.ts` | Seed default email templates | Idempotent writes |

## scripts/doctor.ts

Environment validation script that checks whether the application is correctly configured.

**Run:**
```bash
npx tsx scripts/doctor.ts
```

**Checks performed:**
1. Required environment variables (`DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`)
2. Optional environment variables with warnings (`MAILGUN_API_KEY`, etc.)
3. Database connection (attempts a simple query)
4. Integration configuration status (Stripe, Mailgun, Replit Auth)

**Output format:**
```
[checkmark] Environment: DATABASE_URL is set
[warning] Environment: MAILGUN_API_KEY is not set
  -> Set MAILGUN_API_KEY to enable email notifications
[checkmark] Database: Connection successful
```

Exit code: `0` if all required checks pass, `1` if any required check fails.

## scripts/db/verifySchema.ts

Verifies that all 80 expected database tables exist in PostgreSQL and checks key data invariants.

**Run:**
```bash
npx tsx scripts/db/verifySchema.ts
```

**Checks performed:**
1. Queries `information_schema.tables` for all public tables
2. Compares against a hardcoded list of 80 expected table names (including `cms_v2_posts` and `cms_v2_menus`)
3. Reports missing tables and unexpected extra tables
4. Checks data invariants:
   - `site_settings` "main" row exists
   - Exactly one page has `is_home = true`
   - Exactly one page has `is_shop = true`
   - At least one active product exists

**Expected output:**
```
=== DB Schema Verification ===
Checked: 67 expected tables
PASS:    67
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

**Requires:** A running server on `http://localhost:5000`.

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
curl -s http://localhost:5000/api/products | head -c 100
curl -s http://localhost:5000/api/pages/home | head -c 100
curl -s http://localhost:5000/api/site-settings | head -c 100
curl -s http://localhost:5000/api/stripe/config | head -c 100
curl -s http://localhost:5000/api/health/config | head -c 100
```

All should return valid JSON (200 OK). These are public endpoints that don't require authentication.

### Admin Endpoint Verification (requires admin JWT)

```bash
TOKEN="your-admin-jwt-here"
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/admin/me
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/admin/dashboard
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/admin/orders
```

### Auth Enforcement Check

```bash
curl -s http://localhost:5000/api/admin/orders
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
npx tsx scripts/smoke/apiSmoke.ts
```

All scripts exit with code `0` on success and `1` on failure, so they can be chained with `&&` for a full health check.

To additionally run the blog lifecycle test (creates/deletes test data):

```bash
npx tsx scripts/smoke/blogSmoke.ts
```
