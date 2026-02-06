# Affiliate Management

## Module Info

| Property | Value |
|----------|-------|
| Domain | affiliates |
| Source Files | server/src/routes/affiliate.routes.ts |
| Endpoint Count | 18 |

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
| `DELETE` | `/api/admin/:affiliateId` | server/src/routes/affiliate.routes.ts | 691 |
| `GET` | `/api/admin/:affiliateId/commissions` | server/src/routes/affiliate.routes.ts | 143 |
| `GET` | `/api/admin/:affiliateId/payouts` | server/src/routes/affiliate.routes.ts | 651 |
| `POST` | `/api/admin/:affiliateId/payouts` | server/src/routes/affiliate.routes.ts | 560 |
| `GET` | `/api/admin/:affiliateId/profile` | server/src/routes/affiliate.routes.ts | 90 |
| `GET` | `/api/admin/:affiliateId/referred-customers` | server/src/routes/affiliate.routes.ts | 155 |
| `POST` | `/api/admin/commissions/:commissionId/approve` | server/src/routes/affiliate.routes.ts | 167 |
| `POST` | `/api/admin/commissions/:commissionId/review-approve` | server/src/routes/affiliate.routes.ts | 244 |
| `POST` | `/api/admin/commissions/:commissionId/review-void` | server/src/routes/affiliate.routes.ts | 277 |
| `POST` | `/api/admin/commissions/:commissionId/void` | server/src/routes/affiliate.routes.ts | 199 |
| `POST` | `/api/admin/commissions/auto-approve` | server/src/routes/affiliate.routes.ts | 343 |
| `POST` | `/api/admin/commissions/bulk-approve` | server/src/routes/affiliate.routes.ts | 310 |
| `GET` | `/api/admin/commissions/flagged` | server/src/routes/affiliate.routes.ts | 233 |
| `GET` | `/api/admin/leaderboard` | server/src/routes/affiliate.routes.ts | 78 |
| `POST` | `/api/admin/payouts/:payoutId/approve` | server/src/routes/affiliate.routes.ts | 382 |
| `POST` | `/api/admin/payouts/:payoutId/process` | server/src/routes/affiliate.routes.ts | 461 |
| `POST` | `/api/admin/payouts/:payoutId/reject` | server/src/routes/affiliate.routes.ts | 420 |
| `POST` | `/api/admin/run-payout-batch` | server/src/routes/affiliate.routes.ts | 669 |

_18 endpoint(s) detected._

<!-- === END AUTO-GENERATED SECTION === -->
