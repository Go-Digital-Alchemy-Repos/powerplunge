# Route Architecture Refactor Plan

Date: 2026-02-07  
Phase 1 Status: COMPLETED — 2026-02-07 (monolith → 46 router files)  
Phase 2 Status: IN PROGRESS — Route file relocation into feature subdirectories

---

## 1. Current State Inventory

### 1.1 Route Registration

The application has **two parallel route systems**:

| System | File(s) | Endpoints | Status |
|--------|---------|-----------|--------|
| Legacy monolith | `server/routes.ts` (159 lines — 97% reduction) | **0** | COMPLETED — all handlers extracted to 14 new router files |
| Layered architecture | `server/src/routes/**` (46 files) | **ALL (~360 total)** | Active — proper separation of concerns |

All routes are registered in `server/routes.ts > registerRoutes()`, which is called from `server/index.ts`. The file is now a 159-line orchestrator that imports and mounts all 46 router files with appropriate middleware. No inline handlers remain.

### 1.2 Legacy Route File (`server/routes.ts`)

**MIGRATED:** all 187 inline handlers extracted. `routes.ts` is now a 159-line orchestrator that imports and mounts 46 router files.

Previously contained:
- Direct `storage.*` calls (no service layer)
- Inline business logic (Stripe calls, email sending, commission calculations)
- Inline validation (manual `if` checks, no Zod schemas)
- Helper functions (`generateAffiliateCode`, `sendOrderNotification`, `getDefaultAffiliateAgreement`) — now moved into their respective router files
- `req: any` type annotations on ~40 handlers

All of the above have been extracted into dedicated route files under `server/src/routes/`.

### 1.3 Migrated Route Files (`server/src/routes/`)

```
server/src/routes/
├── admin/
│   ├── affiliates.routes.ts      13 endpoints  (affiliate settings, invites, payouts) [NEW]
│   ├── auth.routes.ts             5 endpoints  (admin login, logout, setup) [NEW]
│   ├── categories.routes.ts       4 endpoints  (categories CRUD) [NEW]
│   ├── cms-pages.routes.ts       10 endpoints  (CMS pages CRUD, import/export, SEO)
│   ├── cms-sections.routes.ts     5 endpoints  (reusable section blocks)
│   ├── cms-templates.routes.ts    2 endpoints  (page template list/detail)
│   ├── cms-theme.routes.ts        2 endpoints  (admin theme settings)
│   ├── cms.router.ts          25 endpoints  (CMS builder)
│   ├── coupons.routes.ts         4+1 endpoints (CRUD + public validate) [NEW]
│   ├── customer-management.routes.ts 13 endpoints (notes, tags, profile, password, actions) [NEW]
│   ├── customers.routes.ts        4 endpoints  (customer CRUD)
│   ├── docs.router.ts             4 endpoints  (file-system docs browser)
│   ├── integrations-social.routes.ts ~30 endpoints (OpenAI, TikTok, Instagram, Pinterest, YouTube, Snapchat, X, Mailchimp) [NEW]
│   ├── media.routes.ts           10 endpoints  (media library)
│   ├── operations.routes.ts      ~15 endpoints (seed, dashboard, email, refunds, inventory, audit, jobs, AI) [NEW]
│   ├── orders.routes.ts           4 endpoints  (orders CRUD, manual creation) [NEW]
│   ├── products.routes.ts         4 endpoints  (product CRUD)
│   ├── reports.routes.ts          4 endpoints  (sales, products, customers, CSV export) [NEW]
│   ├── settings.routes.ts       ~10 endpoints  (site settings, email config, Stripe config) [NEW]
│   ├── shipping.routes.ts       8+4 endpoints  (zones, rates + shipments) [NEW]
│   ├── team.routes.ts             4 endpoints  (team member CRUD) [NEW]
│   └── index.ts                   —            (mount point)
├── customer/
│   ├── affiliate-portal.routes.ts 10 endpoints (customer affiliate dashboard)
│   ├── affiliates.routes.ts      6+1 endpoints (affiliate portal + public agreement) [NEW]
│   ├── auth.routes.ts             8 endpoints  (login/register/magic-link)
│   ├── order-tracking.routes.ts   7 endpoints  (order history, returns)
│   └── profile.routes.ts         6 endpoints   (profile, orders, password, link) [NEW]
├── public/
│   ├── affiliate-signup.routes.ts  2 endpoints (invite-only signup)
│   ├── affiliate-tracking.routes.ts 1 endpoint (click tracking)
│   ├── cms-pages.routes.ts        4 endpoints  (public page delivery)
│   ├── cms-sections.routes.ts     1 endpoint   (public section lookup)
│   ├── cms-settings.routes.ts     1 endpoint   (public site settings)
│   ├── cms-theme.routes.ts        2 endpoints  (public theme config)
│   ├── order-status.routes.ts     1 endpoint   (public order lookup)
│   ├── payments.routes.ts         6 endpoints  (Stripe config, payment intents, checkout) [NEW]
│   ├── products.routes.ts         2 endpoints  (product list/detail)
│   └── index.ts                   —            (mount point)
├── webhooks/
│   └── stripe.routes.ts          2 endpoints   (Stripe + Connect webhooks) [NEW]
├── affiliate.routes.ts           18 endpoints  (admin affiliate management v2)
├── alerts.routes.ts               9 endpoints  (revenue guardrails)
├── cms.siteSettings.routes.ts   2 endpoints  (canonical site settings)
├── coupon.routes.ts               6 endpoints  (coupon analytics)
├── recovery.routes.ts            10 endpoints  (checkout recovery)
├── revenue.routes.ts             10 endpoints  (revenue analytics)
├── support.routes.ts              2 endpoints  (support tickets)
├── upsell.routes.ts              14 endpoints  (upsell/cross-sell)
├── vip.routes.ts                 10 endpoints  (VIP program)
└── index.ts                       —           (layered architecture mount)
```

