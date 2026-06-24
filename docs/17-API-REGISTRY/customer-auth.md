# Customer Authentication

## Module Info

| Property | Value |
|----------|-------|
| Domain | customer-auth |
| Source Files | server/src/routes/customer/auth.routes.ts |
| Endpoint Count | 12 |
| Mount Point | `/api/customer/auth` |

## Auth & Authorization

| Property | Value |
|----------|-------|
| Auth Required | Per-route Better Auth customer session |
| Roles Allowed | Customer |

## Notes

Customer authentication uses Better Auth cookie sessions. Public registration, login, magic-link, forgot-password, and reset-password endpoints create or recover customer sessions; profile and password update endpoints require an existing customer session.


<!-- === AUTO-GENERATED SECTION (do not edit below this line) === -->

## Endpoints

| Method | Path | Source File | Line |
|--------|------|-------------|------|
| `POST` | `/api/customer/auth/register` | server/src/routes/customer/auth.routes.ts | 112 |
| `POST` | `/api/customer/auth/login` | server/src/routes/customer/auth.routes.ts | 169 |
| `POST` | `/api/customer/auth/logout` | server/src/routes/customer/auth.routes.ts | 215 |
| `POST` | `/api/customer/auth/magic-link` | server/src/routes/customer/auth.routes.ts | 226 |
| `POST` | `/api/customer/auth/verify-magic-link` | server/src/routes/customer/auth.routes.ts | 245 |
| `GET` | `/api/customer/auth/check-admin-eligible` | server/src/routes/customer/auth.routes.ts | 268 |
| `GET` | `/api/customer/auth/me` | server/src/routes/customer/auth.routes.ts | 282 |
| `PATCH` | `/api/customer/auth/update-profile` | server/src/routes/customer/auth.routes.ts | 295 |
| `POST` | `/api/customer/auth/change-password` | server/src/routes/customer/auth.routes.ts | 329 |
| `POST` | `/api/customer/auth/forgot-password` | server/src/routes/customer/auth.routes.ts | 350 |
| `POST` | `/api/customer/auth/reset-password` | server/src/routes/customer/auth.routes.ts | 378 |
| `POST` | `/api/customer/auth/verify-session` | server/src/routes/customer/auth.routes.ts | 402 |

_12 endpoint(s) detected._

<!-- === END AUTO-GENERATED SECTION === -->
