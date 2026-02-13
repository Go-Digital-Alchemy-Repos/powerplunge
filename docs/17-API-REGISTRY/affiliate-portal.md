# Affiliate Portal

## Module Info

| Property | Value |
|----------|-------|
| Domain | affiliate-portal |
| Source Files | `server/src/routes/customer/affiliate-portal.routes.ts` |
| Mount Point | `/api/customer/affiliate-portal` |
| Endpoint Count | 10 |

## Auth & Authorization

| Property | Value |
|----------|-------|
| Auth Required | Mixed — no mount-level middleware; see per-endpoint details below |
| Roles Allowed | Authenticated customers (see notes) |

## Current reality

- **Canonical source:** `server/src/routes/customer/affiliate-portal.routes.ts`
- **Effective base mount:** `/api/customer/affiliate-portal` (see `server/routes.ts` line 94; no mount-level auth middleware).
- **Paths in the corrected table in the Notes section are fully qualified** (mount prefix + router path). The auto-generated table further below has incorrect paths — see the correction notice in Notes.
- **Auth model:** Routes are split into two groups:
  - `/portal`, `/payout-request`, `/payouts`, `/commissions` — use `customerIdentityService.resolve()` (session/cookie-based customer identity).
  - `/`, `/join`, `/connect/status`, `/connect/start`, `/connect/refresh`, `/code` — use `requireCustomerAuth` middleware (Bearer token with `x-customer-auth` header).

## Notes

> **Path correction notice:** The auto-generated endpoint table below was generated with an incorrect mount prefix (`/api/customer/` instead of `/api/customer/affiliate-portal/`). The corrected fully-qualified paths are listed here for reference until the table is regenerated.

| Method | Effective URL | Auth |
|--------|---------------|------|
| `GET` | `/api/customer/affiliate-portal/portal` | customerIdentityService |
| `POST` | `/api/customer/affiliate-portal/payout-request` | customerIdentityService |
| `GET` | `/api/customer/affiliate-portal/payouts` | customerIdentityService |
| `GET` | `/api/customer/affiliate-portal/commissions` | customerIdentityService |
| `GET` | `/api/customer/affiliate-portal/` | requireCustomerAuth |
| `POST` | `/api/customer/affiliate-portal/join` | requireCustomerAuth |
| `GET` | `/api/customer/affiliate-portal/connect/status` | requireCustomerAuth |
| `POST` | `/api/customer/affiliate-portal/connect/start` | requireCustomerAuth |
| `POST` | `/api/customer/affiliate-portal/connect/refresh` | requireCustomerAuth |
| `PUT` | `/api/customer/affiliate-portal/code` | requireCustomerAuth |


<!-- === AUTO-GENERATED SECTION (do not edit below this line) === -->

## Endpoints

| Method | Path | Source File | Line |
|--------|------|-------------|------|
| `GET` | `/api/customer/` | server/src/routes/customer/affiliate-portal.routes.ts | 296 |
| `PUT` | `/api/customer/code` | server/src/routes/customer/affiliate-portal.routes.ts | 604 |
| `GET` | `/api/customer/commissions` | server/src/routes/customer/affiliate-portal.routes.ts | 259 |
| `POST` | `/api/customer/connect/refresh` | server/src/routes/customer/affiliate-portal.routes.ts | 561 |
| `POST` | `/api/customer/connect/start` | server/src/routes/customer/affiliate-portal.routes.ts | 491 |
| `GET` | `/api/customer/connect/status` | server/src/routes/customer/affiliate-portal.routes.ts | 424 |
| `POST` | `/api/customer/join` | server/src/routes/customer/affiliate-portal.routes.ts | 377 |
| `POST` | `/api/customer/payout-request` | server/src/routes/customer/affiliate-portal.routes.ts | 105 |
| `GET` | `/api/customer/payouts` | server/src/routes/customer/affiliate-portal.routes.ts | 226 |
| `GET` | `/api/customer/portal` | server/src/routes/customer/affiliate-portal.routes.ts | 59 |

_10 endpoint(s) detected._

<!-- === END AUTO-GENERATED SECTION === -->
