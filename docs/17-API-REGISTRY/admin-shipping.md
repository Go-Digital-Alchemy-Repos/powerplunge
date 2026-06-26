# Admin Shipping

## Module Info

| Property | Value |
|----------|-------|
| Domain | admin-shipping |
| Source Files | server/src/routes/admin/shipping.routes.ts |
| Endpoint Count | 12 |
| Mount Points | `/api/admin/shipping`, `/api/admin/orders`, `/api/admin/shipments` |
| Auth Middleware | `requireFullAccess` on shipping; `requireOrderAccess` on shipments |

## Multi-Router Exports

This file exports three routers:
- `default` — Zones and rates CRUD, mounted at `/api/admin/shipping` with `requireFullAccess`
- `shipmentRoutes` — Per-order shipment creation/listing, mounted at `/api/admin/orders` with `requireOrderAccess`
- `shipmentManagementRoutes` — Shipment status updates and email, mounted at `/api/admin/shipments` with `requireOrderAccess`

## Notes

Shipping zone/rate configuration plus shipment tracking and notification management.
Shipment routes use `requireOrderAccess` so fulfillment role can manage shipments.

<!-- === AUTO-GENERATED SECTION (do not edit below this line) === -->

## Endpoints

### Shipping Zones & Rates (requireFullAccess)
| Method | Path | Handler |
|--------|------|---------|
| `GET` | `/api/admin/shipping/zones` | List shipping zones |
| `POST` | `/api/admin/shipping/zones` | Create shipping zone |
| `PATCH` | `/api/admin/shipping/zones/:id` | Update shipping zone |
| `DELETE` | `/api/admin/shipping/zones/:id` | Delete shipping zone |
| `GET` | `/api/admin/shipping/rates` | List shipping rates |
| `POST` | `/api/admin/shipping/rates` | Create shipping rate |
| `PATCH` | `/api/admin/shipping/rates/:id` | Update shipping rate |
| `DELETE` | `/api/admin/shipping/rates/:id` | Delete shipping rate |

### Order Shipments (requireOrderAccess)
| Method | Path | Handler |
|--------|------|---------|
| `GET` | `/api/admin/orders/:orderId/shipments` | List shipments for order |
| `POST` | `/api/admin/orders/:orderId/shipments` | Create shipment |

### Shipment Management (requireOrderAccess)
| Method | Path | Handler |
|--------|------|---------|
| `PATCH` | `/api/admin/shipments/:id` | Update shipment status |
| `POST` | `/api/admin/shipments/:id/resend-email` | Resend shipping notification |

_12 endpoint(s) detected._

<!-- === END AUTO-GENERATED SECTION === -->
