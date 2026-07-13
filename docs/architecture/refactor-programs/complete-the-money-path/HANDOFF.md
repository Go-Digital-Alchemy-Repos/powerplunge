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

P16 completed chunk 3 slice 5: `capability.updated` payout-account refresh now
lives behind `synchronizeAffiliatePayoutCapability` on the dependency-injected
Connect webhook service. The service resolves string and object account forms,
retrieves the full Stripe account through a lazy injected seam, maps account
state with false defaults, preserves requirements, emits the exact Connect log,
and always writes the capability audit after a matched update. Five new
public-interface cases cover the happy path, object account form, unknown payout
account, missing account ID, and seam-error propagation (10 Connect service
tests total). Both webhook endpoints now use typed per-event handler maps while
preserving endpoint-specific error and acknowledgement behavior. The legacy
`handlePaymentIntentSucceededWebhook` export remains unchanged, and both frozen
route files remain untouched. P16 checkpoint checks: focused Connect and route
tests, typecheck, full unit suite, diff checks, and a standard review pass.

## Next Slice

- Run the chunk-3 gate before PR: fixed floor plus adversarial review of the full
  chunk diff.
- Files: review only; change implementation files only to fix substantiated,
  in-scope gate findings, and update this handoff with the gate result.
- Classification: behavior-preserving verification gate.
- Fixed floor: all chunk slice tests, affected webhook route/service/storage
  tests, `npm run typecheck`, `git diff --check`, and the full unit suite.
- Risk-based check: run
  `e2e/customer-stripe-webhook-success.spec.ts` for signed-route success and
  duplicate handling when the local E2E environment supports it; otherwise use
  the binding PR CI run.
- Review: fresh adversarial review of the full chunk-3 diff for route/service
  regressions, delivery semantics, compatibility exports, and test quality.
- Outcome: if the fixed floor, risk-based check, and review approve, open the PR
  for chunk 3. Do not merge without director verification.

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
