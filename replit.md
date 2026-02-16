# Power Plunge E-Commerce Website

## Overview
Power Plunge is developing a comprehensive, dark-themed e-commerce platform for selling cold plunge tanks. The project aims to provide a seamless sales experience with a visually appealing landing page, robust shopping cart functionality, and a secure checkout process. The platform includes a full-stack system for order management, integrated payment processing, automated email notifications, and an intuitive admin content management system (CMS). A key business driver is the implementation of a comprehensive affiliate program to expand market reach. The system is designed to provide deep revenue intelligence, guardrails, and customer lifecycle management including VIP programs and upsell systems.

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
- Uses Inter font throughout for all text.
- Core pages include product display, checkout, order success, and a customer dashboard with order history and an affiliate portal.
- Admin interface pages provide comprehensive management tools.
- Upsell components are integrated for enhancing sales.
- Customer accounts use a custom authentication system with email/password and magic link login options. Session tokens are stored in localStorage and passed as Bearer tokens.
- VIP customer program includes auto-promotion triggers, configurable benefits, and progress tracking.

**Admin UI Design System:**
- Admin pages use a dark design system: bg-gray-950 (page), bg-gray-900/50 (cards), border-gray-800/60.
- CMS pages use `CmsLayout` for consistent sidebar + topbar chrome.
- Reusable primitives in `client/src/components/admin/AdminPagePrimitives.tsx`.

**Backend:**
- Developed with Express, adopting a layered, modular architecture.
- **Route Architecture:** API routes are organized into dedicated router files grouped by domain (admin, customer, public, webhooks) under `server/src/routes/{admin,public,customer,webhooks}/`. Middleware is applied at the mount level.
- Includes dedicated modules for configuration, database interactions, middleware (logging, error handling, authentication), and custom error handling.
- Integrations with external services are encapsulated.
- Database operations are managed via Drizzle ORM, connected to a PostgreSQL database.
- A comprehensive database schema supports products, orders, customers, admin users, site settings, affiliates, documentation, and analytical/operational entities.
- An internal documentation library, accessible via `/admin/docs`, supports Markdown editing, versioning, and search.

**Key Features:**
- **Admin CMS:** Comprehensive dashboards for order, product, team, customer, and affiliate management, including manual order creation and searchable customer list.
- **Role-Based Access Control:** Three admin roles (admin, store_manager, fulfillment) with enforced permissions at both API and UI levels.
- **Affiliate Program:** Invite-only signup with a 5-step onboarding wizard, configurable commission rates, customer discount percentage, minimum payout thresholds, cookie-based referral tracking, admin payout management, and fraud/compliance guardrails. Per-affiliate custom commission and discount rate overrides are supported (priority: affiliate custom > product-level > global defaults; friends & family always takes priority).
- **PWA Support:** Web app manifest and Apple mobile meta tags.
- **Upsell/Cross-sell System:** Product relationships, cart upsells, one-click post-purchase offers, and analytics tracking.
- **Revenue-Aware Coupons:** Performance analytics, affiliate overlap detection, stacking rules, and auto-expiration.
- **Checkout Recovery System:** Tracks abandoned carts and failed payments, triggers recovery emails, and provides analytics.
- **Revenue Guardrails:** Monitors critical metrics, provides alerts with configurable thresholds, and includes an admin dashboard.
- **Security Hardening:** Security headers middleware and CORS middleware.
- **Developer Observability:** Request logging with correlation IDs, centralized error handling, and environment validation.
- **Background Job System:** Lightweight in-process job runner for scheduled tasks with duplicate prevention and logging.
- **CMS Blog Posts & Navigation Menus:** Includes management for blog posts and navigation menus, with rich text editing, SEO fields, and drag-and-drop UI for menus.
- **CMS Page Builder:** Supports block-based page builder architecture for custom landing pages, home page, and shop page.
- **Checkout Upgrade:** Uses Stripe `AddressElement` for shipping, reprice endpoint for tax recalculation, and Stripe ExpressCheckoutElement (Apple Pay/Google Pay/Link).
- **Google Analytics Integration:** GA4 setup for page view and e-commerce event tracking.
- **Legal Pages:** Dynamic privacy policy and terms and conditions pages with rich text editing in admin and public routes.
- **Twilio Verify API Migration:** Affiliate phone verification uses Twilio's managed Verify API.
- **Page Builder Status Dropdown:** Replaced "Publish" button with a status dropdown offering Draft, Published, and Schedule options.
- **Twilio SMS Integration Settings:** Admin UI for configuring Twilio SMS, with encrypted storage for auth token.
- **Admin Settings & Branding:** Themes moved to main admin settings. Logo branding with upload, preview, and dynamic display from R2 storage.
- **Site Presets Removed:** The Site Presets feature (pre-configured site personalities) was removed in favor of the simpler theme selector under System Settings. Related database tables (`site_presets`, `preset_apply_history`), schema fields (`activePresetId`, `navPreset`, `footerPreset`), routes, services, repositories, and UI components were all removed. Campaign generator was simplified to use pack defaults only.
- **Stripe-Backed Refunds:** End-to-end refund system using Stripe as source of truth. Admin refund endpoint creates real Stripe refunds with idempotency keys. Webhook handlers sync `charge.refunded` and `refund.updated` events. Orders have a computed `paymentStatus` field (unpaid/paid/refund_pending/partially_refunded/refunded/refund_failed). Refund records track `stripeRefundId`, `source` (stripe/manual), `reasonCode`. Over-refund protection validates against refundable amount. Admin and public order APIs expose refund summary (paymentStatus, refundedAmount, refundCount). Service: `server/src/services/refund.service.ts`. Migration: `server/src/migrations/addRefundAndPaymentStatusColumns.ts`.

## External Dependencies
- **Google Analytics 4:** For product performance and customer behavior analytics.
- **Stripe:** For payment processing.
- **Mailgun:** For email services.
- **Replit Auth:** For customer authentication.
- **Replit Object Storage:** For file uploads and storage.
- **PostgreSQL:** Primary database.
- **Drizzle ORM:** Used for database interaction.
- **Twilio:** For SMS verification in affiliate invite flows.