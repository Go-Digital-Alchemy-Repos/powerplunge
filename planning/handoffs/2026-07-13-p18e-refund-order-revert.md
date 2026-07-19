# Packet: P18e — partial-progress adjudication: revert refund.updated ordering, keep Connect fix

Lane: implementation

## Current delta

P18d implemented the packet-pinned marker-last ordering and its review
proved the refund.updated half WRONG (director adopted): both
downstream collaborators re-read the persisted refund —
metaConversionsService.enqueueRefundProcessed skips unless the stored
status is already processed, and updateOrderPaymentStatus recomputes
from stored refunds — so running them BEFORE storage.updateRefund reads
stale state (Meta event permanently lost; order status stale with the
retry fast-path never fixing it). DIRECTOR DECISION (binding):

1. In
   /Users/thomascarney/Projects/powerplunge/server/src/services/stripe-refund-webhook.service.ts
   synchronizeStripeRefundStatus: RESTORE the pre-P18d write order —
   storage.updateRefund FIRST, then (if processed) the Meta enqueue
   attempt, then updateOrderPaymentStatus, then createAuditLog, then
   the sync log line. Message text unchanged.
2. The account.updated audit-first reorder in
   stripe-connect-webhook.service.ts from commit 9209cd9 STAYS (review
   verified it sound: no read-dependencies).
3. The refund.updated partial-progress retry hole becomes an ACCEPTED
   LIMITATION: a failure between updateRefund and the later writes
   500s, and the retry takes the status-equal fast path without
   completing order-status/audit. Rewrite the P18d red-first
   refund.updated retry-completion test to characterize THIS accepted
   behavior instead (retry after mid-operation failure does NOT
   complete the remaining writes), with the comment
   `// accepted limitation (chunk-4 gate): partial-progress retry
   cannot complete without transactional storage — see loop-state` on
   the case. The Connect retry-completion test from P18d stays as-is
   (that fix is real).

## Preserved decisions

- Whole P18 contract otherwise untouched: atomic claim, failure ->
  delete claim + 500, propagation, Meta catches best-effort, no-change
  fast path stays, ack/duplicate/signature semantics frozen.
- FROZEN: server/src/routes/webhooks/ (route + tests, empty-diff gate),
  storage.ts, refund.service.ts, Meta integration, schema, no new deps.
- FORBIDDEN test shapes unchanged.
- No reconciliation machinery; crash-stale claims stay out of scope.

## Banked facts

- Branch refactor/complete-the-money-path @ 9209cd9 + director
  loop-state commits. Baseline VERIFIED by director: typecheck 0; unit
  suite green at 9209cd9 (P18d gates re-run passed on Codex side; the
  director re-runs after this packet).
- Current refund.updated order (post-9209cd9, to revert): Meta enqueue
  -> updateOrderPaymentStatus -> createAuditLog -> updateRefund (see
  synchronizeStripeRefundStatus :130-190 region).
- P18d review findings this packet answers: majors at
  stripe-refund-webhook.service.ts:151 and :158; minor on the seam test
  not modeling read dependencies (addressed by the characterization
  rewrite).
- Trap 100: one retry on full-suite failure; two failures = STOP.

## Validation commands (binding gates)

- `npm run typecheck` -> exit 0
- `npm run with:local-auth-env -- npm run test:unit` -> exit 0 (trap-100
  one-retry rule)
- `git diff-tree --no-commit-id --name-only -r <your-commit>` lists ONLY:
  server/src/services/stripe-refund-webhook.service.ts,
  server/src/services/__tests__/stripe-refund-webhook.service.test.ts,
  docs/architecture/refactor-programs/complete-the-money-path/HANDOFF.md
  (planning/ worktree dirt is the director's).
- `git diff HEAD~1 -- server/src/routes/webhooks/ server/src/services/stripe-connect-webhook.service.ts`
  -> empty output (Connect fix and routes untouched).
- The rewritten characterization case carries the accepted-limitation
  comment verbatim; state its final name in the report.
- HANDOFF.md full State/Next Slice rewrite (slice-1 remediation
  adjudicated: Connect hole FIXED, refund.updated hole ACCEPTED for
  chunk-4 gate; next = slice 2 refund pagination).
- ONE commit. Do NOT push.
- After code-review fixes: re-run the FULL gate set before final JSON.

## Rollback

Revert the single commit; no state outside git.
