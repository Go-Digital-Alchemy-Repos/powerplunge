# Packet: P18d — retry-semantics remediation: partial-progress retries must complete

Lane: implementation

## Current delta

P18's mid-chunk mini-review (HIGH) found two partial-progress retry
holes that block slice 2 (director adopted the finding; the review's
citations are director-trusted from its executed pass):

1. MAJOR: refund.updated in
   /Users/thomascarney/Projects/powerplunge/server/src/services/stripe-refund-webhook.service.ts
   (:138-180 region) persists the refund's new status FIRST; if the
   subsequent order-payment-status update or audit write fails, the
   route 500s (correct), but Stripe's retry then matches
   `existingRefund.status === normalizedStatus` and takes the no-change
   fast path — the remaining work is never completed.
2. account.updated in
   /Users/thomascarney/Projects/powerplunge/server/src/services/stripe-connect-webhook.service.ts:
   the payout-account update persists first; if the conditional audit
   write then fails, the retry computes prevState == newState and never
   audits.

DIRECTOR DECISION (binding): reorder each operation so the write that
serves as its retry-idempotency marker lands LAST:
- refund.updated: Meta enqueue attempt (best-effort, catch stays),
  order-payment-status update, and the audit log run BEFORE the refund
  status update; the storage.updateRefund status/processedAt write goes
  LAST. A failure anywhere before it leaves the status unchanged, so
  the retry redoes the full branch. Accepted consequence (state in a
  test comment): a failure AFTER the audit but BEFORE the final status
  write can produce a duplicate audit entry on retry — acceptable,
  audit logs are append-only records.
- account.updated: compute prevState, write the conditional audit
  FIRST (when payoutsEnabled/detailsSubmitted change), then the payout
  account update LAST. Same accepted duplicate-audit window.
- charge.refunded needs NO reordering (per-refund create-vs-update is
  already the idempotency marker; pinned by the P18 rewritten
  partial-failure case).

TDD gate: red-first. Two named failing tests BEFORE implementation
(paste red output): (a) refund.updated where the order-status update
rejects on the first call and succeeds on the second — after two
operation invocations, the order status update AND audit log have
completed and the refund status is persisted; (b) account.updated where
the audit write rejects first then succeeds — after two invocations the
audit exists and the payout account is updated. Drive both at the
service public interface with per-call seam scripting.

## Preserved decisions

- The whole P18 contract stands: atomic claim, failure -> delete claim
  + 500, propagation (no new swallowing), Meta catches best-effort,
  ack/duplicate/signature semantics untouched.
- Log/audit message TEXT unchanged; only ordering moves. The
  refund.updated no-change fast path (status equal -> no writes, no
  audit) stays.
- FROZEN: server/src/routes/webhooks/stripe.routes.ts and its test
  file (empty-diff gates); storage.ts; schema; no new deps.
- FORBIDDEN test shapes unchanged.
- Crash-stale processing claims: OUT of scope (adjudicated at the
  chunk-4 gate; do not build reconciliation).

## Banked facts

- Branch refactor/complete-the-money-path @ 063f4df + director
  loop-state commits. Baseline VERIFIED: typecheck 0; unit 42 files /
  339 tests green.
- Mini-review verified claim concurrency, ack byte-identity,
  finalization composition, and storage methods as sound; only the two
  holes above block.
- Existing service test counts: stripe-refund-webhook 15,
  stripe-connect-webhook 10.
- Trap 100: one retry on full-suite failure; two failures = STOP.

## Validation commands (binding gates)

- `npm run typecheck` -> exit 0
- `npm run with:local-auth-env -- npm run test:unit` -> exit 0 (trap-100
  one-retry rule)
- Red-first evidence: pasted failing output for both named tests BEFORE
  implementation.
- `git diff-tree --no-commit-id --name-only -r <your-commit>` lists ONLY:
  server/src/services/stripe-refund-webhook.service.ts,
  server/src/services/stripe-connect-webhook.service.ts,
  server/src/services/__tests__/stripe-refund-webhook.service.test.ts,
  server/src/services/__tests__/stripe-connect-webhook.service.test.ts,
  docs/architecture/refactor-programs/complete-the-money-path/HANDOFF.md
  (planning/ worktree dirt is the director's).
- `git diff HEAD~1 -- server/src/routes/webhooks/` -> empty output.
- Each service test file gains >= 1 new `it(` case (the two named
  red-first cases; state before/after counts). Existing cases stay
  green UNMODIFIED except any whose seam-call ORDER assumptions the
  reorder legitimately changes — list every touched case by name with
  the reason; behavior-asserting cases must not weaken.
- HANDOFF.md full State/Next Slice rewrite (remediation done, next =
  slice 2 refund pagination).
- ONE commit. Do NOT push.
- After code-review fixes: re-run the FULL gate set before final JSON.

## Rollback

Revert the single commit; no state outside git.
