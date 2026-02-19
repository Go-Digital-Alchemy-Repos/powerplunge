# Stabilization Checklist

This document defines the stabilization checklist and definition of done for the Power Plunge application. Use this as a gating checklist before any release or deployment.

---

## 1. Build & Typecheck

| # | Check | Command | Pass Criteria |
|---|-------|---------|---------------|
| 1.1 | TypeScript compiles | `npm run check` | Exit code 0, no type errors |
| 1.2 | Production build succeeds | `npm run build` | Exit code 0, no build errors |
| 1.3 | No unused imports flagged | Manual review or linter | No dead imports in changed files |

## 2. Unit Tests

| # | Check | Pass Criteria |
|---|-------|---------------|
| 2.1 | All unit tests pass | 100% pass rate, exit code 0 |
| 2.2 | No skipped tests without documented reason | Review `.skip` / `.todo` annotations |
| 2.3 | Coverage does not regress | Coverage stays at or above prior baseline |

## 3. Integration / API Tests

| # | Endpoint Category | Key Endpoints | Pass Criteria |
|---|-------------------|---------------|---------------|
| 3.1 | Products | `GET /api/products`, `GET /api/products/:id` | 200 with valid JSON |
| 3.2 | Pages (public) | `GET /api/pages/home`, `GET /api/pages/shop`, `GET /api/pages/:slug` | 200 with valid JSON |
| 3.3 | Checkout | `POST /api/create-payment-intent`, `POST /api/confirm-payment` | 200 or expected 400 on bad input |
| 3.4 | Legacy checkout | `POST /api/checkout` | 200 with Stripe session or expected error |
| 3.5 | Orders | `GET /api/orders/by-session/:sessionId` | 200 or 404 |
| 3.6 | Affiliate tracking | `GET /api/validate-referral-code/:code` | 200 with `{ valid: true/false }` |
| 3.7 | Site settings | `GET /api/site-settings` | 200 with `featuredProductId` |
| 3.8 | Stripe config | `GET /api/stripe/config` | 200 with `publishableKey` |
| 3.9 | Admin CRUD | All admin `/api/admin/*` endpoints | Correct auth enforcement (401 without token) |
| 3.10 | CMS API | `GET/POST/PUT/DELETE /api/admin/cms/*` | CRUD operations succeed with auth |
| 3.11 | ~~Site Presets API~~ | ~~Removed~~ | Site Presets feature was removed |
| 3.12 | Site Settings API | `GET/PUT /api/admin/cms/site-settings` | Read/write with Zod validation |

## 4. E2E Smoke Tests (Admin + Public)

### Public Storefront

| # | Flow | Steps | Pass Criteria |
|---|------|-------|---------------|
| 4.1 | Homepage loads | Navigate to `/` | Page renders, no JS errors |
| 4.2 | Product listing | Navigate to shop | Products display with prices |
| 4.3 | Product detail | Click a product | Product page renders with Add to Cart |
| 4.4 | Cart flow | Add item → view cart | Cart shows item, total calculates |
| 4.5 | Checkout page | Proceed to checkout | Form renders, Stripe elements load |
| 4.6 | CMS page render | Navigate to `/page/:slug` | Published CMS page renders blocks |
| 4.7 | Affiliate link | Visit with `?ref=CODE` | Cookie is set, code persists to checkout |

### Admin Panel

| # | Flow | Steps | Pass Criteria |
|---|------|-------|---------------|
| 4.8 | Admin login | Navigate to `/admin` | Login form renders, authentication works |
| 4.9 | Dashboard | Login → dashboard | Dashboard loads, no 500s |
| 4.10 | Orders list | Navigate to orders | Orders table renders |
| 4.11 | Products management | CRUD a product | Create, edit, delete all succeed |
| 4.12 | Customers list | Navigate to customers | Customer table renders |
| 4.13 | Affiliate management | Navigate to affiliates | Affiliate list renders |
| 4.14 | CMS pages | Navigate to CMS pages | Page list renders |
| 4.15 | Role enforcement | Login as fulfillment role | Restricted pages show Access Denied |

## 5. Database Migrations Status

