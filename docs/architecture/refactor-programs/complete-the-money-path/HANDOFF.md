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
   gate at confirm-payment; D: split "claim" vocabulary) — done
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
3. Separate account-linking vocabulary from the Finalization claim; update
   CONTEXT.md — behavior-preserving — done (P3)

## State

P3 complete on `refactor/complete-the-money-path`: the account-linking service,
exports, result type, log prefix, customer auth call sites, and test mock use
account-linking vocabulary. `CONTEXT.md` distinguishes account linking from the
Finalization claim. All chunk 1 slices are complete.
Chunk 1 review remediation has landed, and the chunk is ready for PR.

## Next Slice

- Chunk 1 gate: adversarial review packet, branch push, and PR.
- Owner: director. This is not a Codex implementation packet.
- Review: inspect the full chunk diff for architectural regressions and verify
  all chunk checks before publishing the branch.

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