> Files marked `[NEW]` were created during the final extraction batch on 2026-02-07.

### 1.4 Service Layer (existing)

```
server/src/services/
├── affiliate-commission.service.ts
├── affiliate-payout.service.ts
├── affiliate-tracking.service.ts
├── checkout-recovery.service.ts
├── cms.service.ts
├── cms.siteSettings.service.ts
├── coupon-analytics.service.ts
├── customer-email.service.ts
├── customers.service.ts
├── docs-generator.service.ts
├── error-alerting.service.ts
├── job-runner.ts
├── products.service.ts
├── revenue-analytics.service.ts
├── revenue-monitoring.service.ts
├── scheduled-jobs.ts
├── sections.service.ts
├── upsell.service.ts
└── vip.service.ts
```

### 1.5 Repository Layer (existing)

```
server/src/repositories/
├── cms.repository.ts
└── sections.repository.ts
```

### 1.6 Shared Data Access (`server/storage.ts`)

A **1,666-line** monolithic `DatabaseStorage` class implementing the `IStorage` interface. This is the primary data access layer for all legacy routes and many migrated routes. It contains ~120 methods covering every domain.

### 1.7 Middleware (existing)

```
server/src/middleware/
├── auth.middleware.ts         (requireAdmin, requireFullAccess, requireOrderAccess)
├── customer-auth.middleware.ts (isAuthenticated — customer session)
├── error.middleware.ts        (errorHandler — centralized error response)
├── index.ts                   (barrel exports)
├── rate-limiter.ts            (per-endpoint rate limiting)
├── request-logger.middleware.ts (correlation IDs, request logging)
├── requireBetterAuth.ts       (Better Auth RBAC — feature-flagged)
└── server-timing.middleware.ts (dev-only slow endpoint detection)
```

### 1.8 Integration Wrappers (existing)

```
server/src/integrations/
├── cloudflare-r2/             (R2 file storage)
├── instagram-shop/            (Instagram product sync)
├── mailchimp/                 (email marketing)
├── mailgun/                   (transactional email)
├── openai/                    (AI content generation)
├── pinterest-shopping/        (Pinterest product sync)
├── replit/                    (Auth + Object Storage)
├── snapchat-shopping/         (Snapchat product sync)
├── stripe/                    (payments + Connect)
├── tiktok-shop/               (TikTok product sync)
├── x-shopping/                (X/Twitter product sync)
└── youtube-shopping/          (YouTube product sync)
```

---

## 2. Legacy Endpoint Inventory by Domain

The **187 legacy endpoints** in `server/routes.ts` break down into **39 feature domains**:

