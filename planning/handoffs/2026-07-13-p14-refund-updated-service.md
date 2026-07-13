# Packet: P14 — move refund.updated handling into stripe-refund-webhook.service

Lane: implementation

## Context (self-contained; verified by director 2026-07-13)

Repo: /Users/thomascarney/Projects/powerplunge, branch
refactor/complete-the-money-path @ aa11e24 (+ director loop-state
commits). Baseline VERIFIED by execution: `npm run typecheck` exit 0;
`npm run with:local-auth-env -- npm run test:unit` green (40 files / 312
tests). The 20 characterizations in
server/src/routes/webhooks/__tests__/stripe.routes.test.ts are THE NET;
existing cases MUST NOT be edited. P13's mid-chunk mini-review passed
(director gate before this packet fired).

Target: /Users/thomascarney/Projects/powerplunge/server/src/routes/webhooks/stripe.routes.ts
`refund.updated` branch (starts :98 at baseline): dynamic-imports
refund.service (normalizeStripeRefundStatus, updateOrderPaymentStatus),
looks up the local refund by stripe refund id; if found AND the
normalized status differs: updates the refund (processedAt set when
newly processed), enqueues Meta processed-refund on transition to
processed (Meta errors logged, swallowed), updates order payment
status, writes a createAuditLog entry (action "refund.status_synced",
metadata incl. eventId), logs a sync line; if not found warns; the
whole branch's errors are caught and logged (route still 200-acks).
NOTE the branch USES event.id (audit metadata) — the service operation
needs the event id passed in alongside the refund object.

Existing service from P13:
/Users/thomascarney/Projects/powerplunge/server/src/services/stripe-refund-webhook.service.ts
(155 lines): deps-injected factory, injected loadRefundOperations with
dynamic default import INSIDE the operation (module-load side-effect
fix — preserve this idiom), error-swallowing inside the service, route
does thin calls. Its test file has 7 cases; both are yours to extend.

Standing decisions that bind this slice:

- BEHAVIOR-PRESERVING: ack/dedupe semantics pinned; D2's approved
  retry-semantics changes land in a LATER dedicated slice, NOT here.
- Route keeps signature verification, dedupe, dispatch, 200-ack
  mapping. Service receives plain event data (refund object + event
  id), never req/res.
- Same warn/log/audit messages byte-for-byte.

## Goal

The refund.updated branch becomes a thin call into a second public
operation on stripe-refund-webhook.service.ts (same factory), with the
same lookups/writes/Meta enqueue/audit log and error-swallowing inside
the service. Proof: the 20 webhook characterizations pass UNTOUCHED;
full suite green; new service tests cover the operation at its public
interface.

## Scope and non-goals

In scope:
- server/src/services/stripe-refund-webhook.service.ts
- server/src/services/__tests__/stripe-refund-webhook.service.test.ts
- server/src/routes/webhooks/stripe.routes.ts (refund.updated branch
  only)
- docs/architecture/refactor-programs/complete-the-money-path/HANDOFF.md
  (full State/Next Slice rewrite per its format: slice 3 done, next =
  slice 4 Connect service)

Non-goals (forbidden):
- Editing stripe.routes.test.ts in ANY way (frozen; empty-diff gate).
- Touching the charge.refunded operation's behavior, Connect endpoint
  (slices 4-5), refund.service.ts production code, ack/dedupe semantics
  (D2 later slice), payment_intent.* branches.
- No new schema/routes/npm deps. No Express types in the service.

## Exact implementation steps

1. Re-run the baseline green at HEAD first.
2. Read the branch fully; enumerate seam calls (storage.getRefundByStripeRefundId,
   storage.updateRefund, storage.createAuditLog, refund.service fns,
   Meta enqueue, console logging); list them in the report.
3. Add the second operation to the existing factory; reuse the
   loadRefundOperations injection; name from domain language
   (CONTEXT.md). Pass the Stripe refund object AND event id in.
4. Replace the route branch with the thin service call; surrounding
   try/catch and 200-ack behavior unchanged.
5. New service tests at the public interface: status-changed update
   path (refund updated + audit log written + order status updated),
   no-op when normalized status equals current (no writes), Meta
   enqueue on transition to processed, Meta failure swallowed while the
   sync still completes, unknown refund id warn path, seam error
   swallowed (operation resolves). Stub external seams only.
6. ALSO add two cases for the EXISTING charge.refunded operation
   (P13 mini-review deferrable gaps, same test file, test-only —
   no production change to that operation): (a) Meta enqueue failure
   is swallowed and the refund sync still completes; (b) multi-refund
   charge where one refund's storage write fails mid-loop — pin the
   CURRENT partial-failure behavior, whatever it is (characterize, do
   not fix).
7. HANDOFF.md per Scope.

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
- Service test file gains >= 7 new `it(` cases (>= 5 for
  refund.updated + the 2 charge.refunded gap cases; state before/after
  counts).
- ONE commit. Do NOT push.
- After code-review fixes: re-run the FULL gate set before final JSON.

## Edge cases / failure modes

- The no-change fast path (existing status === normalized status) does
  NOTHING today (no audit log, no order-status update, no log line) —
  preserve exactly.
- processedAt: set to new Date() only when the NEW status is processed;
  otherwise keep existingRefund.processedAt — preserve exactly.
- If the diff exceeds 400 non-test lines, STOP and propose a split.

## Hard rules

- No push, deploy, merge, production mutation, real Stripe charge, or
  real email. Never print secrets. Touch NOTHING outside Scope.

## Rollback

Revert the single commit; no state outside git.
