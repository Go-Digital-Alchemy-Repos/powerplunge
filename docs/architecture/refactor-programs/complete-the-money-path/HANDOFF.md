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

Chunk 3 merged to main (PR #27, 7b9e1ea, Tommy-approved 2026-07-13, CI
green). Branch rebased onto the merge commit. Baseline at chunk-4 start:
typecheck 0; unit 42 files / 335 tests green. Webhook routes are thin
transport adapters; all per-event domain logic sits in deps-injected
services tested at public interfaces.

## Next Slice

Slice 1 (retry semantics). Region: server/src/routes/webhooks/
stripe.routes.ts (delivery-claim + ack mapping on both endpoints),
storage processed-webhook-event seam, and the three webhook services'
call boundaries. Red tests first at the route public interface: failed
handler -> non-2xx + delivery NOT marked processed (retry-able); concurrent
duplicate -> exactly one dispatch; successful duplicate -> deduped ack.
The P12 cases carrying `candidate bug` comments are unpinned BY NAME in the
packet; all other characterizations stay frozen.

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
