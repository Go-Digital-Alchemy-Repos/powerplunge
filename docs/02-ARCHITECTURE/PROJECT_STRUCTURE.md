# Power Plunge E-Commerce - Project Structure

## Overview

This document describes the reorganized project structure for Power Plunge, designed for developer clarity, maintainability, and scalability.

## Directory Structure

```
/
├── docs/                           # Project documentation
│   ├── PROJECT_STRUCTURE.md        # This file
│   └── README.md                   # Getting started guide
│
├── client/                         # Frontend (React + Vite)
│   ├── public/                     # Static assets
│   └── src/
│       ├── main.tsx                # App entrypoint
│       ├── App.tsx                 # Router setup
│       ├── index.css               # Global styles
│       │
│       ├── pages/                  # Page components (flat layout)
│       │   ├── home.tsx            # Landing page
│       │   ├── checkout.tsx        # Checkout flow
│       │   ├── my-account.tsx      # Customer dashboard
│       │   ├── admin-dashboard.tsx # Admin dashboard
│       │   ├── admin-orders.tsx    # Admin orders
│       │   ├── admin-products.tsx  # Admin products
│       │   ├── admin-customers.tsx # Admin customers
│       │   ├── admin-affiliates.tsx # Admin affiliates
│       │   ├── admin-cms*.tsx       # CMS pages (builder, pages, sections, etc.)
│       │   └── ...                 # ~40+ page components
│       │
│       ├── admin/                  # Admin-specific components
│       │   └── cms/                # CMS admin components
│       │
│       ├── cms/                    # CMS rendering components
│       │   ├── blocks/             # Block renderers
│       │   ├── layout/             # Page layouts
│       │   ├── templates/          # Page templates
│       │   ├── themes/             # Theme system
│       │   └── ui/                 # CMS-specific UI
│       │
│       ├── components/             # Shared UI components
│       │   └── ui/                 # shadcn/ui components
│       │
│       ├── hooks/                  # Shared React hooks
│       │   ├── use-auth.ts
│       │   ├── use-toast.ts
│       │   └── use-upload.ts
│       │
│       ├── lib/                    # Utilities
│       │   ├── utils.ts
│       │   ├── queryClient.ts
│       │   └── auth-utils.ts
│       │
│       └── types/                  # Client-only types
│
├── server/                         # Backend (Express)
│   ├── index.ts                    # Server entrypoint
│   ├── routes.ts                   # Route orchestrator (mounts all routers)
│   │
│   └── src/
│       ├── config/                 # Configuration
│       │   ├── env.ts              # Environment variables
│       │   └── constants.ts        # App constants
│       │
│       ├── db/                     # Database layer
│       │   ├── schema.ts           # Drizzle schema (moved from shared)
│       │   ├── index.ts            # Database connection
│       │   └── repositories/       # Data access layer
│       │       ├── products.repo.ts
│       │       ├── orders.repo.ts
│       │       ├── customers.repo.ts
│       │       ├── affiliates.repo.ts
│       │       └── ...
│       │
│       ├── routes/                 # Route definitions (46 router files)
│       │   ├── index.ts            # Route barrel exports
│       │   │
│       │   ├── admin/              # Admin-scoped routers (19 files)
│       │   │   ├── index.ts
│       │   │   ├── affiliates.routes.ts
│       │   │   ├── auth.routes.ts
│       │   │   ├── categories.routes.ts
│       │   │   ├── cms-pages.routes.ts
│       │   │   ├── cms-sections.routes.ts
│       │   │   ├── cms-templates.routes.ts
│       │   │   ├── cms-theme.routes.ts
│       │   │   ├── cms.router.ts
│       │   │   ├── coupons.routes.ts
│       │   │   ├── customer-management.routes.ts
│       │   │   ├── customers.routes.ts
│       │   │   ├── docs.router.ts
│       │   │   ├── integrations-social.routes.ts
│       │   │   ├── media.routes.ts
│       │   │   ├── operations.routes.ts
│       │   │   ├── orders.routes.ts
│       │   │   ├── products.routes.ts
│       │   │   ├── reports.routes.ts
│       │   │   ├── settings.routes.ts
│       │   │   ├── shipping.routes.ts
│       │   │   └── team.routes.ts
│       │   │
│       │   ├── customer/           # Customer-scoped routers (5 files)
│       │   │   ├── affiliate-portal.routes.ts
│       │   │   ├── affiliates.routes.ts
│       │   │   ├── auth.routes.ts
│       │   │   ├── order-tracking.routes.ts
│       │   │   └── profile.routes.ts
│       │   │
│       │   ├── public/             # Public routers — no auth (9 files)
│       │   │   ├── index.ts
│       │   │   ├── affiliate-signup.routes.ts
│       │   │   ├── affiliate-tracking.routes.ts
│       │   │   ├── cms-pages.routes.ts
│       │   │   ├── cms-sections.routes.ts
│       │   │   ├── cms-settings.routes.ts
│       │   │   ├── cms-theme.routes.ts
│       │   │   ├── order-status.routes.ts
│       │   │   ├── payments.routes.ts
│       │   │   └── products.routes.ts
│       │   │
│       │   ├── webhooks/           # Webhook routers (1 file)
│       │   │   └── stripe.routes.ts
│       │   │
│       │   ├── affiliate.routes.ts          # Shared domain routers (10 files)
│       │   ├── alerts.routes.ts
│       │   ├── cms.siteSettings.routes.ts
│       │   ├── coupon.routes.ts
│       │   ├── recovery.routes.ts
│       │   ├── revenue.routes.ts
│       │   ├── support.routes.ts
│       │   ├── upsell.routes.ts
│       │   └── vip.routes.ts
│       │
│       ├── controllers/            # HTTP request handlers
│       │   ├── public/
│       │   ├── customer/
│       │   ├── admin/
│       │   └── webhooks/
│       │
│       ├── services/               # Business logic layer
│       │   ├── products/
│       │   │   └── products.service.ts
│       │   ├── orders/
│       │   │   └── orders.service.ts
│       │   ├── payments/
│       │   │   └── payments.service.ts
│       │   ├── shipping/
│       │   │   └── shipping.service.ts
│       │   ├── email/
│       │   │   └── email.service.ts
│       │   ├── auth/
│       │   │   └── admin-auth.service.ts
│       │   └── affiliates/
│       │       └── affiliates.service.ts
│       │
│       ├── integrations/           # External service wrappers
│       │   ├── stripe/
│       │   │   ├── index.ts
│       │   │   └── StripeService.ts
│       │   ├── mailgun/
│       │   │   ├── index.ts
│       │   │   └── EmailService.ts
│       │   └── replit/
│       │       └── object-storage/
│       │
│       ├── middleware/             # Express middleware
│       │   ├── auth.middleware.ts  # Admin auth (requireAdmin, requireFullAccess)
│       │   ├── customer-auth.middleware.ts  # Customer Better Auth session
│       │   ├── error.middleware.ts # Error handling
│       │   ├── rate-limiter.ts     # Rate limiting
│       │   └── request-logger.middleware.ts
│       │
│       ├── validators/             # Request validation schemas
│       │   ├── products.validator.ts
│       │   ├── orders.validator.ts
│       │   └── customers.validator.ts
│       │
│       ├── utils/                  # Pure helper functions
│       │   ├── encryption.ts
│       │   └── helpers.ts
│       │
│       └── types/                  # Server-only types
│           └── express.d.ts
│
├── shared/                         # Shared code (types only)
│   ├── types/                      # Shared TypeScript types
│   └── models/
│       └── auth.ts                 # Auth models
│
├── drizzle.config.ts               # Drizzle configuration
├── vite.config.ts                  # Vite configuration
├── tsconfig.json                   # TypeScript configuration
└── package.json                    # Dependencies
```

