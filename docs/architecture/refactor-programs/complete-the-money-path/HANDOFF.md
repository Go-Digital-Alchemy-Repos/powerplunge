# Refactor Program: Complete the Money Path

## Program

Goal: make the upstream half of the money path (checkout pricing, discounts,
order creation) match the depth of the downstream half (order finalization):
deep services, small interfaces, tested at the public interface.
Target seam: the checkout/order-finalization service layer around
`server/src/routes/public/payments.routes.ts` and
`server/src/routes/webhooks/stripe.routes.ts`.
Architecture review artifact: `.lavish/architecture-review-2026-07-13.html`
(candidates A-F; survey facts in `planning/loop/loop-state.md`).
Approved by Tommy 2026-07-13: program shape and grilling decisions delegated
to the director. Branch: `refactor/complete-the-money-path`.

## Chunks

1. Small unlocks (A: extract order-notification service; C: dedupe paid-state
   gate at confirm-payment; D: split "claim" vocabulary) — DONE, merged to
   main via PR #25 (511b0b3, approved by Tommy 2026-07-13)
2. Checkout service (B: extract create-payment-intent pricing/discount/order
   creation behind a deep interface; /checkout shares it via a distinct
   operation; W1 shim cleanup) — all slices complete; chunk gate pending
3. Webhook service (F: extract refund-sync + Connect handling from
   stripe.routes.ts; route becomes pure dispatch) — in progress

## Current Chunk Slices (chunk 3; from R2 survey, director-adopted)

1. Characterization baseline: public-interface tests for POST /stripe and
   POST /stripe-connect (secrets resolution, signature failures, delivery
   dedupe, unknown events, payment-failure alerting, swallowed-error 200
   acks) — test-only — done (P12)
2. Extract charge.refunded into new `stripe-refund-webhook.service.ts`
   with public-interface tests — behavior-preserving — RISKIEST slice:
   gets the HIGH mid-chunk mini-review before further slices — done (P13)
3. Move refund.updated into the same refund service —
   behavior-preserving — done (P14)
4. Extract account.updated into new `stripe-connect-webhook.service.ts`
   with public-interface tests — behavior-preserving — pending
5. Add capability.updated to the Connect service; typed dispatch cleanup;
   preserve or repoint server/src/routes/test/stripe-webhook.routes.ts —
   behavior-preserving — pending

Route keeps: raw-body/signature verification, endpoint-specific secret
resolution, delivery dedupe, HTTP acknowledgement mapping, explicit
dispatch tables. Chunk gate additionally runs
e2e/customer-stripe-webhook-success.spec.ts (real signed-route and
duplicate assertions at :255-:410) — via CI if local E2E env is still
unavailable.

## State

P14 completed chunk 3 slice 3: both `charge.refunded` and `refund.updated`
synchronization now live behind public operations on
`stripe-refund-webhook.service.ts`. The `refund.updated` operation receives the
plain Stripe refund and event ID, owns refund lookup/update, processed-refund
Meta enqueue, order payment-status synchronization, audit logging, and
error-swallowing, while the route remains thin dispatch. Public service tests
cover changed/no-op/unknown/error paths and pin charge-refund Meta failure and
mid-loop partial-failure behavior. The 20 P12 route characterizations remain
untouched and green. P14 checkpoint checks: focused service tests (15), focused
route tests (20), typecheck, and full unit suite.

## Next Slice

- Slice 4 extracts `account.updated` into a new
  `server/src/services/stripe-connect-webhook.service.ts` public operation.
- Files: `server/src/routes/webhooks/stripe.routes.ts`, the new Connect webhook
  service, its focused public-interface test file, and this handoff.
- Classification: behavior-preserving.
- Test: characterize the public operation's known-account update and conditional
  audit behavior, unchanged-state no-audit path, unknown-account no-op, and
  swallowed seam errors before moving the route branch. Stub storage seams only.
- Preserve byte-for-byte account update log/audit content, event ID metadata,
  Connect delivery dedupe, signature handling, and swallowed-error 200 ack.
- Checks: focused Connect service and frozen route characterizations,
  `npm run typecheck`, and the full unit suite.

## Risks / Constraints

- Test quality (Tommy 2026-07-13): no brittle seam tests. Tests verify
  behavior through public interfaces; a test that breaks on a rename/move
  without behavior change is wrong and gets rejected at review.
- Risk posture (Tommy 2026-07-13): no real orders exist yet; temporary
  breakage on the program branch is acceptable, but every slice still ends
  green and anything broken gets fixed before the chunk gate.
- Standing skill rules apply (.agents/skills/powerplunge-refactor-program):
  no new schema/routes/services beyond what the slice names; no obligation
  ledger; domain language from CONTEXT.md.