| # | Check | Command / Method | Pass Criteria |
|---|-------|-----------------|---------------|
| 5.1 | Schema in sync | `npm run db:push` | No pending changes, exit code 0 |
| 5.2 | No orphaned tables | Compare Drizzle schema to DB | All tables accounted for in `shared/schema.ts` |
| 5.3 | No missing columns | Compare Drizzle schema to DB | All columns in schema exist in DB |
| 5.4 | Indexes present | Review schema for indexed columns | Foreign keys and lookup columns indexed |

## 6. Seed Data Status

| # | Check | Method | Pass Criteria |
|---|-------|--------|---------------|
| 6.1 | Default admin exists | Check `admin_users` table | At least one admin user present |
| 6.2 | Products exist | Check `products` table | At least one active product |
| 6.3 | CMS defaults | `ensureCmsDefaults()` runs on boot | Home and shop pages exist |
| 6.4 | Site settings row | Check `site_settings` where `id='main'` | Row exists with `activeThemeId` |
| 6.5 | Starter kits available | Check saved sections | Section kits loadable from admin |
| 6.6 | ~~Site preset seeds~~ | ~~Removed~~ | Site Presets feature was removed |

## 7. Auth Checks (Admin Only)

| # | Check | Method | Pass Criteria |
|---|-------|--------|---------------|
| 7.1 | Unauthenticated access blocked | Hit `/api/admin/*` without token | 401 Unauthorized |
| 7.2 | Invalid token rejected | Hit `/api/admin/*` with bad token | 401 Unauthorized |
| 7.3 | Fulfillment role restrictions | Login as fulfillment, hit sensitive endpoints | 403 Forbidden on 50+ restricted endpoints |
| 7.4 | Admin/store_manager full access | Login as admin | All endpoints accessible |
| 7.5 | Customer auth | Login via email/password or magic link | Session token issued, My Account accessible |
| 7.6 | Better Auth (if enabled) | Set `USE_BETTER_AUTH=true` | `/auth/login` and `/auth/register` render |

## 8. CMS Health Checks

| # | Check | Method | Pass Criteria |
|---|-------|--------|---------------|
| 8.1 | ~~Feature flag off~~ | ~~Removed~~ | CMS is always active, feature flag removed |
| 8.2 | CMS accessible | Navigate to `/admin/cms` | Full CMS admin accessible |
| 8.3 | Block registry | Load page builder | All 12 block types available |
| 8.4 | Theme system | Activate a theme | CSS variables apply to storefront |
| 8.5 | Theme packs | Activate a theme pack | Tokens + component variants + block defaults apply |
| 8.6 | ~~Site presets~~ | ~~Removed~~ | Site Presets feature was removed |
| 8.7 | Site settings | `GET /api/admin/cms/site-settings` | Returns valid JSON with settings |
| 8.8 | Landing page generator | Generate a page | Draft page created with correct blocks |
| 8.9 | Campaign packs | Generate a campaign | Multiple draft pages created |
| 8.10 | Campaign generation | Generate a campaign | Pages created with pack defaults |
| 8.11 | Blog posts CRUD | Admin create/edit/publish/delete post | CRUD succeeds, status transitions work |
| 8.12 | Blog post visibility | Public list only shows published | Draft/archived posts hidden from public |
| 8.13 | Blog post by slug | `GET /api/blog/posts/:slug` | Returns published post, 404 for draft |
| 8.14 | Blog tags & categories | `GET /api/blog/tags`, `/categories` | Returns arrays of strings |
| 8.15 | Navigation menus CRUD | Admin create/edit/delete menu | CRUD succeeds, items persisted |
| 8.16 | Menu by-location | `GET/PUT /api/admin/cms/menus/by-location/:loc` | Returns menu or creates new |
| 8.17 | Public menu endpoint | `GET /api/menus/main` | Returns active menu or null |
| 8.18 | DynamicNav rendering | Visit homepage with active menu | Nav links render, dropdowns work |
| 8.19 | DynamicNav fallback | Visit homepage with no menu | No crash, existing nav preserved |

## 9. Puck Builder Save/Publish Flow

