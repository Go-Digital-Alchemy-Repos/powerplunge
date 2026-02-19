# Feature Module Template

> Standard structure for new feature modules in the Power Plunge platform.
> All new routes should follow this pattern. All routes have been migrated to this pattern. routes.ts is a 159-line orchestrator with zero inline handlers.

## Directory Structure

```
server/src/
├── routes/
│   ├── admin/
│   │   └── {feature}.routes.ts      # Admin-only endpoints
│   ├── public/
│   │   └── {feature}.routes.ts      # Unauthenticated public endpoints
│   └── customer/
│       └── {feature}.routes.ts      # Authenticated customer endpoints
├── services/
│   └── {feature}.service.ts         # Business logic layer (optional, use when logic > simple CRUD)
└── (storage.ts uses Drizzle directly for data access)
```

## Route File Template

```typescript
// server/src/routes/admin/{feature}.routes.ts
import { Router, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../../../storage";

const router = Router();

// GET /api/admin/{feature}
router.get("/", async (_req: Request, res: Response) => {
  try {
    const items = await storage.getItems();
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch items" });
  }
});

// GET /api/admin/{feature}/:id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const item = await storage.getItem(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch item" });
  }
});

// POST /api/admin/{feature}
const createSchema = z.object({
  name: z.string().min(1),
  // ... validation fields
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    const item = await storage.createItem(parsed.data);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: "Failed to create item" });
  }
});

// PATCH /api/admin/{feature}/:id
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const item = await storage.updateItem(req.params.id, req.body);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: "Failed to update item" });
  }
});

// DELETE /api/admin/{feature}/:id
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    await storage.deleteItem(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete item" });
  }
});

export default router;
```

## Mounting in routes.ts

```typescript
// server/routes.ts
import featureRoutes from "./src/routes/admin/{feature}.routes";

// Inside registerRoutes():
app.use("/api/admin/{feature}", requireFullAccess, featureRoutes);
```

## Multi-Router Exports

When a single domain's routes need to be mounted at different URL prefixes or with different middleware, export multiple routers from the same file. The default export is the primary router; named exports are secondary routers.

```typescript
// server/src/routes/admin/shipping.routes.ts
import { Router, Request, Response } from "express";
import { storage } from "../../../storage";

// Main router — mounted at /api/admin/shipping with requireFullAccess
const router = Router();

router.get("/zones", async (_req: Request, res: Response) => { ... });
router.post("/zones", async (req: Request, res: Response) => { ... });
// ... more zone/rate routes

// Shipment routes — different mount point and middleware
export const shipmentRoutes = Router();
shipmentRoutes.get("/:orderId/shipments", async (req: Request, res: Response) => { ... });
shipmentRoutes.post("/:orderId/shipments", async (req: Request, res: Response) => { ... });

// Shipment management — yet another mount point
export const shipmentManagementRoutes = Router();
shipmentManagementRoutes.patch("/:id", async (req: Request, res: Response) => { ... });

export default router;
```

```typescript
// server/routes.ts — mounting with different middleware
import adminShippingRoutes, { shipmentRoutes, shipmentManagementRoutes } from "./src/routes/admin/shipping.routes";

app.use("/api/admin/shipping", requireFullAccess, adminShippingRoutes);
app.use("/api/admin/orders", requireAdmin, shipmentRoutes);
app.use("/api/admin/shipments", requireAdmin, shipmentManagementRoutes);
```

### When to use multi-router exports

- When a domain's routes need different auth middleware (e.g. `requireAdmin` vs `requireFullAccess`)
- When routes share domain logic but have different URL prefixes
- When a domain includes both admin and public routes in the same file

### Other examples in the codebase

- `operations.routes.ts` — default + `dashboardRoutes` + `refundOrderRoutes`
- `coupons.routes.ts` — default + `publicCouponRoutes`
- `customer/affiliates.routes.ts` — default + `publicAffiliateRoutes`

## Key Conventions

1. **Middleware is applied at mount level** — `requireAdmin`, `requireFullAccess`, or `isAuthenticated` is added in `routes.ts` when mounting, not inside the router file.
2. **Storage is the data layer** — Routes call `storage.*` methods directly. Services are used only when business logic exceeds simple CRUD (e.g., commission calculations, email workflows).
3. **Validation with Zod** — Define schemas at the top of the file using `z.object()`. Use `safeParse()` for user input.
4. **Error handling** — Every handler wraps in try/catch. Return `{ message: string }` on errors.
5. **No controller layer** — Routes call storage/services directly. Controllers add indirection with minimal benefit at this scale.
6. **Typed imports** — Use `Request, Response` from express. Cast `req` to `any` only when accessing session/auth properties.
7. **Feature flags** — For new experimental features, use environment variable flags checked at the mount level.

## Service Layer (When Needed)

Use a service when:
- Multiple routes share complex business logic
- External API calls need orchestration
- Transaction-level operations span multiple storage calls
- Side effects (emails, webhooks, audit logs) need coordination

```typescript
// server/src/services/{feature}.service.ts
import { storage } from "../../storage";

class FeatureService {
  async processItem(id: string, data: any) {
    // Complex business logic here
    const item = await storage.getItem(id);
    // ... orchestration, validation, side effects
    return storage.updateItem(id, data);
  }
}

export const featureService = new FeatureService();
```

## Migration Checklist

When adding a new route module or extracting from an existing router:

- [x] Create router file in appropriate directory (admin/public/customer)
- [x] Copy handlers verbatim — no behavior changes
- [x] Keep all original route paths (mount prefix + handler path = same URL)
- [x] Move middleware to mount level in routes.ts
- [x] Add import and `app.use()` mount in routes.ts
- [x] Remove old inline handlers from routes.ts (leave comment breadcrumb)
- [x] Remove any now-unused imports from routes.ts
- [x] Restart server and verify all endpoints still respond
- [x] Test with curl or E2E to confirm response parity

> All 187 original inline handlers have been extracted. This checklist is preserved for reference when adding new feature modules.
