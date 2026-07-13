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
   behavior-preserving — done (P2)
3. Rename `order-claim.service` to account-linking vocabulary; update
   CONTEXT.md; note the finalization claim's home — behavior-preserving —
   next

## State

P2 complete on `refactor/complete-the-money-path`: confirm-payment delegates
order-not-found, amount, and currency paid-state decisions to order
finalization and translates skipped reasons to the existing HTTP contract.
Admin manual-order notification imports the notification service directly;
the payments route compatibility re-export is gone. Next slice: rename
`order-claim.service` to account-linking vocabulary and document the
finalization claim's actual home.

## Next Slice

- Slice 3 (P3): rename `server/src/services/order-claim.service.ts` and its
  public vocabulary to account-linking/order-reassignment language; update
  the customer auth call sites and test mock path. Update `CONTEXT.md` to
  clarify that order finalization and `markOrderPaidIfPending` own the domain
  Finalization claim. Choose exact account-linking names from existing domain
  language during the slice; do not conflate ownership reassignment with the
  Finalization claim.
- Classification: behavior-preserving.
- Test: existing customer auth and order-claim service coverage stays green;
  add behavior coverage only if inspection finds a public-interface gap before
  renaming.
- Checks: `npm run typecheck` exit 0; `npm run with:local-auth-env -- npm
  run test:unit` exit 0; zero scoped matches for the old service filename and
  claim vocabulary after the rename.

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
