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
- Customer accounts use a custom authentication system with email/password and magic link login options, branded for Power Plunge. Session tokens are stored in localStorage and passed as Bearer tokens.
- VIP customer program includes auto-promotion triggers, configurable benefits, and progress tracking.

**Admin UI Design System:**
- Admin pages use a dark design system: bg-gray-950 (page), bg-gray-900/50 (cards), border-gray-800/60
- CMS v2 pages use `CmsV2Layout` for consistent sidebar + topbar chrome
- Reusable primitives in `client/src/components/admin/AdminPagePrimitives.tsx`: AdminPage, AdminSection, AdminCard, AdminToolbar, AdminStat
- Theme preview is isolated — never modifies `:root` CSS variables from admin pages
- Full rules documented in `docs/architecture/ADMIN_UI_RULES.md`

**Backend:**
- Developed with Express, adopting a layered, modular architecture.
- **Route Architecture:** API routes are organized into dedicated router files grouped by domain (admin, customer, public, webhooks) under `server/src/routes/{admin,public,customer,webhooks}/` with a slim orchestrator `server/routes.ts`. Middleware (e.g., `requireAdmin`, `isAuthenticated`) is applied at the mount level. Root-level re-export stubs exist for backward compatibility.
- Includes dedicated modules for configuration, database interactions, middleware (logging, error handling, authentication), and custom error handling.
- Integrations with external services are encapsulated.
- Database operations are managed via Drizzle ORM, connected to a PostgreSQL database.
- A comprehensive database schema supports products, orders, customers, admin users, site settings, affiliates, documentation, and analytical/operational entities.
- An internal documentation library, accessible via `/admin/docs`, supports Markdown editing, versioning, and search.

**Key Features:**
- **Admin CMS:** Comprehensive dashboards for order, product, team, customer, and affiliate management, including a Customer Profile Drawer, manual order creation, and searchable customer list.
- **Role-Based Access Control:** Three admin roles (admin, store_manager, fulfillment) with enforced permissions at both API and UI levels.
- **Affiliate Program:** Invite-only signup with a 6-step onboarding wizard including Stripe Connect setup and affiliate code customization. Features include configurable commission rates, minimum payout thresholds, cookie-based referral tracking, admin payout management, and fraud/compliance guardrails.
- **PWA Support:** Web app manifest and Apple mobile meta tags.
- **Upsell/Cross-sell System:** Product relationships, cart upsells, one-click post-purchase offers, and analytics tracking.
- **Revenue-Aware Coupons:** Performance analytics, affiliate overlap detection, stacking rules, and auto-expiration.
- **Checkout Recovery System:** Tracks abandoned carts and failed payments, triggers recovery emails, and provides analytics.
- **Revenue Guardrails:** Monitors critical metrics, provides alerts with configurable thresholds, and includes an admin dashboard.
- **Developer Observability:** Request logging with correlation IDs, centralized error handling, and environment validation.
- **Background Job System:** Lightweight in-process job runner for scheduled tasks (e.g., payouts, commission auto-approval, metrics aggregation) with duplicate prevention and logging.
- **CMS v2 Blog Posts & Navigation Menus:** Includes management for blog posts and navigation menus, with rich text editing, SEO fields, and drag-and-drop UI for menus.
- **CMS Page Builder:** Supports block-based page builder architecture for custom landing pages, home page, and shop page, with uniqueness enforcement for home/shop pages and default page creation on server startup.
- **App Docs System:** File-system-based read-only documentation browser in the admin area, with auto-generation of API reference docs from Express route files.

## External Dependencies
- **Stripe:** For payment processing.
- **Mailgun:** For email services.
- **Replit Auth:** For customer authentication.
- **Replit Object Storage:** For file uploads and storage.
- **PostgreSQL:** Primary database.
- **Drizzle ORM:** Used for database interaction.
- **Better Auth:** Feature-flagged authentication system being integrated.