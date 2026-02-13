# Customer Authentication

## Module Info

| Property | Value |
|----------|-------|
| Domain | customer-auth |
| Source Files | server/src/routes/customer/auth.routes.ts |
| Endpoint Count | 8 |

## Auth & Authorization

| Property | Value |
|----------|-------|
| Auth Required | TBD |
| Roles Allowed | TBD |

## Notes

_Add manual documentation notes here. This section is preserved during sync._


<!-- === AUTO-GENERATED SECTION (do not edit below this line) === -->

## Endpoints

| Method | Path | Source File | Line |
|--------|------|-------------|------|
| `POST` | `/api/customer/change-password` | server/src/routes/customer/auth.routes.ts | 292 |
| `GET` | `/api/customer/check-admin-eligible` | server/src/routes/customer/auth.routes.ts | 201 |
| `GET` | `/api/customer/check-setup` | server/src/routes/admin/auth.routes.ts | 8 |
| `POST` | `/api/customer/forgot-password` | server/src/routes/customer/auth.routes.ts | 328 |
| `POST` | `/api/customer/login` | server/src/routes/admin/auth.routes.ts | 55 |
| `POST` | `/api/customer/login` | server/src/routes/customer/auth.routes.ts | 82 |
| `POST` | `/api/customer/logout` | server/src/routes/admin/auth.routes.ts | 86 |
| `POST` | `/api/customer/magic-link` | server/src/routes/customer/auth.routes.ts | 136 |
| `GET` | `/api/customer/me` | server/src/routes/admin/auth.routes.ts | 95 |
| `GET` | `/api/customer/me` | server/src/routes/customer/auth.routes.ts | 216 |
| `POST` | `/api/customer/register` | server/src/routes/customer/auth.routes.ts | 24 |
| `POST` | `/api/customer/reset-password` | server/src/routes/customer/auth.routes.ts | 366 |
| `POST` | `/api/customer/setup` | server/src/routes/admin/auth.routes.ts | 17 |
| `PATCH` | `/api/customer/update-profile` | server/src/routes/customer/auth.routes.ts | 258 |
| `POST` | `/api/customer/verify-magic-link` | server/src/routes/customer/auth.routes.ts | 160 |
| `POST` | `/api/customer/verify-session` | server/src/routes/customer/auth.routes.ts | 418 |

_16 endpoint(s) detected._

<!-- === END AUTO-GENERATED SECTION === -->
