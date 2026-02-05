# Power Plunge E-Commerce - Project Structure

## Overview

This document describes the reorganized project structure for Power Plunge, designed for developer clarity, maintainability, and scalability.

## Directory Structure

```
/
├── docs/                           # Project documentation
│   ├── PROJECT_STRUCTURE.md        # This file
│   └── ARCHITECTURE_OVERVIEW.md    # High-level architecture
│
├── client/                         # Frontend (React + Vite)
│   ├── public/                     # Static assets
│   └── src/
│       ├── main.tsx                # App entrypoint
│       ├── App.tsx                 # Router setup
│       ├── index.css               # Global styles
│       │
│       ├── features/               # Feature-based modules
│       │   ├── home/               # Landing page
│       │   ├── checkout/           # Checkout flow
│       │   ├── account/            # Customer account/dashboard
│       │   ├── admin/              # Admin dashboard
│       │   │   ├── orders/
│       │   │   ├── products/
│       │   │   ├── customers/
│       │   │   ├── team/
│       │   │   ├── settings/
│       │   │   ├── affiliates/
│       │   │   ├── shipping/
│       │   │   ├── reports/
│       │   │   ├── docs/
│       │   │   └── theme/
│       │   └── pages/              # CMS pages
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
│       ├── routes/                 # Route definitions (thin)
│       │   ├── index.ts            # Route registration
│       │   ├── public/
│       │   │   ├── products.routes.ts
│       │   │   ├── checkout.routes.ts
│       │   │   ├── pages.routes.ts
│       │   │   └── theme.routes.ts
│       │   ├── customer/
│       │   │   ├── orders.routes.ts
│       │   │   ├── profile.routes.ts
│       │   │   └── affiliate.routes.ts
│       │   ├── admin/
│       │   │   ├── auth.routes.ts
│       │   │   ├── products.routes.ts
│       │   │   ├── orders.routes.ts
│       │   │   ├── customers.routes.ts
│       │   │   ├── team.routes.ts
│       │   │   ├── settings.routes.ts
│       │   │   ├── affiliates.routes.ts
│       │   │   ├── shipping.routes.ts
│       │   │   ├── coupons.routes.ts
│       │   │   ├── reports.routes.ts
│       │   │   ├── docs.routes.ts
│       │   │   └── ...
│       │   └── webhooks/
│       │       └── stripe.routes.ts
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
│       │       ├── auth/
│       │       └── object-storage/
│       │
│       ├── middleware/             # Express middleware
│       │   ├── auth.middleware.ts  # Admin auth
│       │   ├── error.middleware.ts # Error handling
│       │   └── validate.middleware.ts
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
| Routes | Define endpoints, call controllers | `/server/src/routes/` |
| Controllers | Parse requests, validate, call services, format responses | `/server/src/controllers/` |
| Services | Business logic, orchestration | `/server/src/services/` |
| Repositories | Database operations only | `/server/src/db/repositories/` |
| Integrations | External API wrappers | `/server/src/integrations/` |

### 2. Route Organization

Routes are grouped by access level:
- **`/public/`** - No auth required (products, checkout, pages)
- **`/customer/`** - Requires customer auth (orders, profile, affiliate)
- **`/admin/`** - Requires admin auth (all admin operations)
- **`/webhooks/`** - External webhook handlers (Stripe)

### 3. Feature-Based Client Organization

Each feature folder contains:
```
/features/admin/orders/
├── OrdersPage.tsx          # Main page component
├── OrdersList.tsx          # List component
├── OrderDetail.tsx         # Detail component
├── useOrders.ts            # Feature-specific hooks
└── types.ts                # Feature-specific types
```

### 4. Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Route files | `{feature}.routes.ts` | `orders.routes.ts` |
| Controllers | `{feature}.controller.ts` | `orders.controller.ts` |
| Services | `{feature}.service.ts` | `orders.service.ts` |
| Repositories | `{feature}.repo.ts` | `orders.repo.ts` |
| Validators | `{feature}.validator.ts` | `orders.validator.ts` |

## Adding New Features

### Adding a New API Endpoint

1. **Create validator** in `/server/src/validators/{feature}.validator.ts`
2. **Create/update repository** in `/server/src/db/repositories/{feature}.repo.ts`
3. **Create/update service** in `/server/src/services/{feature}/{feature}.service.ts`
4. **Create controller** in `/server/src/controllers/{access}/{feature}.controller.ts`
5. **Create route** in `/server/src/routes/{access}/{feature}.routes.ts`
6. **Register route** in `/server/src/routes/index.ts`

### Adding a New Admin Page

1. Create feature folder: `/client/src/features/admin/{feature}/`
2. Add page component: `{Feature}Page.tsx`
3. Add to router in `/client/src/App.tsx`
4. Add navigation link in admin layout

### Adding a New Integration

1. Create folder: `/server/src/integrations/{provider}/`
2. Create service class: `{Provider}Service.ts`
3. Create index.ts with exports
4. Use in services layer, never in controllers/routes directly

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

This structure is being reorganized from a monolithic setup. Key changes:
- `routes.ts` (2700+ lines) → Split into feature-based route files (IN PROGRESS)
- `storage.ts` → Split into repository files (PLANNED)
- Services extracted from route handlers (PLANNED)
- Integrations consolidated in dedicated folder (COMPLETE)

### Migration Progress

| Component | Status | Notes |
|-----------|--------|-------|
| Folder structure | ✅ Complete | All target directories created |
| Config layer | ✅ Complete | `env.ts`, centralized configuration |
| Utils | ✅ Complete | `encryption.ts` moved to `server/src/utils/` |
| Integrations | ✅ Complete | Stripe, Mailgun, Replit in `server/src/integrations/` |
| Middleware | ✅ Complete | `requireAdmin`, `isAuthenticated` extracted |
| Database index | ✅ Complete | Re-exports from `server/src/db/index.ts` |
| Route infrastructure | ✅ Complete | Base route modules created |
| Route migration | 🔄 In Progress | Routes still in monolithic `routes.ts` |
| Controllers | ⏳ Pending | To be extracted from routes |
| Services | ⏳ Pending | To be extracted from routes |
| Repositories | ⏳ Pending | To be extracted from `storage.ts` |
| Path aliases | ⏳ Pending | `@server/*`, `@client/*`, `@shared/*` |
| Client reorganization | ⏳ Pending | Feature-based folder structure |

### How to Continue Route Migration

To migrate a route group from `routes.ts` to the new structure:

1. **Create route file**: e.g., `server/src/routes/admin/products.routes.ts`
2. **Use Express Router**:
   ```typescript
   import { Router } from "express";
   import { storage } from "../../db";
   import { requireAdmin } from "../../middleware/auth.middleware";
   
   const router = Router();
   
   router.get("/", requireAdmin, async (req, res) => {
     const products = await storage.getAllProducts();
     res.json(products);
   });
   
   export const productsRouter = router;
   ```
3. **Register in main routes**: Import and mount in `server/routes.ts`
4. **Remove from monolithic file**: Delete the migrated routes from `routes.ts`
5. **Test**: Verify endpoints still work

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