| # | Check | Method | Pass Criteria |
|---|-------|--------|---------------|
| 9.1 | Builder loads | Open `/admin/cms/pages/:id/builder` | Puck editor renders with existing blocks |
| 9.2 | Add block | Drag a block from sidebar | Block appears in editor |
| 9.3 | Edit block | Click block → edit properties | Changes reflect in preview |
| 9.4 | Save draft | Click Save | `PUT /api/admin/cms/pages/:id` succeeds, toast confirms |
| 9.5 | Publish page | Set status to published → save | Page accessible at `/page/:slug` |
| 9.6 | Section ref insertion | Insert a saved section | sectionRef block renders with section content |
| 9.7 | Section detach | Detach a section ref | Blocks inline into the page |

## 10. Sections / Templates / Themes Checks

| # | Check | Method | Pass Criteria |
|---|-------|--------|---------------|
| 10.1 | Sections list | Navigate to `/admin/cms/sections` | Sections table renders |
| 10.2 | Create section | Create a new section | Section saved to database |
| 10.3 | Load starter kits | Click "Load Starter Kits" | 5 kits created (Benefits, Safety, Delivery, Warranty, Financing) |
| 10.4 | Templates list | Navigate to `/admin/cms/templates` | Templates display (3 built-in) |
| 10.5 | Theme activation | Switch theme in `/admin/cms/themes` | Theme applies immediately |
| 10.6 | Theme pack activation | Switch pack in Theme Packs tab | All 3 layers apply (tokens, variants, block defaults) |

## 11. Public Rendering Checks (Blocks + Legacy HTML)

| # | Check | Method | Pass Criteria |
|---|-------|--------|---------------|
| 11.1 | CMS blocks render | Visit a published CMS page | All block types render correctly |
| 11.2 | Legacy HTML render | Visit a page with `content` (HTML) | HTML renders in legacy renderer |
| 11.3 | Home page resolution | `GET /api/pages/home` | Returns the page with `isHome=true` |
| 11.4 | Shop page resolution | `GET /api/pages/shop` | Returns the page with `isShop=true` |
| 11.5 | 404 handling | Visit `/page/nonexistent-slug` | Graceful 404, no crash |
| 11.6 | Theme on public pages | Visit a published page | Active theme CSS variables applied |
| 11.7 | SEO meta tags | View page source | meta title, description, OG tags present |

## 12. Background Jobs

| # | Job | Schedule | File | Pass Criteria |
|---|-----|----------|------|---------------|
| 12.1 | `affiliate_payout` | Weekly | `server/src/services/scheduled-jobs.ts` | Runs without error, payouts processed |
| 12.2 | `commission_approval` | Daily | `server/src/services/scheduled-jobs.ts` | Pending commissions auto-approved |
| 12.3 | `metrics_aggregation` | Daily | `server/src/services/scheduled-jobs.ts` | Daily metrics row created |
| 12.4 | `recovery_emails` | Hourly | `server/src/services/scheduled-jobs.ts` | Abandoned cart emails sent |
| 12.5 | Job status endpoint | On demand | `GET /api/admin/jobs/status` | Returns status of all registered jobs |
| 12.6 | Duplicate prevention | Any | Check `run_key` uniqueness | Same job does not execute twice for same period |

## 13. Error Logging + Tracing

| # | Check | Method | Pass Criteria |
|---|-------|--------|---------------|
| 13.1 | Request correlation IDs | Check response headers / logs | Each request has a unique correlation ID |
| 13.2 | Request logging | `server/src/middleware/request-logger.middleware.ts` | Method, path, status, duration logged |
| 13.3 | Error handler catches | Trigger a 500 error | Centralized error handler returns JSON, no stack leak |
| 13.4 | Audit logs recorded | Perform admin action | Entry in `audit_logs` table |
| 13.5 | Console errors in browser | Open dev tools on key pages | No JS errors in console |
| 13.6 | Environment validation | Run `npx tsx scripts/doctor.ts` | All required env vars present |

## 14. Performance Baseline

| # | Check | Target | Method |
|---|-------|--------|--------|
| 14.1 | Homepage load | < 3s TTFB | Browser network tab or `curl -w` |
| 14.2 | Products API | < 500ms | `curl -w "%{time_total}" /api/products` |
| 14.3 | Pages API | < 500ms | `curl -w "%{time_total}" /api/pages/home` |
| 14.4 | Admin dashboard | < 3s load | Browser network tab |
| 14.5 | Page builder | < 5s initial load | Browser network tab |
| 14.6 | No N+1 queries | Review key endpoints | No repeated single-row queries in loops |
| 14.7 | Bundle size | Monitor | `npm run build` output, track JS size |

