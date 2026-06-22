# Customer Profile

## Module Info

| Property | Value |
|----------|-------|
| Domain | customer-profile |
| Source Files | server/src/routes/customer/profile.routes.ts |
| Endpoint Count | 6 |
| Mount Point | `/api/customer` |
| Auth Middleware | Per-route/customer identity resolution; no Replit OIDC mount gate |

## Notes

Customer-facing profile, order history, account linking, and password management.
Profile handlers accept platform identity when available and customer bearer-token identity on non-Replit runtimes.
Rate limiter applied on password change endpoint.

<!-- === AUTO-GENERATED SECTION (do not edit below this line) === -->

## Endpoints

| Method | Path | Handler | Line |
|--------|------|---------|------|
| `GET` | `/api/customer/orders` | List customer order history | 11 |
| `GET` | `/api/customer/orders/:id` | Get order detail | 59 |
| `POST` | `/api/customer/link` | Link account (social auth) | 96 |
| `GET` | `/api/customer/profile` | Get customer profile | 163 |
| `PATCH` | `/api/customer/profile` | Update customer profile | 185 |
| `POST` | `/api/customer/change-password` | Change password (rate limited) | 249 |

_6 endpoint(s) detected._

<!-- === END AUTO-GENERATED SECTION === -->
