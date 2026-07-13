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
   stripe.routes.ts; route becomes pure dispatch) — all slices complete;
   chunk gate pending

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
   with public-interface tests — behavior-preserving — done (P15)
5. Add capability.updated to the Connect service; typed dispatch cleanup;
   preserve or repoint server/src/routes/test/stripe-webhook.routes.ts —
   behavior-preserving — done (P16)

Route keeps: raw-body/signature verification, endpoint-specific secret
resolution, delivery dedupe, HTTP acknowledgement mapping, explicit
dispatch tables. Chunk gate additionally runs
e2e/customer-stripe-webhook-success.spec.ts (real signed-route and
duplicate assertions at :255-:410) — via CI if local E2E env is still
unavailable.

## State

P17 completed the blocking chunk-3 review remediation. The
`payment_intent.payment_failed` field mapping, exact failure log, and
`alertPaymentFailure` call now live behind `alertStripePaymentFailure` on the
dependency-injected Stripe payment webhook service. Four public-interface cases
cover order-aware mapping, missing-order and email fallback behavior, the
default error message, and alert-error propagation. One additive route-seam
case proves the endpoint still reaches alerting through the factory's default
wiring. Both endpoint dispatch tables now require an own property before
selecting a handler, so inherited object keys follow the unchanged unknown-event
acknowledgement path. The frozen legacy route test file and
`handlePaymentIntentSucceededWebhook` export remain unchanged. P17 checks:
focused payment service and route tests, typecheck, full unit suite (42 files,
335 tests), diff checks, and a standard review pass.

## Next Slice

- Open the chunk-3 PR after the director independently verifies the P17
  checkpoint, binding gates, and full chunk diff.
- Files: none unless independent verification or PR CI finds a substantiated,
  in-scope defect.
- Classification: review and publication only; no planned implementation.
- PR evidence: include the completed chunk-3 fixed floor, the P17 remediation
  checks, and the binding CI result for
  `e2e/customer-stripe-webhook-success.spec.ts` if local E2E remains unavailable.
- Review: verify route/service regressions, delivery semantics, compatibility
  exports, dispatch behavior for inherited keys, and test quality across the
  full chunk diff.
- Outcome: open the PR when verification approves. Do not merge without director
  approval.

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
