# Packet: P18b — retry semantics resume: storage boundary granted

Lane: implementation

## Current delta

P18 blocked honestly (0 files touched): the claim contract needs
update/delete operations for processed webhook events, and
/Users/thomascarney/Projects/powerplunge/server/storage.ts exposes only
getProcessedWebhookEvent (:296/:1493) and createProcessedWebhookEvent
(:297/:1498) — director verified. GRANT: server/storage.ts is now the
SIXTH in-scope file, LIMITED to adding exactly two narrowly-scoped
methods to the IStorage interface and DatabaseStorage implementation:
one that updates a processed webhook event's metadata by eventId, and
one that deletes a processed webhook event by eventId. No other
storage.ts changes. Implement the FULL original P18 contract now.

## Preserved decisions

- Full P18 contract binds verbatim (chunk-4 slice 1, BEHAVIOR-CHANGING,
  red-first with pasted red output BEFORE implementation): atomic claim
  insert with metadata.status="processing" before dispatch on BOTH
  endpoints (unique eventId = the claim; concurrent duplicate keeps the
  current duplicate ack incl. the 23505 path); handler success ->
  metadata.status="processed" + 200 as today; handler failure -> DELETE
  claim row, keep existing error logs, respond 500 with minimal JSON
  (no internals), so Stripe retries; duplicates of successfully
  processed events unchanged; signature/secret/unknown-event semantics
  unchanged; finalization handlers get no special casing.
- stripe-refund-webhook.service.ts: remove BOTH operations' outer
  error swallowing (errors propagate); Meta enqueue catches stay
  exactly as-is (best-effort; meta_capi_events outbox owns retries).
- NO schema change (claim state in the existing metadata jsonb). No new
  npm deps/routes. No touching stripe-connect-webhook.service.ts or
  stripe-payment-webhook.service.ts internals, nor
  server/src/routes/test/stripe-webhook.routes.ts, nor the
  handlePaymentIntentSucceededWebhook export.
- Test-net law: all existing cases FROZEN except these four, unpinned
  BY NAME and rewritten to the new contract:
  stripe.routes.test.ts "acknowledges charge.refunded when refund
  storage fails" (+ its candidate-bug comment) and "acknowledges
  Connect handler errors after delivery dedupe" (+ comment);
  stripe-refund-webhook.service.test.ts "swallows synchronization seam
  errors" and "swallows refund status synchronization seam errors"
  (rewrite to assert rejection). New route-level red tests (>= 4):
  failed refund handler -> 500 + delivery reclaimable (second delivery
  with a then-working seam dispatches again, seam-call counts); failed
  Connect handler -> 500 + reclaimable; success marks
  metadata.status="processed" via the new storage update seam
  (objectContaining); concurrent-duplicate 23505 path still acks
  duplicate.
- Read e2e/customer-stripe-webhook-success.spec.ts :255-:410 before
  implementing; report (never edit) any expectation this contract would
  break; finding one = STOP and report.
- FORBIDDEN test shapes unchanged (no snapshots, call-order asserts,
  private-helper asserts, or mocking the module under test).
- Claim-cleanup failure after a handler failure: still 500, log the
  cleanup failure, no reconciliation machinery.

## Banked facts

- Repo /Users/thomascarney/Projects/powerplunge, branch
  refactor/complete-the-money-path @ 66adbb7 (loop-state commits are
  the director's). Baseline VERIFIED: typecheck 0; unit 42 files / 335
  tests green.
- processed_webhook_events (shared/schema.ts:1084): eventId unique,
  metadata jsonb, processedAt defaultNow; insert schema omits
  id/processedAt.
- Both endpoints already claim BEFORE dispatch via
  createProcessedWebhookEvent; Connect endpoint has the 23505
  unique-violation duplicate ack; dispatch maps use hasOwnProperty
  guards (stripe.routes.ts :116/:218).
- Candidate-bug pins at stripe.routes.test.ts :533/:542 and :730/:740.
- Trap 100: suite flake reproduced on both machines; one retry allowed.

## Validation commands (binding gates)

- `npm run typecheck` -> exit 0
- `npm run with:local-auth-env -- npm run test:unit` -> exit 0 (trap-100:
  one retry on full-suite failure; two failures = STOP, commit nothing,
  report exact assertions)
- Red-first evidence: pasted failing-test output in the report from
  BEFORE implementation.
- `git diff-tree --no-commit-id --name-only -r <your-commit>` lists ONLY
  the six in-scope files: server/src/routes/webhooks/stripe.routes.ts,
  server/src/services/stripe-refund-webhook.service.ts,
  server/src/routes/webhooks/__tests__/stripe.routes.test.ts,
  server/src/services/__tests__/stripe-refund-webhook.service.test.ts,
  server/storage.ts,
  docs/architecture/refactor-programs/complete-the-money-path/HANDOFF.md
  (planning/ worktree dirt is the director's).
- storage.ts diff contains ONLY the two new methods (interface +
  implementation): state the added method names and line ranges in the
  report.
- `git diff HEAD~1 -- server/src/routes/test/stripe-webhook.routes.ts`
  -> empty output.
- Unpinned-case accounting: exactly which existing `it(` cases changed
  (subset of the four named) and how many new cases added (>= 4
  route-level).
- HANDOFF.md full State/Next Slice rewrite (slice 1 done, mini-review
  next, then slice 2 refund pagination).
- ONE commit. Do NOT push.
- After code-review fixes: re-run the FULL gate set before final JSON.

## Rollback

Revert the single commit; no state outside git.