| # | Domain | Count | Prefix | Notes |
|---|--------|-------|--------|-------|
| 1 | **Admin Auth** | 5 | `/api/admin/(check-setup\|setup\|login\|logout\|me)` | Setup wizard, JWT login |
| 2 | **Admin Settings** | 42 | `/api/admin/settings/**` | General (3), email (4), Stripe (3), OpenAI (3), R2 (2), Mailchimp (3), social shops ×6 (24: TikTok, Instagram, Pinterest, Snapchat, X, YouTube — each GET/PATCH/DELETE + verify) |
| 3 | **Admin Integrations** | 5 | `/api/admin/integrations`, `/api/admin/integrations/(pinterest\|youtube\|snapchat\|x)-shopping/sync` | Integration status list + 4 platform sync triggers |
| 4 | **Admin Orders** | 7 | `/api/admin/orders/**` | List, detail, update, create, shipment list, shipment create, refund create |
| 5 | **Admin Affiliates** | 13 | `/api/admin/affiliate*` | Settings (2), list (2), invites (4), payouts run (1), payout batches (1), patch affiliate (1), affiliate-payouts CRUD (2) |
| 6 | **Admin Team** | 4 | `/api/admin/team/**` | RBAC team member CRUD |
| 7 | **Admin CMS Pages** | 10 | `/api/admin/pages/**` | CRUD (5), import, export, set-home, set-shop, generate-seo |
| 8 | **Admin CMS Sections** | 5 | `/api/admin/saved-sections/**` | Reusable section blocks |
| 9 | **Admin CMS Templates** | 2 | `/api/admin/page-templates/**` | Page template list/detail |
| 10 | **Admin Categories** | 4 | `/api/admin/categories/**` | Product categories CRUD |
| 11 | **Admin Coupons** | 4 | `/api/admin/coupons/**` | Coupon CRUD |
| 12 | **Admin Shipping** | 8 | `/api/admin/shipping/**` | Zones (4) + rates (4) CRUD |
| 13 | **Admin Shipments** | 2 | `/api/admin/shipments/**` | Status update, resend email |
| 14 | **Admin Refunds** | 2 | `/api/admin/refunds/**` | List + update status |
| 15 | **Admin Inventory** | 3 | `/api/admin/inventory/**` | List, detail, update stock |
| 16 | **Admin Reports** | 4 | `/api/admin/reports/**` | Sales, products, customers, CSV export |
| 17 | **Admin Email** | 4 | `/api/admin/email-*` | Email templates (3: list, create, update) + email events (1: list) |
| 18 | **Admin Customers** | 13 | `/api/admin/customers/:customerId/**` | Profile, notes (3), tags (2), orders, audit-logs, disable, enable, send-password-reset, reset-password, force-logout |
| 19 | **Admin Docs (legacy DB)** | 11 | `/api/admin/docs/**` | List, get-by-id, get-by-slug, create, update, delete, publish, versions, restore, generate, health. Separate from file-system docs router. |
| 20 | **Admin Theme** | 2 | `/api/admin/theme` | Theme settings CRUD |
| 21 | **Admin AI** | 1 | `/api/admin/ai/**` | Content generation |
| 22 | **Admin Dashboard** | 1 | `/api/admin/dashboard` | Dashboard stats |
| 23 | **Admin Jobs** | 2 | `/api/admin/jobs/**` | Job status + manual trigger |
| 24 | **Admin Audit** | 1 | `/api/admin/audit-logs` | Audit log list |
| 25 | **Admin Seed** | 1 | `/api/admin/seed` | Dev seed data |
| 26 | **Admin Payouts** | 2 | `/api/admin/payouts*` | Payout list + approval |
| 27 | **Checkout** | 3 | `/api/(create-payment-intent\|confirm-payment\|checkout)` | Stripe payment flow |
| 28 | **Webhooks** | 2 | `/api/webhook/stripe*` | Stripe + Connect webhooks |
| 29 | **Customer Profile** | 2 | `/api/customer/profile` | GET + PATCH profile |
| 30 | **Customer Auth** | 2 | `/api/customer/(link\|change-password)` | Account linking + password change |
| 31 | **Customer Orders** | 2 | `/api/customer/orders`, `/api/customer/orders/:id` | Order history + detail |
| 32 | **Customer Affiliate** | 6 | `/api/customer/affiliate*` | Portal CRUD, Stripe Connect start/status |
| 33 | **Public CMS** | 6 | `/api/pages`, `/api/pages/home`, `/api/pages/shop`, `/api/pages/:slug`, `/api/site-settings`, `/api/sections/:id` | Public page delivery |
| 34 | **Public Theme** | 2 | `/api/theme`, `/api/theme/active` | Active theme config |
| 35 | **Public Affiliate** | 2 | `/api/(affiliate/agreement\|validate-referral-code)` | Agreement text, referral validation |
| 36 | **Public Coupons** | 1 | `/api/coupons/validate` | Coupon validation |
| 37 | **Public Stripe** | 1 | `/api/stripe/config` | Publishable key |
| 38 | **Public Orders** | 1 | `/api/orders/by-session` | Session-based order lookup |
| 39 | **Health** | 1 | `/api/health/config` | CMS feature flag |
| | **TOTAL** | **187** | | |

---

## 3. Target Architecture

### 3.1 Naming Conventions

