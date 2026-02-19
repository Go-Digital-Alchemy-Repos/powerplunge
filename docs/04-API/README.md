# API Reference

This section contains auto-generated and manually maintained API documentation.

## API Structure

All API endpoints are prefixed with `/api/` and organized by access level:

- **Public:** `/api/products`, `/api/pages/*`, `/api/site-settings`
- **Customer:** `/api/customer/*` (requires customer auth)
- **Admin:** `/api/admin/*` (requires admin auth with role-based access)

## Authentication

- **Customer Auth:** Bearer token in Authorization header
- **Admin Auth:** Session-based with role checks (super_admin, admin, store_manager, fulfillment)

## Admin Role Middleware

The following middleware functions control admin access levels. All are applied at mount level in `server/routes.ts`, not inside individual router files.

| Middleware | Roles Granted Access | Purpose |
|------------|---------------------|---------|
| `requireAdmin` | super_admin, admin, store_manager, fulfillment | Basic admin authentication — verifies the session belongs to a valid admin user. All admin roles pass. |
| `requireFullAccess` | super_admin, admin, store_manager | Full management access — excludes fulfillment. Used for settings, products, reports, etc. |
| `requireOrderAccess` | super_admin, admin, store_manager, fulfillment | Order-related access — same as `requireFullAccess` but also includes fulfillment role. |

**Note:** `super_admin` and `admin` roles implicitly pass all role checks regardless of the allowed-roles list.

## Auto-Generated Docs

Use the "Sync API Docs" feature in the Docs Browser to auto-generate endpoint documentation from route files. Generated docs are placed in the `17-API-REGISTRY` folder.
