# Affiliate Management

## Module Info

| Property | Value |
|----------|-------|
| Domain | affiliates |
| Source Files | `server/src/routes/admin/affiliates-v2.routes.ts` (canonical), `server/src/routes/affiliate.routes.ts` (re-export shim) |
| Mount Point | `/api/admin/affiliates-v2` |
| Endpoint Count | 18 |

## Auth & Authorization

| Property | Value |
|----------|-------|
| Auth Required | Yes |
| Roles Allowed | Admin (full access only — `requireFullAccess` middleware applied at mount) |

## Current reality

- **Canonical source:** `server/src/routes/admin/affiliates-v2.routes.ts`
- **Re-export shim:** `server/src/routes/affiliate.routes.ts` re-exports the default from `admin/affiliates-v2.routes.ts`.
- **Effective base mount:** `/api/admin/affiliates-v2` (see `server/routes.ts` line 93).
- **Paths in the corrected table in the Notes section are fully qualified** (mount prefix + router path). The auto-generated table further below has incorrect paths — see the correction notice in Notes.

## How these modules relate

There are **two** admin-facing affiliate route files:

| File | Mount Point | Responsibility |
|------|-------------|----------------|
| `admin/affiliates.routes.ts` | `/api/admin` | Program settings (`/affiliate-settings`), affiliate CRUD (`/affiliates`, `/affiliates/:id`), invite management (`/affiliate-invites`), legacy payout operations (`/payouts`, `/affiliate-payouts/run`, `/affiliate-payouts/batches/:batchId`) |
| `admin/affiliates-v2.routes.ts` | `/api/admin/affiliates-v2` | Commission review workflows (flagged queue, approve, void, review-approve, review-void, bulk-approve, auto-approve), affiliate profile/commissions/referred-customers, leaderboard, structured payout lifecycle (approve → reject → process), manual payout recording, payout batch execution, affiliate deletion |

Both modules require `requireFullAccess` at mount. They coexist because the v1 module handles program configuration and invite workflows, while the v2 module handles the commission-review and payout-processing pipelines added later.

## Notes

> **Path correction notice:** The auto-generated endpoint table below was generated with an incorrect mount prefix (`/api/admin/` instead of `/api/admin/affiliates-v2/`). The corrected fully-qualified paths are listed here for reference until the table is regenerated.

| Method | Effective URL |
|--------|---------------|
| `GET` | `/api/admin/affiliates-v2/leaderboard` |
| `GET` | `/api/admin/affiliates-v2/:affiliateId/profile` |
| `GET` | `/api/admin/affiliates-v2/:affiliateId/commissions` |
| `GET` | `/api/admin/affiliates-v2/:affiliateId/referred-customers` |
| `POST` | `/api/admin/affiliates-v2/commissions/:commissionId/approve` |
| `POST` | `/api/admin/affiliates-v2/commissions/:commissionId/void` |
| `GET` | `/api/admin/affiliates-v2/commissions/flagged` |
| `POST` | `/api/admin/affiliates-v2/commissions/:commissionId/review-approve` |
| `POST` | `/api/admin/affiliates-v2/commissions/:commissionId/review-void` |
| `POST` | `/api/admin/affiliates-v2/commissions/bulk-approve` |
| `POST` | `/api/admin/affiliates-v2/commissions/auto-approve` |
| `POST` | `/api/admin/affiliates-v2/payouts/:payoutId/approve` |
| `POST` | `/api/admin/affiliates-v2/payouts/:payoutId/reject` |
| `POST` | `/api/admin/affiliates-v2/payouts/:payoutId/process` |
| `POST` | `/api/admin/affiliates-v2/:affiliateId/payouts` |
| `GET` | `/api/admin/affiliates-v2/:affiliateId/payouts` |
| `POST` | `/api/admin/affiliates-v2/run-payout-batch` |
| `DELETE` | `/api/admin/affiliates-v2/:affiliateId` |


<!-- === AUTO-GENERATED SECTION (do not edit below this line) === -->

## Endpoints

| Method | Path | Source File | Line |
|--------|------|-------------|------|
| `GET` | `/affiliate` | server/src/routes/customer/affiliates.routes.ts | 94 |
| `POST` | `/affiliate` | server/src/routes/customer/affiliates.routes.ts | 206 |
| `PATCH` | `/affiliate` | server/src/routes/customer/affiliates.routes.ts | 314 |
| `GET` | `/affiliate-invites` | server/src/routes/admin/affiliates.routes.ts | 211 |
| `POST` | `/affiliate-invites` | server/src/routes/admin/affiliates.routes.ts | 254 |
| `DELETE` | `/affiliate-invites/:id` | server/src/routes/admin/affiliates.routes.ts | 291 |
| `POST` | `/affiliate-invites/send` | server/src/routes/admin/affiliates.routes.ts | 319 |
| `GET` | `/affiliate-payouts/batches/:batchId` | server/src/routes/admin/affiliates.routes.ts | 580 |
| `POST` | `/affiliate-payouts/run` | server/src/routes/admin/affiliates.routes.ts | 546 |
| `GET` | `/affiliate-settings` | server/src/routes/admin/affiliates.routes.ts | 71 |
| `PATCH` | `/affiliate-settings` | server/src/routes/admin/affiliates.routes.ts | 111 |
| `POST` | `/affiliate/connect/start` | server/src/routes/customer/affiliates.routes.ts | 336 |
| `GET` | `/affiliate/connect/status` | server/src/routes/customer/affiliates.routes.ts | 398 |
| `POST` | `/affiliate/payout` | server/src/routes/customer/affiliates.routes.ts | 275 |
| `GET` | `/affiliates` | server/src/routes/admin/affiliates.routes.ts | 139 |
| `GET` | `/affiliates/:id` | server/src/routes/admin/affiliates.routes.ts | 164 |
| `PATCH` | `/affiliates/:id` | server/src/routes/admin/affiliates.routes.ts | 182 |
| `GET` | `/payouts` | server/src/routes/admin/affiliates.routes.ts | 463 |
| `PATCH` | `/payouts/:id` | server/src/routes/admin/affiliates.routes.ts | 498 |

_19 endpoint(s) detected._

<!-- === END AUTO-GENERATED SECTION === -->