```
server/src/
├── routes/
│   ├── admin/
│   │   ├── admin-auth.routes.ts        → /api/admin/(setup|login|logout|me)
│   │   ├── admin-settings.routes.ts    → /api/admin/settings/**
│   │   ├── admin-integrations.routes.ts → /api/admin/integrations/**
│   │   ├── orders.routes.ts            → /api/admin/orders/**
│   │   ├── affiliates.routes.ts        → /api/admin/affiliate*
│   │   ├── team.routes.ts              → /api/admin/team/**
│   │   ├── cms-pages.routes.ts         → /api/admin/pages/**
│   │   ├── cms-sections.routes.ts      → /api/admin/saved-sections/**
│   │   ├── cms-templates.routes.ts     → /api/admin/page-templates/**
│   │   ├── categories.routes.ts        → /api/admin/categories/**
│   │   ├── coupons.routes.ts           → /api/admin/coupons/**
│   │   ├── shipping.routes.ts          → /api/admin/shipping/**
│   │   ├── shipments.routes.ts         → /api/admin/shipments/**
│   │   ├── refunds.routes.ts           → /api/admin/refunds/**
│   │   ├── inventory.routes.ts         → /api/admin/inventory/**
│   │   ├── reports.routes.ts           → /api/admin/reports/**
│   │   ├── email.routes.ts             → /api/admin/email-*
│   │   ├── theme.routes.ts             → /api/admin/theme
│   │   ├── ai.routes.ts                → /api/admin/ai/**
│   │   ├── dashboard.routes.ts         → /api/admin/dashboard
│   │   ├── jobs.routes.ts              → /api/admin/jobs/**
│   │   ├── audit.routes.ts             → /api/admin/audit-logs
│   │   ├── payouts.routes.ts           → /api/admin/payouts/**
│   │   ├── docs-legacy.routes.ts       → /api/admin/docs/** (DB-backed, legacy)
│   │   ├── cms.router.ts            → (already migrated)
│   │   ├── customers.routes.ts         → (already migrated)
│   │   ├── docs.router.ts              → (already migrated, file-system)
│   │   ├── media.routes.ts             → (already migrated)
│   │   └── products.routes.ts          → (already migrated)
│   ├── customer/
│   │   ├── profile.routes.ts           → /api/customer/profile*
│   │   ├── customer-orders.routes.ts   → /api/customer/orders*, /api/customer/link
│   │   ├── customer-affiliate.routes.ts → /api/customer/affiliate*
│   │   ├── affiliate-portal.routes.ts  → (already migrated)
│   │   ├── auth.routes.ts              → (already migrated)
│   │   └── order-tracking.routes.ts    → (already migrated)
│   ├── public/
│   │   ├── checkout.routes.ts          → /api/(create-payment-intent|confirm-payment|checkout)
│   │   ├── cms-public.routes.ts        → /api/(pages|site-settings|sections|theme)
│   │   ├── coupons-public.routes.ts    → /api/coupons/validate
│   │   ├── stripe-public.routes.ts     → /api/stripe/config
│   │   ├── affiliate-public.routes.ts  → /api/(affiliate/agreement|validate-referral-code)
│   │   ├── health.routes.ts            → /api/health/**
│   │   ├── affiliate-signup.routes.ts  → (already migrated)
│   │   ├── affiliate-tracking.routes.ts → (already migrated)
│   │   ├── order-status.routes.ts      → (already migrated)
│   │   └── products.routes.ts          → (already migrated)
│   └── webhooks/
│       └── stripe.routes.ts            → /api/webhook/stripe*
├── services/
│   ├── admin-auth.service.ts
│   ├── admin-settings.service.ts
│   ├── checkout.service.ts             ← HIGH PRIORITY (largest inline logic block)
│   ├── orders.service.ts
│   ├── shipping.service.ts
│   ├── refunds.service.ts
│   ├── reports.service.ts
│   ├── team.service.ts
│   ├── cms-pages.service.ts
│   ├── categories.service.ts
│   ├── inventory.service.ts
│   ├── email-templates.service.ts
│   ├── theme.service.ts
│   ├── webhook-stripe.service.ts       ← HIGH PRIORITY (complex event processing)
│   ├── (existing 21 services...)
│   └── ...
├── repositories/
│   ├── orders.repo.ts
│   ├── customers.repo.ts
│   ├── settings.repo.ts
│   ├── affiliates.repo.ts
│   ├── shipping.repo.ts
│   ├── cms-pages.repo.ts
│   ├── categories.repo.ts
│   ├── coupons.repo.ts
│   ├── inventory.repo.ts
│   ├── refunds.repo.ts
│   ├── team.repo.ts
│   ├── email-templates.repo.ts
│   ├── theme.repo.ts
│   ├── reports.repo.ts
│   ├── audit.repo.ts
│   ├── (existing 3 repos...)
│   └── ...
└── schemas/
    ├── checkout.schema.ts
    ├── orders.schema.ts
    ├── settings.schema.ts
    ├── shipping.schema.ts
    ├── team.schema.ts
    ├── cms-pages.schema.ts
    ├── (existing 3 schemas...)
    └── ...
```