## Architecture Principles

### 1. Separation of Concerns

| Layer | Responsibility | Location |
|-------|----------------|----------|
| Routes | Define endpoints, parse requests, validate, call storage/services, send responses | `/server/src/routes/` |
| Services | Complex business logic, orchestration (used when logic exceeds simple CRUD) | `/server/src/services/` |
| Storage | Data access layer (Drizzle ORM) | `/server/storage.ts` |
| Integrations | External API wrappers | `/server/src/integrations/` |

### 2. Route Organization

Routes are grouped by access level into subdirectories under `server/src/routes/`. Each router file exports an Express `Router` instance. All auth middleware is applied **at mount level** in `server/routes.ts`, not inside individual router files.

**Access-level directories:**
- **`public/`** — No auth required (products, payments, CMS pages, affiliate tracking)
- **`customer/`** — Requires Better Auth customer identity (profile, orders, affiliate portal)
- **`admin/`** — Requires `requireAdmin` or `requireFullAccess` middleware (all admin operations)
- **`webhooks/`** — External webhook handlers (Stripe), no auth (verified by payload signature)

**Shared domain routers** live directly under `server/src/routes/` when they span multiple access levels (e.g., `coupon.routes.ts` serves both admin and public coupon endpoints).

**Middleware levels (applied at mount point in `routes.ts`):**

