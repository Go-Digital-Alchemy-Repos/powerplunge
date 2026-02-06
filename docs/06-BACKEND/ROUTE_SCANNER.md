# Route Scanner Utility

## Overview
- `routeScanner.ts` is a backend utility that scans all Express route files and extracts endpoint definitions using regex pattern matching.
- It powers the "Sync API Docs" feature, auto-generating API reference markdown for each detected domain.
- Located at `server/src/utils/routeScanner.ts`.

## Architecture

### How It Works
1. **Directory scanning:** Reads route files from `server/routes.ts` and four subdirectories (`server/src/routes/`, `server/src/routes/admin/`, `server/src/routes/customer/`, `server/src/routes/public/`).
2. **Regex extraction:** Two regex patterns detect route definitions:
   - `STANDARD_ROUTE_REGEX` — matches `router.get("/path", ...)` and `app.post("/path", ...)` patterns.
   - `CHAINED_ROUTE_REGEX` — matches `router.route("/path").get(...)` chained patterns.
3. **Domain mapping:** Each route file is mapped to a named domain via `DOMAIN_MAP` (e.g., `affiliate.routes.ts` → domain `affiliates`, display name `Affiliate Management`).
4. **Base path resolution:** Routes that don't start with `/api/` are prefixed with a base path from `BASE_PATH_MAP` to reconstruct the full endpoint URL.
5. **Output generation:** Produces sorted markdown tables with Method, Path, Source File, and Line columns.

### Key Data Structures

| Type | Purpose |
|------|---------|
| `RouteEntry` | Single endpoint: method, path, file, domain, line number |
| `DomainRoutes` | Collection of routes for a domain: domain name, display name, source files, route entries |

### Domain Map (15 domains)
| Route File | Domain | Display Name |
|------------|--------|-------------|
| `routes.ts` | main | Main Application Routes |
| `affiliate.routes.ts` | affiliates | Affiliate Management |
| `alerts.routes.ts` | alerts | Revenue Alerts |
| `coupon.routes.ts` | coupons | Coupon System |
| `recovery.routes.ts` | recovery | Checkout Recovery |
| `revenue.routes.ts` | revenue | Revenue Analytics |
| `support.routes.ts` | support | Customer Support |
| `upsell.routes.ts` | upsells | Upsell / Cross-sell |
| `vip.routes.ts` | vip | VIP Program |
| `customers.routes.ts` | admin-customers | Admin Customers |
| `products.routes.ts` | admin-products | Admin Products |
| `media.routes.ts` | admin-media | Admin Media |
| `affiliate-portal.routes.ts` | affiliate-portal | Affiliate Portal |
| `auth.routes.ts` | customer-auth | Customer Authentication |
| `order-tracking.routes.ts` | order-tracking | Order Tracking |
| `affiliate-signup.routes.ts` | affiliate-signup | Affiliate Signup |
| `affiliate-tracking.routes.ts` | affiliate-tracking | Affiliate Tracking |
| `order-status.routes.ts` | order-status | Public Order Status |

### Exported Functions

| Function | Purpose |
|----------|---------|
| `scanAllRoutes()` | Scans all route directories, returns `Map<string, DomainRoutes>` |
| `generateAutoSection(dr)` | Generates markdown endpoint table from a `DomainRoutes` |
| `mergeContent(existing, auto)` | Merges auto-generated section into existing doc, preserving manual notes |
| `createStubDocument(dr)` | Creates a new API reference doc with module info, auth placeholders, and endpoint table |

## Database
- No database interaction. Reads `.ts` source files and writes `.md` docs to filesystem.

## APIs
- Not directly exposed as an API. Used internally by:
  - `POST /api/admin/docs/sync` — calls `scanAllRoutes()`, `generateAutoSection()`, `mergeContent()`, `createStubDocument()`
  - `GET /api/admin/docs/coverage` — calls `scanAllRoutes()` to determine which domains exist

## Frontend Integration
- No direct frontend integration. Invoked via the Sync and Coverage API endpoints.

## Security Considerations
- The route scanner reads only `.ts` files from known directories. It does not execute or evaluate route code.
- Output is written only to `docs/17-API-REGISTRY/`, preventing writes to arbitrary filesystem locations.
- Regex patterns are bounded with length limits (`{0,200}`) to prevent catastrophic backtracking.

## Operational Notes
- **Regex limitations:** The scanner uses pattern matching, not AST parsing. Dynamically constructed routes, template literal paths, or non-standard patterns (e.g., `app[method](...)`) will not be detected.
- **Adding new route files:** If a new route file is added outside the known directories or with a non-standard name, add an entry to `DOMAIN_MAP` and `BASE_PATH_MAP` in `routeScanner.ts`.
- **Auto-generated section markers:** Content between `<!-- === AUTO-GENERATED SECTION === -->` and `<!-- === END AUTO-GENERATED SECTION === -->` is replaced on each sync. Manual notes above the start marker are preserved.
- **Performance:** Synchronous filesystem reads during scan. Acceptable for admin-triggered operations (not called on every request).

## Related Docs
- Docs Governance System (`docs/03-FEATURES/DOCS_GOVERNANCE_SYSTEM.md`)
- Docs API Endpoints (`docs/04-API/DOCS_API_ENDPOINTS.md`)
- Doc Browser UI (`docs/05-FRONTEND/DOC_BROWSER_UI.md`)