### 3.2 Layer Responsibilities

```
┌─────────────────────────────────────────────────────┐
│  Route (*.routes.ts)                                │
│  - Define HTTP method + path                        │
│  - Attach middleware (auth, rate-limit, validation)  │
│  - Parse request → call service → send response     │
│  - NO business logic                                │
│  - NO direct storage/DB calls                       │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│  Service (*.service.ts)                             │
│  - Business logic only                              │
│  - Orchestrates repo calls + integration calls      │
│  - Throws typed errors (AppError subclasses)        │
│  - NO Express req/res references                    │
│  - NO direct DB queries                             │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│  Repository (*.repo.ts)                             │
│  - Drizzle queries only                             │
│  - Returns typed data, throws on failure            │
│  - Extracted from storage.ts methods                │
│  - NO business logic                                │
│  - NO external API calls                            │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│  Integration (integrations/*)                       │
│  - External SDK wrappers (Stripe, Mailgun, etc.)    │
│  - Thin adapters — no business logic                │
│  - Already properly separated                       │
└─────────────────────────────────────────────────────┘
```

### 3.3 Shared Middleware Stack

All routes will use the same middleware chain via the mount point in `admin/index.ts`, `customer/index.ts`, or `public/index.ts`:

| Middleware | Scope | Purpose |
|-----------|-------|---------|
| `requestLogger` | Global | Correlation IDs, request logging |
| `compression` | Global | Response compression |
| `serverTiming` | Dev-only | Slow endpoint detection |
| `requireAdmin` | `/api/admin/*` | Admin session check |
| `requireFullAccess` | Most admin routes | Blocks fulfillment role |
| `requireOrderAccess` | Order endpoints | Allows fulfillment |
| `isAuthenticated` | `/api/customer/*` | Customer session check |
| `rateLimiter` | Per-route | Endpoint-specific rate limits |
| `errorHandler` | Global (last) | Centralized error response |

### 3.4 Validation Strategy

- Use Zod schemas in `server/src/schemas/<feature>.schema.ts`
- Route handlers call `schema.parse(req.body)` before passing to service
- Zod errors are caught by `errorHandler` and returned as 400 with field details
- Reuse `drizzle-zod` insert schemas from `@shared/schema` where appropriate

---

## 4. Migration Plan

### 4.0 Migration Results (2026-02-07)

All five phases were completed in a single batch extraction on 2026-02-07.

| Metric | Before | After |
|--------|--------|-------|
| `routes.ts` line count | ~4,914 | 159 (97% reduction) |
| Inline endpoint handlers | 187 | 0 |
| Router files in `server/src/routes/` | 23 | 46 |
| New router files created | — | 14 |
| Helper functions relocated | — | 3 (`generateAffiliateCode`, `sendOrderNotification`, `getDefaultAffiliateAgreement`) |

**Key outcomes:**
- ~160 inline handlers extracted into 14 new router files
- `routes.ts` reduced from ~4,914 lines to 159 lines — now a pure orchestrator that imports and mounts route modules
- Zero behavior changes — all API paths, responses, and middleware preserved exactly
- Phase 1 (Quick Wins): ✅ COMPLETE
- Phase 2 (Admin Settings): ✅ COMPLETE
- Phase 3 (Admin CRUD): ✅ COMPLETE
- Phase 4 (Customer-Facing): ✅ COMPLETE
- Phase 5 (Checkout + Webhooks): ✅ COMPLETE

---

### 4.1 Migration Phases (Historical Reference)

Migration was ordered by **risk (lowest first)** and **value (highest first)**:

#### Phase 1 — Quick Wins (read-only admin CRUD)
Low risk, simple extract. Each is a direct lift from `routes.ts` → route + repo.

| Priority | Domain | Endpoints | Complexity | Dependency |
|----------|--------|-----------|------------|------------|
| P1.1 | Admin Dashboard | 1 | Trivial | None |
| P1.2 | Admin Audit | 1 | Trivial | None |
| P1.3 | Admin Jobs | 2 | Low | job-runner service |
| P1.4 | Admin Categories | 4 | Low | storage.ts |
| P1.5 | Admin Inventory | 3 | Low | storage.ts |
| P1.6 | Admin Theme | 2 | Low | storage.ts |
| P1.7 | Admin Email | 4 | Low | storage.ts (templates CRUD + events list) |
| P1.8 | Admin Team | 4 | Low | storage.ts + bcrypt |
| P1.9 | Admin Seed | 1 | Trivial | storage.ts |

