# Power Plunge E-Commerce Website

## Overview
Power Plunge is developing a comprehensive, dark-themed e-commerce platform for selling cold plunge tanks. The project aims to provide a seamless sales experience with a visually appealing landing page, robust shopping cart functionality, and a secure checkout process. Beyond sales, the platform includes a full-stack system for order management, integrated payment processing with Stripe, automated email notifications, and an intuitive admin content management system (CMS). A key business driver is the implementation of a comprehensive affiliate program to expand market reach. The system is designed to provide deep revenue intelligence, guardrails, and customer lifecycle management including VIP programs and upsell systems.

## User Preferences
I want to prioritize a clear and efficient development process.
I prefer detailed explanations for complex architectural decisions.
I like an iterative approach to feature development, with frequent, small commits.
Please ask for confirmation before making significant changes to core functionalities or database schemas.
I prefer to use modern JavaScript/TypeScript practices and maintain a clean, readable codebase.
Do not make changes to the `docs` folder without explicit instruction.
Ensure all new features are accompanied by relevant updates to documentation.

## System Architecture
The Power Plunge e-commerce platform utilizes a modern full-stack architecture.

**Frontend:**
- Built with React and Vite, designed for a dark theme with icy blue accents (#67e8f9 primary).
- Uses Inter font throughout for all text (headings, body, and UI elements).
- Core pages include `home.tsx` (product display, cart), `checkout.tsx` (customer info, affiliate tracking), `order-success.tsx`, and `my-account.tsx` (customer dashboard, order history, affiliate portal).
- Admin interface pages (`admin-login.tsx`, `admin-orders.tsx`, `admin-products.tsx`, etc.) provide comprehensive management tools.
- Upsell components (`CartUpsells.tsx`, `PostPurchaseOffer.tsx`) are integrated for enhancing sales.
- Customer accounts use a custom authentication system with email/password and magic link (passwordless) login options. The authentication is Power Plunge branded with no Replit references visible to customers. Session tokens are stored in localStorage and passed as Bearer tokens in API requests.
- VIP customer program includes auto-promotion triggers (spend/order thresholds), configurable benefits (free shipping, discounts, priority support), and progress tracking in My Account.

**Backend:**
- Developed with Express, adopting a layered, modular architecture (`server/src/`).
- Includes dedicated modules for configuration (`config/`), database interactions (`db/`), middleware (`middleware/` for logging, error handling, authentication), and custom error handling (`errors/`).
- Integrations with external services are encapsulated in `integrations/` (Stripe, Mailgun, Replit Auth, Replit Object Storage).
- Database operations are managed via Drizzle ORM, connected to a PostgreSQL database.
- A comprehensive database schema supports products, orders, customers, admin users, site settings, affiliates, documentation, and various analytical and operational entities (e.g., `productRelationships`, `upsellRules`, `vipSettings`).
- An internal documentation library, accessible via `/admin/docs`, supports Markdown editing, versioning, and search.

**Key Features:**
- **Admin CMS:** Comprehensive dashboards for order, product, team, customer, and affiliate management. Features include a Customer Profile Drawer with audit logs and tagging, manual order creation, and a searchable customer list.
- **Role-Based Access Control:** Three admin roles (admin, store_manager, fulfillment) with enforced permissions at both API and UI levels. Fulfillment role has restricted access to orders only - no access to Stripe keys, refunds, pricing, affiliates, payouts, or sensitive settings. Backend uses `requireFullAccess` middleware to block fulfillment from 50+ sensitive endpoints. Frontend conditionally renders navigation and shows "Access Denied" for restricted pages.
- **Affiliate Program:** Invite-only signup (requires valid invite code) with a 6-step onboarding wizard (Welcome → Account Details → Agreement → Payout Setup → Affiliate Code → Complete). The wizard guides affiliates through Stripe Connect setup and affiliate code customization during onboarding. Admin invite sender page at `/admin/affiliate-invite-sender` with Mailgun email delivery, customer-facing portal, e-sign agreements, configurable commission rates, minimum payout thresholds, cookie-based referral tracking, admin payout management, and fraud/compliance guardrails (self-referral detection, coupon abuse blocking, flagged commission review queue). POST /api/affiliate-signup returns onboarding metadata. Analytics events tracked during wizard flow. Public "Become an Affiliate" links removed from homepage.
- **PWA Support:** Web app manifest and Apple mobile meta tags for iPhone home-screen shortcut. Theme color: #0891b2.
- **Upsell/Cross-sell System:** Product relationships (upsell, cross-sell), cart upsells, one-click post-purchase offers, and analytics tracking.
- **Revenue-Aware Coupons:** Performance analytics, affiliate overlap detection, stacking rules, and auto-expiration for underperforming coupons.
- **Checkout Recovery System:** Tracks abandoned carts and failed payments, triggers recovery emails, and provides analytics on lost and recovered revenue.
- **Revenue Guardrails:** Monitors critical metrics (refund rate, affiliate commission, AOV, webhook failures), provides alerts with configurable thresholds, and includes an admin dashboard for management.
- **Developer Observability:** Request logging with correlation IDs, centralized error handling, and environment validation script (`scripts/doctor.ts`).
- **Background Job System:** Lightweight in-process job runner for scheduled tasks. Jobs include weekly affiliate payouts, daily commission auto-approval, and daily metrics aggregation. Features duplicate prevention via unique run keys, success/failure logging to database and audit logs, and an admin monitoring endpoint (`/api/admin/jobs/status`).

## Better Auth Integration (Feature-Flagged)

A new authentication system using Better Auth is being integrated alongside existing auth systems. This migration follows a non-destructive, parallel operation approach.

**Status:** Feature-flagged (disabled by default via `USE_BETTER_AUTH=false`)

**Key Components:**
- `server/src/auth/betterAuth.ts` - Better Auth configuration with Drizzle adapter
- `server/src/auth/betterAuthRoutes.ts` - Routes mounted at `/api/auth/*`
- `server/src/middleware/requireBetterAuth.ts` - RBAC middleware for protected routes
- `shared/models/better-auth.ts` - Database schema (better_auth_* tables)
- `client/src/lib/authClient.ts` - React client integration
- `client/src/hooks/use-better-auth.ts` - React hook for auth state
- `client/src/pages/better-auth-login.tsx` - Login page at `/auth/login`
- `client/src/pages/better-auth-register.tsx` - Register page at `/auth/register`
- `server/src/migrations/betterAuthMigration.ts` - User migration utilities

**Environment Variables:**
- `USE_BETTER_AUTH` - Feature flag (true/false)
- `BETTER_AUTH_SECRET` - Session encryption secret (required)

**Roles:** customer, admin, superadmin, store_manager, fulfillment

**Enabling Better Auth:**
1. Set `USE_BETTER_AUTH=true` in environment
2. Restart the application
3. Users can access `/auth/login` and `/auth/register`

**Migration Strategy:**
Run the migration script to copy existing users to Better Auth tables without modifying original data.

## CMS Page Builder (Data Model)

The CMS pages system supports a block-based page builder architecture for creating custom landing pages, the home page, and shop page.

**Schema Fields (pages table):**
- `pageType` - Type of page: `home` | `shop` | `landing` | `page`
- `contentJson` - JSONB field for structured block-based content
- `isHome` - Boolean flag (only one page can be true, enforced at storage layer)
- `isShop` - Boolean flag (only one page can be true, enforced at storage layer)
- `template` - Optional template name: `default` | `hero-left` | `hero-center` | etc.
- `featuredImage` - OG image for social sharing
- `content` - Legacy HTML content field (kept for backward compatibility)

**Site Settings:**
- `featuredProductId` - ID of the featured product for homepage/shop display

**API Endpoints:**
- `POST /api/admin/pages/:id/set-home` - Set page as home page (clears other home pages)
- `POST /api/admin/pages/:id/set-shop` - Set page as shop page (clears other shop pages)
- `GET /api/pages/home` - Get the published home page
- `GET /api/pages/shop` - Get the published shop page
- `GET /api/site-settings` - Public endpoint returning featuredProductId and hero config

**Uniqueness Enforcement:**
The storage layer enforces that only one page can have `isHome=true` and only one can have `isShop=true`. When setting a new home/shop page, the previous one is automatically cleared.

**Server Startup Behavior:**
On server start, `ensureCmsDefaults()` runs to:
1. Create default home and shop CMS pages if none exist (with valid contentJson blocks)
2. Set `featuredProductId` from first active product if not already configured
This ensures the CMS is always in a functional state without manual seeding.

## App Docs System (File-System Based)

The documentation system is a file-system-based read-only browser accessible from the admin area. It replaced the previous database-backed docs library.

**Architecture:**
- Source of truth: `docs/` directory with numbered category folders (01-GETTING-STARTED through 18-FUNCTIONAL-DOCS)
- Backend: `server/src/routes/admin/docs.router.ts` with 4 endpoints (list, read, sync, coverage)
- Route Scanner: `server/src/utils/routeScanner.ts` auto-generates API reference docs from Express route files
- Frontend: Doc Browser at `/admin/docs` and Coverage Dashboard at `/admin/docs-coverage`
- Custom MarkdownRenderer (no external library) handles headings, lists, code blocks, tables, inline formatting

**API Endpoints:**
- `GET /api/admin/docs` — List all docs grouped by category
- `GET /api/admin/docs/:docPath` — Read a single doc (path uses `__` as separator)
- `POST /api/admin/docs/sync` — Auto-generate API registry docs in `docs/17-API-REGISTRY/`
- `GET /api/admin/docs/coverage` — Coverage report for API and functional docs

**Key Design:**
- No database — plain `.md` files on disk, scanned per request
- API registry docs preserve manual notes between syncs using HTML comment markers
- Coverage tracks required functional docs in `docs/18-FUNCTIONAL-DOCS/`

## Removed Features (Database Tables Retained)
- **A/B Testing/Experiments:** UI and API removed. Database tables (`experiments`, `experiment_assignments`, `experiment_conversions`) retained for historical data preservation.

## External Dependencies
- **Stripe:** For payment processing (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`).
- **Mailgun:** For email services (email notifications, via `SENDGRID_API_KEY` - assuming Mailgun integration despite SendGrid variable name as per `server/src/integrations/mailgun/`).
- **Replit Auth:** For customer authentication (Google, Apple, email/password login).
- **Replit Object Storage:** For file uploads and storage.
- **PostgreSQL:** Primary database.
- **Drizzle ORM:** Used for database interaction.
- **Better Auth:** Feature-flagged authentication system (parallel to existing auth).