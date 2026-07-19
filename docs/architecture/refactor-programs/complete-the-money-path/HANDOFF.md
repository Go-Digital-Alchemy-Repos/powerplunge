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

Chunk 4 slices 1-2 are done on the program branch. The P18/P18d/P18e delivery
claim and retry contracts remain in force: handler failures propagate, claims are
deleted before 500 responses, and refund Meta enqueue stays best-effort. The
accepted `refund.updated` partial-progress limitation and persisted-Refund-first
ordering are unchanged.

For `charge.refunded`, an incomplete embedded Refund collection
(`refunds.has_more=true`) now uses `StripeService.listRefundsForCharge`. That
method uses Stripe SDK 20.3.1 `autoPagingEach`, so the SDK follows every cursor
without an artificial result cap and rejects naturally if any page fetch fails.
The complete collection replaces the embedded page during processing, preventing
Refunds present in both sources from being processed twice. A false or absent
`has_more` retains the embedded-only path and makes no list call.

Red-first coverage failed on the missing eleventh Refund before implementation.
The completed service suite proves the eleventh Refund is created, the first ten
are not duplicated, complete embedded collections do not list, and list failures
propagate. Verified checks: `npm run typecheck` exit 0; focused service suite 19
tests passed; full unit suite 42 files / 344 tests passed. No route, storage,
schema, `refund.updated`, claim, acknowledgement, or write ordering changed. The
standard fresh-context review approved the slice with no material findings.

## Next Slice

Implement chunk 4 slice 3: Stripe idempotency keys. Replace the `Date.now()`
component of Stripe Refund creation keys with a deterministic operation identity,
and pass deterministic idempotency keys to PaymentIntent and Checkout Session
creation in checkout.service. Pin each operation at its public service interface:
equivalent retries must send the same key, while distinct business operations
must not collide.

- Files: `server/src/services/refund.service.ts`,
  `server/src/services/__tests__/refund.service.test.ts`,
  `server/src/routes/admin/operations.routes.ts` and a focused route test;
  `server/src/services/checkout.service.ts`,
  `server/src/services/__tests__/checkout.service.test.ts`,
  `server/src/routes/public/payments.routes.ts`,
  `server/src/routes/public/__tests__/create-payment-intent.routes.test.ts`, and
  `server/src/routes/public/__tests__/payments.routes.test.ts`. The public
  PaymentIntent route injects a direct Stripe adapter, so service-only edits would
  leave that production path without the key.
- Classification: behavior-changing.
- Test: red-first assertions for stable Refund, PaymentIntent, and Checkout
  Session keys across equivalent retries, plus non-collision coverage for distinct
  operations. Do not assert private helper details.
- Checks: focused refund and checkout service suites,
  `npm run typecheck`, `npm run with:local-auth-env -- npm run test:unit`, and
  `git diff --check`.

The slice packet must pin the Refund operation identity before editing. Current
inputs have only order, amount, and reason; those fields can collide for two
legitimate same-amount Refunds, while refundable balance is not stable across a
post-Stripe/pre-local-write retry. Recommended direction: require a caller-owned
attempt token (the admin HTTP `Idempotency-Key` header) and pass it through
`CreateRefundParams`; equivalent retries reuse it and distinct attempts use a new
one. Do not substitute an order/amount key or another time-derived value.

Do not change webhook routes, schema, refund pagination, notification behavior,
webhook claim/acknowledgement semantics, or the accepted partial-progress
contracts. Keep public/admin route edits limited to forwarding the new keys or
Refund attempt identity. Do not add crash-stale processing-claim reconciliation;
it remains deferred to the chunk-4 gate.

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