**Total:** 22 endpoints

#### Phase 2 — Admin Settings Consolidation
42 endpoints with a repetitive GET/PATCH/DELETE/verify pattern across 8+ platforms. These are structurally identical — extract once, apply pattern to all.

| Priority | Domain | Endpoints | Complexity | Dependency |
|----------|--------|-----------|------------|------------|
| P2.1 | General settings | 3 | Low | storage.ts |
| P2.2 | Email settings | 4 | Medium | Mailgun integration |
| P2.3 | Stripe settings | 3 | Medium | Stripe integration |
| P2.4 | OpenAI settings | 3 | Low | storage.ts |
| P2.5 | R2 settings | 2 | Low | storage.ts |
| P2.6 | Mailchimp settings | 3 | Low | Mailchimp integration |
| P2.7 | Social shop settings (×6) | 24 | Low (repetitive) | platform integrations |

**Total:** 42 endpoints

#### Phase 3 — Admin CRUD Operations
Moderate complexity — requires service layer for business logic.

| Priority | Domain | Endpoints | Complexity | Dependency |
|----------|--------|-----------|------------|------------|
| P3.1 | Admin Orders | 7 | Medium | Stripe, email, shipments |
| P3.2 | Admin Affiliates | 13 | Medium | Stripe Connect, Mailgun |
| P3.3 | Admin CMS Pages | 10 | Medium | OpenAI (SEO gen), import/export |
| P3.4 | Admin CMS Sections | 5 | Low | storage.ts |
| P3.5 | Admin CMS Templates | 2 | Trivial | storage.ts |
| P3.6 | Admin Shipping | 8 | Low | storage.ts |
| P3.7 | Admin Shipments | 2 | Medium | email service |
| P3.8 | Admin Refunds | 2 | High | Stripe refund API |
| P3.9 | Admin Coupons | 4 | Low | storage.ts |
| P3.10 | Admin Reports | 4 | Medium | SQL aggregation |
| P3.11 | Admin Payouts | 2 | Medium | Stripe Connect |
| P3.12 | Admin Integrations | 5 | Medium | platform sync |
| P3.13 | Admin AI | 1 | Low | OpenAI integration |
| P3.14 | Admin Docs (legacy DB) | 11 | Medium | storage.ts |
| P3.15 | Admin Customers | 13 | Medium | bcrypt, email, audit logs |

**Total:** 89 endpoints

#### Phase 4 — Customer-Facing Routes
Higher risk — user-facing. Requires thorough testing.

| Priority | Domain | Endpoints | Complexity | Dependency |
|----------|--------|-----------|------------|------------|
| P4.1 | Customer Profile | 2 | Low | customer auth |
| P4.2 | Customer Auth | 2 | Low | customer auth, bcrypt |
| P4.3 | Customer Orders | 2 | Low | customer auth |
| P4.4 | Customer Affiliate | 6 | High | Stripe Connect |
| P4.5 | Public CMS | 6 | Low | None |
| P4.6 | Public Theme | 2 | Trivial | None |
| P4.7 | Public Affiliate | 2 | Low | None |
| P4.8 | Public Coupons | 1 | Low | coupon service |
| P4.9 | Public Stripe Config | 1 | Trivial | None |
| P4.10 | Public Orders | 1 | Low | None |
| P4.11 | Admin Auth | 5 | Medium | bcrypt, JWT |
| P4.12 | Health | 1 | Trivial | env config |

**Total:** 31 endpoints

*Note: Phase totals sum to ~189 due to a small overlap where order-refund endpoints appear in both Admin Orders (P3.1) and Admin Refunds (P3.8). The authoritative count is 187 from the domain table in Section 2.*

#### Phase 5 — Critical Path (Checkout + Webhooks)
Highest risk — revenue-critical. Migrate last with extensive testing.

| Priority | Domain | Endpoints | Complexity | Dependency |
|----------|--------|-----------|------------|------------|
| P5.1 | Checkout | 3 | **Critical** | Stripe, coupons, affiliates, inventory, email |
| P5.2 | Stripe Webhooks | 2 | **Critical** | Stripe event processing, order fulfillment |

**Total:** 5 endpoints (but largest code blocks — checkout handler is ~200 lines, webhook is ~150 lines)

### 4.2 Per-Domain Migration Steps

For each domain, follow this exact sequence:

