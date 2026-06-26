# Admin Orders

## Module Info

| Property | Value |
|----------|-------|
| Domain | admin-orders |
| Source Files | server/src/routes/admin/orders.routes.ts |
| Endpoint Count | 7 |
| Mount Point | `/api/admin/orders` |
| Auth Middleware | `requireOrderAccess` (all admin roles, including fulfillment) |

## Notes

Order management CRUD. The manual order creation endpoint (`POST /`) uses `requireFullAccess` middleware inline to block fulfillment role from creating orders.
Order listing supports query filters: `status`, `search` (email/name), `startDate`, `endDate`.

<!-- === AUTO-GENERATED SECTION (do not edit below this line) === -->

## Endpoints

| Method | Path | Handler | Line |
|--------|------|---------|------|
| `GET` | `/api/admin/orders/` | List orders with filters | 7 |
| `GET` | `/api/admin/orders/:id` | Get order detail | 26 |
| `PATCH` | `/api/admin/orders/:id` | Update order status | 42 |
| `DELETE` | `/api/admin/orders/bulk` | Bulk delete orders (requireFullAccess) | — |
| `DELETE` | `/api/admin/orders/:id` | Delete order (requireFullAccess) | — |
| `POST` | `/api/admin/orders/` | Manual order creation (requireFullAccess) | 72 |
| `POST` | `/api/admin/orders/checkout` | Create admin checkout payment session (requireFullAccess) | — |

_7 endpoint(s) detected._

<!-- === END AUTO-GENERATED SECTION === -->
