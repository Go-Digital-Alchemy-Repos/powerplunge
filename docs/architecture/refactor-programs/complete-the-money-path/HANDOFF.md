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
   with public-interface tests — behavior-preserving — done (P15)
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

P15 completed chunk 3 slice 4: `account.updated` payout-account synchronization
now lives behind `synchronizeAffiliatePayoutAccount` on the dependency-injected
`stripe-connect-webhook.service.ts`. The operation receives the plain Stripe
account and event ID, owns lookup, enablement/default mapping, requirements
passthrough, exact Connect logging, and changed-fields-only audit behavior. It
silently no-ops for an unknown account and propagates seam errors to the route's
existing catch, preserving the endpoint's 200 acknowledgement behavior. Five
public-interface service tests cover the required update, conditional audit,
unknown-account, absent-field defaulting, and propagation paths. The P12 route
characterizations remain untouched and green. P15 checkpoint checks: focused
Connect service tests (5), focused route tests, typecheck, and full unit suite.

## Next Slice

- Slice 5 moves `capability.updated` into the existing
  `server/src/services/stripe-connect-webhook.service.ts` and cleans up webhook
  dispatch typing without changing endpoint behavior.
- Files: `server/src/routes/webhooks/stripe.routes.ts`,
  `server/src/services/stripe-connect-webhook.service.ts`,
  `server/src/services/__tests__/stripe-connect-webhook.service.test.ts`,
  `server/src/routes/test/stripe-webhook.routes.ts` if required to preserve or
  repoint its compatibility surface, and this handoff.
- Classification: behavior-preserving.
- Test: add public-interface Connect service coverage for capability account ID
  resolution, Stripe account retrieval, payout-account refresh, exact audit/log
  content, unknown/missing account no-op, and error propagation before moving
  the route branch. Preserve or repoint the legacy test-route surface explicitly.
- Preserve byte-for-byte capability update log/audit content, Connect delivery
  dedupe, signature handling, and route-owned swallowed-error 200 acknowledgement.
- Checks: focused Connect service tests, frozen webhook route characterizations,
  affected legacy test-route tests, `npm run typecheck`, `git diff --check`, and
  the full unit suite. Because slice 5 completes chunk 3, also run the chunk gate
  and the signed webhook E2E via CI if the local E2E environment is unavailable.

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