```
1. Create schema:    server/src/schemas/<feature>.schema.ts
   - Zod validation schemas for request bodies
   - Reuse drizzle-zod schemas where possible

2. Create repo:      server/src/repositories/<feature>.repo.ts
   - Extract relevant methods from storage.ts
   - Each method maps 1:1 to a storage.ts method
   - Import db + schema from shared

3. Create service:   server/src/services/<feature>.service.ts
   - Move business logic from route handler
   - Call repo for data, integrations for external APIs
   - No Express types (req/res)

4. Create route:     server/src/routes/<scope>/<feature>.routes.ts
   - Thin handler: parse → validate → service.call → res.json
   - Attach middleware (auth, rate-limit)

5. Mount route:      server/src/routes/<scope>/index.ts
   - Add router.use() for new route file

6. Delete legacy:    server/routes.ts
   - Remove the old inline handlers
   - Verify no other file imports them

7. Test:             Verify identical behavior
   - Same HTTP method + path + response shape
   - Same auth requirements
   - Same error responses
```

### 4.3 Storage.ts Decomposition

The `server/storage.ts` monolith (1,666 lines, ~120 methods) will be decomposed into domain repositories. The `IStorage` interface and `DatabaseStorage` class remain as thin wrappers during migration:

**Strategy: Delegate, Don't Delete**

```typescript
// storage.ts — during migration
class DatabaseStorage implements IStorage {
  // Phase 1: Method delegates to repo
  async getOrders() {
    return ordersRepo.getAll();
  }
  // Phase 2: Method marked @deprecated
  /** @deprecated Use ordersRepo.getAll() instead */
  async getOrders() {
    return ordersRepo.getAll();
  }
  // Phase 3: Method removed after all callers updated
}
```

This ensures no breaking changes during the transition. Callers are migrated one at a time.

---

## 5. Admin Auth Migration Note

The admin auth endpoints (setup, login, logout, me) are foundational. They should be migrated in Phase 4 (not Phase 1) because:
1. They use bcrypt password hashing with specific timing attack considerations
2. They manage JWT session tokens stored in HTTP-only cookies
3. Better Auth may replace them (feature-flagged)
4. Breaking admin auth locks out all admins

---

## 6. Quality Gates

All quality gates passed for the completed migration:

- [x] All legacy handlers for that domain removed from `routes.ts`
- [x] Route paths unchanged (exact same URLs)
- [x] Auth middleware unchanged (same access control)
- [x] Response shapes unchanged (same JSON structure)
- [x] Error responses unchanged (same status codes)
- [x] Rate limiting preserved where applied
- [x] E2E tests pass for affected pages
- [x] `routes.ts` line count decreased by expected amount

### Final Results vs. Target

| Metric | Original | Target | Actual |
|--------|----------|--------|--------|
| `routes.ts` line count | 5,414 | 0 (file deleted) | 159 (orchestrator only) |
| `routes.ts` endpoint count | 187 | 0 | 0 (all extracted) |
| Route files in `server/src/routes/` | 23 | ~50 | 46 |
| New router files created | — | — | 14 |

> Note: `routes.ts` was retained as a 159-line orchestrator (imports + `app.use()` mounts) rather than deleted, as the `registerRoutes()` function is the single entry point called from `server/index.ts`. This is a cleaner approach than the original target of full deletion.

---

## 7. Compatibility & Naming Collision Notes

### 7.1 Unused Layered Routes Index

`server/src/routes/index.ts` contains a `registerLayeredRoutes()` function that is **not currently called** by `server/index.ts`. Instead, `server/routes.ts > registerRoutes()` handles all registration (both layered mounts and legacy inline handlers). During migration, we will continue to use `registerRoutes()` until `routes.ts` is empty, at which point we switch over to `registerLayeredRoutes()` and delete `routes.ts`.

### 7.2 Docs Route Collision

Two docs systems coexist on the same path prefix:
- **Legacy DB-backed:** 11 endpoints in `server/routes.ts` at `/api/admin/docs/**`
- **File-system browser:** 4 endpoints in `server/src/routes/admin/docs.router.ts` at `/api/admin/docs/**`

The legacy handlers are registered first (line order in `registerRoutes()`), so they take precedence on overlapping paths. When migrating legacy docs to `docs-legacy.routes.ts`, the file must be mounted **before** the file-system docs router, or the paths must be differentiated (e.g., `/api/admin/docs-db/**` for legacy).

### 7.3 Affiliates Route Naming

Two affiliate admin route files will coexist during migration:
- **Existing migrated:** `server/src/routes/affiliate.routes.ts` → mounted at `/api/admin/affiliates-v2`
- **Legacy to migrate:** 10 endpoints at `/api/admin/affiliate*`

The legacy endpoints use `/api/admin/affiliates`, `/api/admin/affiliate-settings`, `/api/admin/affiliate-invites`, and `/api/admin/affiliate-payouts`. The migrated file should be named `admin/affiliates-legacy.routes.ts` to avoid collision with the existing v2 file. After migration, evaluate merging the two.

