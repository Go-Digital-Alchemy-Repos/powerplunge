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
   gate at confirm-payment; D: split "claim" vocabulary) — in progress
2. Checkout service (B: extract create-payment-intent pricing/discount/order
   creation behind a deep interface) — pending
3. Webhook service (F: extract refund-sync + Connect handling from
   stripe.routes.ts; route becomes pure dispatch) — pending

## Current Chunk Slices

1. Extract `sendOrderNotification` into `order-notification.service.ts`;
   factory defaults the dep — behavior-preserving — done (P1)
2. Delete duplicated paid-state guards at confirm-payment call site
   (payments.routes.ts:936-965), trust service `skipped` reasons —
   behavior-preserving — next
3. Rename `order-claim.service` to account-linking vocabulary; update
   CONTEXT.md; note the finalization claim's home — behavior-preserving —
   pending

## State

P1 complete on `refactor/complete-the-money-path`: order notification now
lives in `order-notification.service.ts`, and finalization defaults the
dependency. Next slice: deduplicate the confirm-payment paid-state guards.

## Next Slice

- Slice 2 (P2): delete the duplicated paid-state guards at the
  confirm-payment call site in `server/src/routes/public/payments.routes.ts`
  (route-level pre-checks duplicating
  `order-finalization.service.ts` guard logic at :83-98); trust the
  service's `skipped` reasons instead. Plus P1 remainder: switch
  `server/src/routes/admin/orders.routes.ts:220` to import
  `sendOrderNotification` from the service and drop the compatibility
  re-export from payments.routes.ts (:11,:15).
- Classification: behavior-preserving (guard logic already lives in the
  service; route duplicate is dead weight).
- Test: existing confirm-payment/finalization tests are the
  characterization net and stay green untouched; no new test file expected
  unless a guard behavior turns out NOT to be covered — then cover it at
  the route's public interface first, then delete the duplicate.
- Checks: `npm run typecheck` exit 0; `npm run with:local-auth-env -- npm
  run test:unit` exit 0; zero matches for `payments.routes` imports in
  admin orders.routes.ts; no `sendOrderNotification` re-export remains in
  payments.routes.ts.

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
