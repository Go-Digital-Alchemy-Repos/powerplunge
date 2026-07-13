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
   stripe.routes.ts; route becomes pure dispatch) — pending

## Current Chunk Slices (chunk 2; from R1 survey, director-adopted)

1. Characterization baseline: public-interface tests for
   POST /create-payment-intent (happy path, validation errors,
   affiliate/F&F branches, coupon math, tax, customer identity, order/item
   writes) — test-only — done (P5)
2. Pure quote nucleus: new `checkout.service.ts` owns product resolution,
   affiliate/coupon pricing, tax-line construction behind a public quote
   result; route consumes it — behavior-preserving — done (P6)
3. PaymentIntent orchestration: move customer/attribution resolution,
   draft order/items, PaymentIntent creation+linking into the service,
   preserving call order and HTTP mapping — behavior-preserving,
   riskiest slice (non-atomic writes, payments.routes.ts:494-561) — done (P7)
4. /checkout migration: shared quote/customer/order-draft primitives via a
   distinct `createCheckoutSession` operation, preserving no-coupon,
   automatic-tax, zero-total-reject, manual-order-fallback policies —
   behavior-preserving — done (P8)
5. W1 cleanup: simplify the confirm-payment uppercase-USD/checkout-session
   shim once both creation operations own amount/currency truths;
   re-ground its characterization tests - BEHAVIOR-CHANGING - done (P9)
6. Zero-total guard: reject empty carts and non-positive quantities at
   create-payment-intent — BEHAVIOR-CHANGING, red test first (replaces the
   two candidate-bug characterizations from P5) — done (P10; director
   decision 2026-07-13 under delegated grilling authority)

## State

Chunk 2 slice 6 (P10) complete: create-payment-intent rejects empty or missing
carts and quantities that are not positive integer numbers before product,
order, tax, or Stripe PaymentIntent access. Chunk 2's implementation slices are
complete. P10 checkpoint: this commit. Verified after standard review with
focused route/service tests, typecheck, and the full unit suite green.

## Next Slice

- Chunk 2 gate, owned by the director.
- Review the full chunk diff for route/service regressions and run the fixed
  chunk-gate floor plus selected risk-based checks before calling chunk 2 done.

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