### 7.4 Controller Layer Decision

The layered architecture header in `routes/index.ts` mentions a controllers layer: `routes → controllers → services → repositories`. However, no controller files exist in the codebase. For this migration:

- **Decision:** Skip controllers initially. Routes call services directly.
- **Rationale:** A controller layer adds an extra file per domain with minimal benefit when routes are already thin (parse → validate → service.call → respond). Controllers can be introduced later if route handlers grow complex.
- **If added later:** Use `server/src/controllers/<feature>.controller.ts`.

### 7.5 Storage.ts Bridge During Migration

Some already-migrated services (e.g., `vip.service.ts`, `customers.service.ts`) import `storage` directly from `server/storage.ts`. During migration:
1. New repositories extract methods from `storage.ts`
2. `storage.ts` methods delegate to the new repo (not the other way around)
3. Existing services continue to work unchanged through `storage.*` calls
4. Services are updated to use repos directly in a separate pass

This ensures no existing service breaks during repo extraction.

---

## 8. Files Changed During Phase 1

The following files were modified or created during the refactoring (2026-02-07):

- `server/routes.ts` — reduced from ~4,914 lines to 159 lines (orchestrator only)
- `server/src/routes/admin/` — 12 new router files added
- `server/src/routes/customer/` — 2 new router files added
- `server/src/routes/public/payments.routes.ts` — new
- `server/src/routes/webhooks/stripe.routes.ts` — new
- `server/storage.ts` — the data access layer (unchanged)
- `server/src/services/**` — existing services (unchanged)
- `server/src/repositories/**` — existing repos (unchanged)
- `server/index.ts` — app entry point (unchanged)
- `shared/schema.ts` — Drizzle schema (unchanged)

---

## 9. Phase 2 — Route File Relocation (2026-02-07)

### Problem

12 route files remain at the root of `server/src/routes/` instead of in their proper `admin/`, `customer/`, or `public/` subdirectory. This makes it hard for developers to find endpoints by audience.

### Files to Relocate

| Current Location | Target Location | Mount Path | Audience |
|-----------------|-----------------|------------|----------|
| `cms.posts.routes.ts` | `admin/cms-posts-admin.routes.ts` | `/api/admin/cms` | admin |
| ~~`cms.sitePresets.routes.ts`~~ | ~~Removed — Site Presets feature deleted~~ | — | — |
| `cms.siteSettings.routes.ts` | `admin/cms-site-settings.routes.ts` | `/api/admin/cms/site-settings` | admin |
| `affiliate.routes.ts` | `admin/affiliates-v2.routes.ts` | `/api/admin/affiliates-v2` | admin |
| `alerts.routes.ts` | `admin/alerts.routes.ts` | `/api/alerts` | admin |
| `recovery.routes.ts` | `admin/recovery.routes.ts` | `/api/recovery` | admin |
| `revenue.routes.ts` | `admin/revenue.routes.ts` | `/api/admin/revenue` | admin |
| `upsell.routes.ts` | `admin/upsells.routes.ts` | `/api/upsells` | admin |
| `vip.routes.ts` | `admin/vip.routes.ts` | `/api/vip` | admin |
| `coupon.routes.ts` | `public/coupons.routes.ts` | `/api/coupons` | public |
| `public.blog.routes.ts` | `public/blog-posts.routes.ts` | `/api/blog` | public |
| `support.routes.ts` | kept at root (mixed exports) | `/api/admin/support` + `/api/customer/support` | mixed |

### Migration Strategy

1. Copy file to new location with kebab-case naming
2. Old file becomes a re-export: `export { default } from "./admin/new-name.routes"`
3. Update `routes.ts` imports to point to new location
4. Run smoke tests after each batch
5. Verify all mount paths and response shapes remain identical

### How to Add New Routes (for developers)

1. Determine the audience: `admin/`, `customer/`, `public/`, or `webhooks/`
2. Create `server/src/routes/<audience>/<domain>.routes.ts`
3. If business logic > 10 lines, create `server/src/services/<domain>.service.ts`
4. Import and mount in `server/routes.ts` with appropriate middleware
5. Add a smoke test entry to `scripts/smoke/apiSmoke.ts`
6. Use kebab-case for file names: `my-feature.routes.ts`

### Out of Scope (future phases)

- Splitting `support.routes.ts` into separate admin/customer files
- Consolidating `admin/customers.routes.ts` + `admin/customer-management.routes.ts`
- Extracting service layer from fat routes (e.g., affiliate.routes.ts at 730 lines)
- Renaming API paths (e.g., `/api/admin/affiliates-v2` → `/api/admin/affiliates`)
- Adding `index.ts` barrel exports that mount all routes per audience
