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
   factory defaults the dep — behavior-preserving — in progress (P1)
2. Delete duplicated paid-state guards at confirm-payment call site
   (payments.routes.ts:936-965), trust service `skipped` reasons —
   behavior-preserving — pending
3. Rename `order-claim.service` to account-linking vocabulary; update
   CONTEXT.md; note the finalization claim's home — behavior-preserving —
   pending

## State

Last verified: baseline on main @ 7621f7d — `npm run with:local-auth-env --
npm run test:unit` exit 0 (2026-07-13). Program branch created. No slices
landed yet.

## Next Slice

- Files: `server/src/routes/public/payments.routes.ts` (remove
  :1276-1457 function; keep call at :1189 via import; stop injecting at
  :976-977), `server/src/routes/webhooks/stripe.routes.ts` (:5,:10,:15 stop
  importing from route), new `server/src/services/order-notification.service.ts`,
  `server/src/services/order-finalization.service.ts` (factory defaults the
  `sendOrderNotification` dep; explicit dep override stays for tests), new
  test `server/src/services/__tests__/order-notification.service.test.ts`.
- Classification: behavior-preserving (verbatim move + wiring).
- Test: characterization at the public interface before the move — existing
  order-finalization tests stay green; new service test asserts observable
  behavior only (recipient, subject, order id reach the email seam; both
  email outcomes logged, failures never throw). No HTML-body snapshots, no
  internal call-order assertions.
- Checks: `npm run typecheck` exit 0; `npm run with:local-auth-env -- npm run
  test:unit` exit 0; `rtk grep -c 'from "../public/payments.routes"'
  server/src/routes/webhooks/stripe.routes.ts` returns 0 matches.

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
