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

Extension approved by Tommy 2026-07-13 (D3 dispositions, "all your
recommendations"): chunk 4 (webhook hardening: D2 retry semantics + refund
pagination + Stripe idempotency keys + unpaid-order notification), chunk 5
(reprice extraction, single-packet-scale). Posture E (repository layer)
explicitly DEFERRED: storage.ts (2,067 lines) stays; recorded here as the
program's known remaining debt, not scheduled.

## Chunks

1. Small unlocks (A, C, D) — DONE, merged via PR #25 (511b0b3)
2. Checkout service (B) — DONE, merged via PR #26 (1e6a120); declared
   PARTIALLY complete per D3: /reprice-payment-intent residue moved to
   chunk 5
3. Webhook service (F) — DONE, merged via PR #27 (7b9e1ea): three services
   (stripe-refund-webhook, stripe-connect-webhook, stripe-payment-webhook),
   typed dispatch, route 391 -> 238 lines, suite 305 -> 335
4. Webhook hardening (behavior-CHANGING; D2 resolved spec + D3 items 1-2, 4)
   — CURRENT
5. Reprice extraction (move /reprice-payment-intent pricing/coupon/affiliate
   logic into checkout.service; behavior-preserving) — after chunk 4

## Current Chunk Slices (chunk 4; director-authored from D2 resolved spec + D3)

1. Retry semantics (D2 spec, RISKIEST — mid-chunk mini-review after): atomic
   processing->processed delivery claim replacing insert-after-success
   dedupe; handler failures propagate to non-2xx acks on BOTH endpoints
   (refund/Connect swallowing removed at the service call boundary);
   red-first — the P12 candidate-bug characterizations pinning swallowed-200
   behavior are EXPLICITLY unpinned and rewritten by this slice
2. Refund completeness: charge.refunded handles refund lists with has_more
   via pagination; refund.updated unknown-refund path decided (warn stays);
   per-refund idempotency asserted — red-first
3. Stripe idempotency keys: deterministic key for refund creation (drop
   Date.now()); idempotency keys on PI/Checkout Session creates in
   checkout.service — red-first
4. Unpaid-order notifications: manual-fallback PENDING orders no longer fire
   fulfillment sendOrderNotification until paid (per ADR-0001
   payment-authority; approved direction — suppress, notification fires on
   finalization instead) — red-first

## State

Chunk 4 slice 1 (retry semantics), including the P18d partial-progress retry
remediation, is done on the program branch. Both Stripe webhook endpoints claim
an event atomically with `metadata.status="processing"`, mark it `processed`
only after dispatch succeeds, and delete the claim before returning a minimal
500 response when a handler fails. Duplicate, signature, unknown-event, and
successful-delivery acknowledgements retain their prior semantics. Refund
synchronization propagates non-Meta failures, while Meta enqueue remains
best-effort.

The remediation makes the persisted business-state marker the last write in
both affected update operations. `refund.updated` now attempts Meta enqueue,
updates the Order payment status, and appends its audit record before persisting
the Refund status. `account.updated` appends its conditional audit record before
persisting the payout-account state. A pre-marker failure therefore leaves the
old state visible and a Stripe retry completes the branch. The accepted narrow
window between an audit append and the final marker write can produce a duplicate
append-only audit record on retry. `charge.refunded` remains unchanged because
its per-Refund create-vs-update operation is already the retry marker.

The P18d public-interface regressions script a first-call failure and second-call
success against stateful storage seams. They prove the retry completes the Order
status and Refund audit/update work, and the payout-account audit/update work.
No route, storage, schema, acknowledgement, or claim-contract changes were made.

## Next Slice

Implement chunk 4 slice 2: refund completeness. `charge.refunded` must follow
Stripe refund pagination when `has_more` is true, while preserving idempotent
create-vs-update processing for every Refund. Keep the decided `refund.updated`
unknown-Refund warning behavior and the P18/P18d propagation, best-effort Meta,
claim, acknowledgement, and marker-last retry contracts unchanged.

This is a behavior-changing slice. Pin pagination and per-Refund idempotency
through red-first public-interface tests before implementation. Do not add
crash-stale processing-claim reconciliation; that remains deferred to the
chunk-4 gate.

## Risks / Constraints

- Test quality (Tommy 2026-07-13): no brittle seam tests. Tests verify
  behavior through public interfaces; a test that breaks on a rename/move
  without behavior change is wrong and gets rejected at review.
- Risk posture (Tommy 2026-07-13): no real orders exist yet; temporary
  breakage on the program branch is acceptable, but every slice still ends
  green and anything broken gets fixed before the chunk gate.
- Chunk 4 is behavior-CHANGING end to end: every slice needs pasted red
  output before implementation; characterization edits allowed ONLY for
  cases the packet unpins by name.
- Standing skill rules apply (.agents/skills/powerplunge-refactor-program):
  no new schema/routes/services beyond what the slice names; no obligation
  ledger; domain language from CONTEXT.md.
- Stripe-doc grounding for chunk 4 (R3, director spot-checked): non-2xx ->
  exponential-backoff retries up to three days (live); dedupe by event id;
  processing/processed claim per docs.stripe.com/webhooks/process-undelivered-events.
