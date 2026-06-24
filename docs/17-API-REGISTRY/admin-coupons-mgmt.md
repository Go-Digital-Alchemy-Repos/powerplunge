# Admin Coupons Management

## Module Info

| Property | Value |
|----------|-------|
| Domain | admin-coupons-mgmt |
| Source Files | server/src/routes/admin/coupons.routes.ts |
| Endpoint Count | 5 |
| Mount Points | `/api/admin/coupons` (admin) + `/api/coupons` (public) |
| Auth Middleware | `requireFullAccess` on admin mount; no auth on public mount |

## Multi-Router Exports

This file exports two routers:
- `default` — Admin CRUD, mounted at `/api/admin/coupons` with `requireFullAccess`
- `publicCouponRoutes` — Public validation, mounted at `/api/coupons` with no auth

## Notes

Coupon CRUD plus public coupon validation endpoint.
Note: Separate from the coupon analytics router at `server/src/routes/admin/coupon-analytics.routes.ts`.

<!-- === AUTO-GENERATED SECTION (do not edit below this line) === -->

## Endpoints

### Admin (requireFullAccess)
| Method | Path | Handler | Line |
|--------|------|---------|------|
| `GET` | `/api/admin/coupons/` | List coupons | — |
| `POST` | `/api/admin/coupons/` | Create coupon | — |
| `PATCH` | `/api/admin/coupons/:id` | Update coupon | — |
| `DELETE` | `/api/admin/coupons/:id` | Delete coupon | — |

### Public (no auth)
| Method | Path | Handler | Line |
|--------|------|---------|------|
| `POST` | `/api/coupons/validate` | Validate coupon code | — |

_5 endpoint(s) detected._

<!-- === END AUTO-GENERATED SECTION === -->
