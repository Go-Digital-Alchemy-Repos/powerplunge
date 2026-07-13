# Packet: P13 — extract charge.refunded handling into stripe-refund-webhook.service

Lane: implementation

## Context (self-contained; verified by director 2026-07-13)

Repo: /Users/thomascarney/Projects/powerplunge, branch
refactor/complete-the-money-path @ e5baec6 (+ director loop-state
commits). Baseline VERIFIED by execution: `npm run typecheck` exit 0;
`npm run with:local-auth-env -- npm run test:unit` green (39 files / 305
tests, including 16 fresh webhook characterizations in
server/src/routes/webhooks/__tests__/stripe.routes.test.ts — they are THE
NET for this slice; existing cases MUST NOT be edited).

Target: /Users/thomascarney/Projects/powerplunge/server/src/routes/webhooks/stripe.routes.ts
`charge.refunded` branch (:87-150 region): dynamic-imports
refund.service (`normalizeStripeRefundStatus`, `updateOrderPaymentStatus`),
looks up the order by payment_intent, iterates charge.refunds.data,
UPDATES existing refund records' status or CREATES new refund records,
enqueues Meta processed-refund events (create and update paths), warns on
no-order-found, and swallows every error into the 200 ack.
Existing service surface:
/Users/thomascarney/Projects/powerplunge/server/src/services/refund.service.ts
exports normalizeStripeRefundStatus (re-export :12), PaymentStatus types
(:20), updateOrderPaymentStatus (:22), createStripeRefund (:43).

Standing decisions that bind this slice:

- BEHAVIOR-PRESERVING: the swallowed-error 200-ack and dedupe-before-
  dispatch semantics are pinned by P12 characterizations and by open
  decision D2
  (/Users/thomascarney/Projects/powerplunge/planning/loop/decisions-pending.md)
  — do NOT change retry or ack behavior.
- Route keeps: raw-body/signature verification, secret resolution,
  delivery dedupe, HTTP acknowledgement mapping, dispatch table. The
  extracted service receives plain event data, never req/res.
- House idiom: deps-injected factory like order-finalization.service.ts /
  checkout.service.ts.

## Goal

New `server/src/services/stripe-refund-webhook.service.ts` owns the
charge.refunded synchronization logic behind a public operation taking
plain event data (charge object or the minimal fields it needs) and
performing the same lookups/writes/Meta enqueues with the same logging
and the same error-swallowing INSIDE the service boundary the route had
(route keeps acking 200 regardless). The route branch becomes a thin call.
Proof: the 20 webhook characterizations pass UNTOUCHED; full suite green;
new service tests cover the sync logic at the service public interface.

## Scope and non-goals

In scope:
- server/src/services/stripe-refund-webhook.service.ts (new)
- server/src/services/__tests__/stripe-refund-webhook.service.test.ts (new)
- server/src/routes/webhooks/stripe.routes.ts (charge.refunded branch
  only)
- docs/architecture/refactor-programs/complete-the-money-path/HANDOFF.md
  (full State/Next Slice rewrite per its format: slice 2 done, note the
  mid-chunk mini-review happens next, then slice 3 refund.updated)

Non-goals (forbidden):
- Editing stripe.routes.test.ts in ANY way. If a characterization fails,
  the move changed behavior — fix the move.
- Touching refund.updated (slice 3), Connect endpoint (slices 4-5),
  refund.service.ts production code, or ack/dedupe semantics (D2).
- No new schema/routes/npm deps. No Express types in the service.

## Exact implementation steps

1. Re-run the characterization baseline green at HEAD first.
2. Read the branch fully; enumerate every seam call (storage methods,
   refund.service functions, Meta service, console logging); list them in
   the report.
3. Create the service with a deps-injected factory (default deps = real
   storage / refund.service / Meta integration; keep the dynamic import
   inside the default if a static import creates a cycle — check and
   report which you chose). Public operation name from domain language
   (CONTEXT.md). Same warn/log messages.
4. Replace the route branch with the service call; the route's
   surrounding try/catch and 200-ack behavior unchanged.
5. Write service tests at the public interface: happy-path create,
   existing-refund update (no duplicate), no-order-found warn path, seam
   error swallowed (operation resolves; route-visible behavior
   unchanged), Meta enqueue attempted on both create and update paths.
   Stub external seams only.
6. HANDOFF.md per Scope.

FORBIDDEN test shapes: unchanged from prior packets (no snapshots, no
call-order asserts, no private-helper asserts, no mocking the module
under test).

## Validation commands (binding gates)

- `npm run typecheck` -> exit 0
- `npm run with:local-auth-env -- npm run test:unit` -> exit 0 (trap-100:
  one retry on full-suite failure; two failures = STOP, commit nothing,
  report exact assertions)
- `git diff-tree --no-commit-id --name-only -r <your-commit>` lists ONLY
  the four in-scope files (planning/ worktree dirt is the director's).
- `git diff HEAD~1 -- server/src/routes/webhooks/__tests__/stripe.routes.test.ts`
  -> empty output.
- New service test file has >= 6 `it(` cases (state count).
- ONE commit. Do NOT push.
- After code-review fixes: re-run the FULL gate set before final JSON.

## Edge cases / failure modes

- charge.refunds.data can hold multiple refunds; preserve per-refund
  iteration semantics including partial failures mid-loop (characterized
  behavior wins).
- If the branch shares helpers with refund.updated, extract ONLY what
  charge.refunded needs; leave shared code importable for slice 3 rather
  than duplicating (note the seam in the report).
- If the diff exceeds 600 non-test lines, STOP and propose a split.

## Hard rules

- No push, deploy, merge, production mutation, real Stripe charge, or
  real email. Never print secrets. Touch NOTHING outside Scope.

## Rollback

Revert the single commit; no state outside git.
