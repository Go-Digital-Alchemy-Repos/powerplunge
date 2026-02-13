# Affiliates V2

## Module Info

| Property | Value |
|----------|-------|
| Domain | affiliates-v2 |
| Source Files | server/src/routes/admin/affiliates-v2.routes.ts |
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
| `DELETE` | `/:affiliateId` | server/src/routes/admin/affiliates-v2.routes.ts | 691 |
| `GET` | `/:affiliateId/commissions` | server/src/routes/admin/affiliates-v2.routes.ts | 143 |
| `GET` | `/:affiliateId/payouts` | server/src/routes/admin/affiliates-v2.routes.ts | 651 |
| `POST` | `/:affiliateId/payouts` | server/src/routes/admin/affiliates-v2.routes.ts | 560 |
| `GET` | `/:affiliateId/profile` | server/src/routes/admin/affiliates-v2.routes.ts | 90 |
| `GET` | `/:affiliateId/referred-customers` | server/src/routes/admin/affiliates-v2.routes.ts | 155 |
| `POST` | `/commissions/:commissionId/approve` | server/src/routes/admin/affiliates-v2.routes.ts | 167 |
| `POST` | `/commissions/:commissionId/review-approve` | server/src/routes/admin/affiliates-v2.routes.ts | 244 |
| `POST` | `/commissions/:commissionId/review-void` | server/src/routes/admin/affiliates-v2.routes.ts | 277 |
| `POST` | `/commissions/:commissionId/void` | server/src/routes/admin/affiliates-v2.routes.ts | 199 |
| `POST` | `/commissions/auto-approve` | server/src/routes/admin/affiliates-v2.routes.ts | 343 |
| `POST` | `/commissions/bulk-approve` | server/src/routes/admin/affiliates-v2.routes.ts | 310 |
| `GET` | `/commissions/flagged` | server/src/routes/admin/affiliates-v2.routes.ts | 233 |
| `GET` | `/leaderboard` | server/src/routes/admin/affiliates-v2.routes.ts | 78 |
| `POST` | `/payouts/:payoutId/approve` | server/src/routes/admin/affiliates-v2.routes.ts | 382 |
| `POST` | `/payouts/:payoutId/process` | server/src/routes/admin/affiliates-v2.routes.ts | 461 |
| `POST` | `/payouts/:payoutId/reject` | server/src/routes/admin/affiliates-v2.routes.ts | 420 |
| `POST` | `/run-payout-batch` | server/src/routes/admin/affiliates-v2.routes.ts | 669 |

_18 endpoint(s) detected._

<!-- === END AUTO-GENERATED SECTION === -->