| Middleware | Purpose | Example |
|------------|---------|---------|
| `requireFullAccess` | super_admin, admin, store_manager (excludes fulfillment) | Settings, products, reports |
| `requireAdmin` | Full-access roles (super_admin, admin, store_manager) | Full-access admin routes |
| `requireOrderAccess` | super_admin, admin, store_manager, fulfillment | Order-specific operations |
| `requireCustomerAuth` | Logged-in customer via Better Auth | Profile, support, order tracking |
| _(none)_ | Public access | Products, CMS pages, webhooks |

**Multi-router exports:** Some router files export multiple sub-routers for different mount points:
- `shipping.routes.ts` → default router + `shipmentRoutes` + `shipmentManagementRoutes`
- `operations.routes.ts` → default router + `refundOrderRoutes` + `dashboardRoutes`
- `coupons.routes.ts` → default router + `publicCouponRoutes`
- `settings.routes.ts` → default router + `integrationsStatusRoutes`
- `support.routes.ts` → default router + `adminSupportRouter`
- `customer/affiliates.routes.ts` → default router + `publicAffiliateRoutes`

### 3. Client Organization

The frontend uses a flat page layout under `client/src/pages/`:
```
/client/src/pages/
├── home.tsx                # Landing page
├── checkout.tsx            # Checkout flow
├── my-account.tsx          # Customer dashboard
├── admin-dashboard.tsx     # Admin dashboard
├── admin-orders.tsx        # Admin orders
├── admin-products.tsx      # Admin products
├── admin-customers.tsx     # Admin customers
├── admin-affiliates.tsx    # Admin affiliates
├── admin-cms.tsx        # CMS dashboard
├── admin-cms-builder.tsx # CMS page builder
└── ...                     # ~40+ page components
```

Admin sub-components live in `client/src/admin/` and CMS rendering in `client/src/cms/`.

### 4. Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Route files | `{feature}.routes.ts` | `orders.routes.ts` |
| Services | `{feature}.service.ts` | `orders.service.ts` |
| Repositories | `{feature}.repo.ts` | `orders.repo.ts` |
| Page components | `{feature}.tsx` | `admin-orders.tsx` |

## Adding New Features

### Adding a New API Endpoint

1. **Create router file** in `server/src/routes/{access}/{feature}.routes.ts`
2. **Set up the router**:
   ```typescript
   import { Router, Request, Response } from "express";
   import { storage } from "../../../storage";

   const router = Router();

   router.get("/", async (req: Request, res: Response) => {
     const items = await storage.getAllItems();
     res.json(items);
   });

   router.post("/", async (req: Request, res: Response) => {
     const item = await storage.createItem(req.body);
     res.status(201).json(item);
   });

   export default router;
   ```
3. **Mount in `server/routes.ts`** with appropriate middleware:
   ```typescript
   import featureRoutes from "./src/routes/admin/feature.routes";
   // ...
   app.use("/api/admin/feature", requireFullAccess, featureRoutes);
   ```
4. **Middleware is applied at mount level** where practical — do not add admin middleware inside the router file itself; customer routers may use `requireCustomerAuth` or `customerIdentityService` for Better Auth customer identity.

### Adding a New Admin Page

1. Create page component: `/client/src/pages/admin-{feature}.tsx`
2. Add lazy import and route in `/client/src/App.tsx`
3. Add navigation link in admin layout

### Adding a New Integration

1. Create folder: `/server/src/integrations/{provider}/`
2. Create service class: `{Provider}Service.ts`
3. Create index.ts with exports
4. Use in services layer or route handlers

## Path Aliases (PLANNED)

TypeScript path aliases will be configured for cleaner imports:

```typescript
// Current (using relative paths)
import { storage } from "../../../storage";

// Future (with path aliases)
import { storage } from "@server/db";
```

Planned aliases:
- `@server/*` → `server/src/*`
- `@client/*` → `client/src/*`
- `@shared/*` → `shared/*`

**Note**: Path aliases are not yet configured. This is planned for a future phase.

## Database Layer

### Schema Location
The Drizzle schema is currently in `/shared/schema.ts` (standard Drizzle location).
The `/server/src/db/index.ts` re-exports from this location for migration compatibility.

### Repository Pattern
Each entity has a repository file with CRUD operations:

```typescript
// /server/src/db/repositories/products.repo.ts
export const productsRepo = {
  findAll: async () => { ... },
  findById: async (id: string) => { ... },
  create: async (data: InsertProduct) => { ... },
  update: async (id: string, data: Partial<InsertProduct>) => { ... },
  delete: async (id: string) => { ... },
};
```

## Error Handling

All errors are handled by central middleware:

```typescript
// Controller throws
throw new AppError("Product not found", 404);

// Middleware catches and formats response
{
  "error": "Product not found",
  "statusCode": 404
}
```

## Migration Notes

Route extraction from the monolithic `routes.ts` is **complete**. Key changes:
- `routes.ts` is now a slim orchestrator: imports routers, applies middleware, and mounts them — zero inline handlers remain
- All 46 router files live under `server/src/routes/` grouped by access level
- `storage.ts` → Split into repository files (PLANNED)
- Services extracted from route handlers (PLANNED)
- Integrations consolidated in dedicated folder (COMPLETE)

### Migration Progress

| Component | Status | Notes |
|-----------|--------|-------|
| Folder structure | ✅ Complete | All target directories created |
| Config layer | ✅ Complete | `env.ts`, centralized configuration |
| Utils | ✅ Complete | `encryption.ts` moved to `server/src/utils/` |
| Integrations | ✅ Complete | Stripe, Mailgun, Replit object storage in `server/src/integrations/` |
| Middleware | ✅ Complete | `requireAdmin`, `requireFullAccess`, `requireOrderAccess`, `requireCustomerAuth` extracted |
| Database index | ✅ Complete | Re-exports from `server/src/db/index.ts` |
| Route infrastructure | ✅ Complete | Base route modules created |
| Route migration | ✅ Complete | 46 router files, `routes.ts` reduced to 159-line orchestrator |
| Services | 🔄 Partial | 21 service files exist; routes call storage directly for simple CRUD |
| Repositories | ⏳ Planned | `storage.ts` could be split into domain repos |
| Path aliases | ⏳ Planned | `@server/*`, `@client/*`, `@shared/*` |

### How to Add a New Route Module

1. **Create router file**: `server/src/routes/{access}/{feature}.routes.ts`
2. **Define routes** using Express Router:
   ```typescript
   import { Router, Request, Response } from "express";
   import { storage } from "../../../storage";

   const router = Router();

   router.get("/", async (req: Request, res: Response) => {
     const data = await storage.getData();
     res.json(data);
   });

   export default router;
   ```
3. **Mount in `server/routes.ts`** with the appropriate middleware:
   ```typescript
   app.use("/api/admin/feature", requireFullAccess, featureRoutes);
   ```
4. **Auth middleware is always applied at mount level** — never inside the router file.
5. **If your module needs multiple mount points**, export named sub-routers:
   ```typescript
   export const publicFeatureRoutes = Router();
   // ... define public routes on publicFeatureRoutes
   export default router;
   ```
   Then mount each export separately in `routes.ts`.

### Backward Compatibility

The old import paths still work during migration:
- `server/StripeService.ts` → Forwards to `server/src/integrations/stripe/`
- `server/EmailService.ts` → Forwards to `server/src/integrations/mailgun/`
- `server/storage.ts` → Will be preserved, repositories are additional abstraction

## Quick Reference

| What | Where |
|------|-------|
| Add database table | `/server/src/db/schema.ts` |
| Add API route | `/server/src/routes/{access}/` |
| Add business logic | `/server/src/services/{feature}/` |
| Add React page | `/client/src/features/{feature}/` |
| Add shared component | `/client/src/components/` |
| Add external integration | `/server/src/integrations/{provider}/` |
| Mount a new router | `/server/routes.ts` |