## 15. Route Architecture Verification

| # | Check | Method | Pass Criteria |
|---|-------|--------|---------------|
| 15.1 | No inline handlers in routes.ts | `grep -c 'app\.\(get\|post\|put\|patch\|delete\)(' server/routes.ts` | Output: `0` |
| 15.2 | routes.ts is orchestrator only | `wc -l server/routes.ts` | ~159 lines |
| 15.3 | All 46 router files present | `find server/src/routes -name "*.ts" -not -name "index.ts" \| wc -l` | 46 files |
| 15.4 | Public endpoints respond | `curl /api/products`, `/api/pages/home`, `/api/site-settings` | 200 OK |
| 15.5 | Admin auth enforced | `curl /api/admin/orders` (no token) | 401 Unauthorized |
| 15.6 | Fulfillment role blocked | Login as fulfillment, hit `/api/admin/settings` | 403 Forbidden |
| 15.7 | Webhook endpoints respond | `POST /api/webhook/stripe` (invalid sig) | 400 (not 404) |
| 15.8 | Customer auth enforced | `curl /api/customer/profile` (no token) | 401 Unauthorized |
| 15.9 | Multi-router mounts correct | Shipping zones at `/api/admin/shipping/zones`, shipments at `/api/admin/orders/:id/shipments` | 200 or 401 (not 404) |
| 15.10 | Payment endpoints rate limited | Rapid-fire `POST /api/create-payment-intent` | 429 after threshold |

## 16. Known Issues

Track known issues that are accepted for now but should be addressed:

| # | Issue | Severity | Area | Notes |
|---|-------|----------|------|-------|
| 16.1 | React hydration warning in campaign dialog | Low | CMS Generator | Cosmetic only, does not affect functionality |
| 16.2 | | | | |
| 16.3 | | | | |

Add issues as they are discovered during stabilization. Each entry should include severity (Critical / High / Medium / Low), the affected area, and any workaround notes.

---

## Definition of Done for Stabilization

Stabilization is complete when ALL of the following criteria are met:

### Green Build
- [ ] `npm run check` passes with zero type errors
- [ ] `npm run build` completes successfully

### Green Tests
- [ ] All unit tests pass
- [ ] All integration/API tests pass
- [ ] E2E smoke tests pass for both admin and public flows

### No Console Errors in Critical Flows
- [ ] Homepage load — no JS console errors
- [ ] Product listing and detail — no JS console errors
- [ ] Cart and checkout flow — no JS console errors
- [ ] Admin login and dashboard — no JS console errors
- [ ] CMS page builder — no JS console errors
- [ ] CMS themes manager — no JS console errors

### No 500s on Key Endpoints
- [ ] `GET /api/products` — no 500
- [ ] `GET /api/pages/home` — no 500
- [ ] `GET /api/pages/shop` — no 500
- [ ] `POST /api/create-payment-intent` — no 500 (expected 400 on bad input)
- [ ] `GET /api/site-settings` — no 500
- [ ] `GET /api/admin/cms/site-settings` — no 500 (with auth)
- [ ] `GET /api/admin/cms/themes/active` — no 500 (with auth)
- [ ] All admin CRUD endpoints — no 500 on valid requests

### Parity Script (Legacy vs CMS)
- [ ] Pages with legacy `content` (HTML) still render correctly
- [ ] Pages with CMS `contentJson` (blocks) render correctly
- [ ] Home page and shop page designations work for both content types
- [ ] Theme application works for both rendering paths

### Environment Health
- [ ] `npx tsx scripts/doctor.ts` passes — all required env vars present
- [ ] Database schema is in sync (`npm run db:push` reports no changes)
- [ ] All background jobs are registered and run without errors
- [ ] Audit logging is functional for admin actions

---

## How to Use This Checklist

1. **Before a release:** Walk through each section, marking items as pass/fail
2. **Track progress:** Copy this file and add a date column for each stabilization pass
3. **Escalate blockers:** Any Critical or High severity item in Known Issues must be resolved before release
4. **Re-run after fixes:** After fixing issues found during stabilization, re-run the affected checks
5. **Sign off:** Stabilization is complete when all Definition of Done checkboxes are checked
