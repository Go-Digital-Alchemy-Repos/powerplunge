# System Overview

Power Plunge is a full-stack e-commerce platform for selling cold plunge tanks. This document describes the current state of all major subsystems as of the latest stabilization pass (S1–S7).

## Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 18 + Vite | Dark theme, Inter font, Tailwind CSS |
| Backend | Express 4 | Layered architecture under `server/src/` |
| Database | PostgreSQL (Neon) | 65 tables managed by Drizzle ORM |
| Payments | Stripe | Checkout, webhooks, Stripe Connect for affiliates |
| Email | Mailgun | Transactional emails, recovery flows |
| Auth | Custom + Replit Auth | Email/password, magic link, Google/Apple via Replit |
| Storage | Replit Object Storage / Cloudflare R2 | File uploads, media |
| CMS | CMS (block-based) | Feature-flagged via `CMS_ENABLED` |

## Subsystem Status

### Storefront

- Homepage, Shop, Product detail, Cart, Checkout, Order confirmation
- Upsell system: cart upsells, post-purchase one-click offers
- VIP program: auto-promotion, configurable benefits
- PWA manifest for home-screen install

### Admin

- Role-based access: `admin`, `store_manager`, `fulfillment`
- Dashboards: orders, products, customers, team, affiliates, coupons, shipping, reports
- Customer Profile Drawer with audit logs and tagging
- Manual order creation
- Email template management

### CMS

Feature-flagged (`CMS_ENABLED=true`). Block-based page builder with:

- 24 registered block types across 6 categories (12 core + 12 Power Plunge domain-specific)
- Saved sections with section kits
- 10 CSS-variable theme presets
- Theme packs (5 curated design identities)
- Landing page generator (4-step wizard)
- Campaign packs (coordinated multi-page generation)
- Site presets (full-site composition with preview/activate/rollback)
- Content validation (server-side shape checking on save)
- HTML sanitization (scripts, event handlers, javascript: URIs stripped on save and render)
- Error boundary wrapping all CMS admin routes

**Key files:**

```
server/src/routes/admin/cms.router.ts     -- All CMS API endpoints
server/src/services/cms.service.ts        -- Business logic
server/src/repositories/cms.repository.ts -- Database queries
server/src/utils/contentValidation.ts        -- validateContentJson + sanitizeHtml
client/src/cms/blocks/                       -- Block registry, components, schemas
client/src/cms/themes/                       -- Theme tokens, presets, apply logic
client/src/components/PageRenderer.tsx       -- Public page block renderer
client/src/components/CmsErrorBoundary.tsx  -- Error boundary for admin routes
```

### Affiliate Program

- Invite-only signup with 5-step onboarding wizard (Welcome, Account, Agreement, Payout, Complete)
- Stripe Connect payout integration
- Cookie-based referral tracking
- Commission management with auto-approval
- Fraud/compliance guardrails (self-referral, coupon abuse, flagged queue)
- Admin invite sender with Mailgun delivery

### Background Jobs

Lightweight in-process job runner with four registered jobs:

| Job | Schedule | Purpose |
|-----|----------|---------|
| `affiliate_payout` | Weekly | Process pending affiliate payouts |
| `commission_approval` | Daily | Auto-approve eligible commissions |
| `metrics_aggregation` | Daily | Aggregate daily revenue/order metrics |
| `recovery_emails` | Daily | Send abandoned cart recovery emails |

### Revenue Guardrails

Monitors refund rate, affiliate commission ratio, AOV, and webhook failures. Configurable alert thresholds with admin dashboard.

### Checkout Recovery

Tracks abandoned carts and failed payments, triggers recovery emails, analytics on lost/recovered revenue.

### Revenue-Aware Coupons

Performance analytics, affiliate overlap detection, stacking rules, auto-expiration for underperformers.

### Developer Observability

- Request logging with correlation IDs
- Centralized error handling middleware
- Environment validation script (`scripts/doctor.ts`)
- Schema verification script (`scripts/db/verifySchema.ts`)
- CMS content safety regression tests (`scripts/smoke/cmsContentSafety.ts`)
- CMS parity check (`scripts/cmsParityCheck.ts`)

## Database

65 tables in PostgreSQL, managed by Drizzle ORM. Schema defined in `shared/schema.ts`.

Key table groups:
- **Products & Orders:** `products`, `orders`, `order_items`, `categories`
- **Customers:** `customers`, `customer_tags`, `customer_notes`, `customer_magic_link_tokens`
- **Affiliates:** `affiliates`, `affiliate_clicks`, `affiliate_referrals`, `affiliate_payouts`, `affiliate_agreements`, `affiliate_invites`, `affiliate_payout_accounts`, `affiliate_settings`
- **CMS:** `pages`, `saved_sections`, `site_presets`, `site_settings`, `preset_apply_history`
- **Coupons:** `coupons`, `coupon_redemptions`, `coupon_stacking_rules`
- **Email:** `email_templates`, `email_settings`, `email_events`
- **Admin:** `admin_users`, `admin_audit_logs`, `admin_notification_prefs`
- **Analytics:** `daily_metrics`, `abandoned_carts`, `recovery_events`
- **Upsells:** `product_relationships`, `upsell_rules`
- **VIP:** `vip_settings`

Seed logic is idempotent: `ensureCmsDefaults()`, `seedDatabase()`, section kits, and site presets all check for existing data before inserting.

## Environment Variables

### Required

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `STRIPE_SECRET_KEY` | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification |

### Optional / Feature Flags

| Variable | Default | Purpose |
|----------|---------|---------|
| `CMS_ENABLED` | `false` | Enable CMS block builder |
| `USE_BETTER_AUTH` | `false` | Enable Better Auth integration |
| `BETTER_AUTH_SECRET` | — | Session encryption for Better Auth |
| `SENDGRID_API_KEY` | — | Mailgun API key (legacy variable name) |
| `CLOUDFLARE_R2_*` | — | R2 object storage credentials |

## Server Startup

On startup, the server:

1. Connects to PostgreSQL
2. Runs `ensureCmsDefaults()` to seed home/shop pages if missing
3. Mounts all route handlers (including CMS if enabled)
4. Registers and starts background job runner (4 jobs)
5. Serves the Vite-built frontend on port 5000

## Related Documentation

- [Project Structure](../02-ARCHITECTURE/PROJECT_STRUCTURE.md)
- [CMS Overview](../19-CMS/01-OVERVIEW.md)
- [CMS API Reference](../19-CMS/09-API-REFERENCE.md)
- [Scripts Reference](../09-TESTING/SCRIPTS.md)
- [Troubleshooting](../14-TROUBLESHOOTING/TOP_10_ISSUES.md)
