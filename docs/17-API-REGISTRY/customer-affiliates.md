# Customer Affiliates

## Module Info

| Property | Value |
|----------|-------|
| Domain | customer-affiliates |
| Source Files | server/src/routes/customer/affiliates.routes.ts |
| Endpoint Count | 7 |
| Mount Points | `/api/customer` (customer) + `/api` (public) |
| Auth Middleware | Per-route/customer identity resolution on customer mount; no auth on public mount |

## Multi-Router Exports

This file exports two routers:
- `default` — Customer affiliate portal (dashboard, registration, payouts, Stripe Connect), mounted at `/api/customer` with per-route customer identity checks
- `publicAffiliateRoutes` — Public affiliate agreement text, mounted at `/api` with no auth

## Notes

Customer-facing affiliate portal for viewing commissions, requesting payouts, managing Stripe Connect onboarding, and updating affiliate details.
`GET /api/customer/affiliate` returns public program settings plus empty affiliate data when no customer identity is present; write and payout/connect actions require customer identity.
Helper function `getDefaultAffiliateAgreement()` was relocated here from legacy routes.ts during extraction.

<!-- === AUTO-GENERATED SECTION (do not edit below this line) === -->

## Endpoints

### Customer (per-route identity)
| Method | Path | Handler | Line |
|--------|------|---------|------|
| `GET` | `/api/customer/affiliate` | Get affiliate dashboard | 93 |
| `POST` | `/api/customer/affiliate` | Register as affiliate | 206 |
| `POST` | `/api/customer/affiliate/payout` | Request payout | 271 |
| `PATCH` | `/api/customer/affiliate` | Update affiliate details | 311 |
| `POST` | `/api/customer/affiliate/connect/start` | Start Stripe Connect onboarding | 333 |
| `GET` | `/api/customer/affiliate/connect/status` | Check Stripe Connect status | 397 |

### Public (no auth)
| Method | Path | Handler |
|--------|------|---------|
| `GET` | `/api/affiliate/agreement` | Get affiliate agreement text |

_7 endpoint(s) detected._

<!-- === END AUTO-GENERATED SECTION === -->
