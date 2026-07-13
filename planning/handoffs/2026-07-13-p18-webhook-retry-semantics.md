# Packet: P18 — webhook retry semantics: atomic delivery claim + failure propagation

Lane: implementation

## Context (self-contained; verified by director 2026-07-13)

Repo: /Users/thomascarney/Projects/powerplunge, branch
refactor/complete-the-money-path, rebased on main merge 7b9e1ea (chunk 3
merged via PR #27). Baseline VERIFIED by execution: `npm run typecheck`
exit 0; `npm run with:local-auth-env -- npm run test:unit` green (42
files / 335 tests).

This is chunk 4 slice 1 — BEHAVIOR-CHANGING, approved by Tommy
2026-07-13 (resolved decisions D2+D3; Stripe-doc grounding verified by
R3 and director spot-check: non-2xx -> exponential-backoff retries up to
three days live; dedupe by event id; processing/processed claim per
https://docs.stripe.com/webhooks/process-undelivered-events).

CURRENT behavior (director-verified):
/Users/thomascarney/Projects/powerplunge/server/src/routes/webhooks/stripe.routes.ts
— BOTH endpoints (POST /stripe, POST /stripe-connect) mark the delivery
processed via storage.createProcessedWebhookEvent BEFORE dispatch (main
endpoint region below :80; Connect region ~:190 incl. a 23505
unique-violation catch answering duplicate acks), then dispatch through
typed handler maps; refund handler errors are swallowed INSIDE
server/src/services/stripe-refund-webhook.service.ts; Connect/payment
service errors are caught by route-level try/catch that still 200-acks.
Net: a failed handler is never retried by Stripe and the delivery is
already dedupe-marked.

Schema (VERIFIED, shared/schema.ts:1084): processed_webhook_events has
id / eventId (unique) / eventType / source / processedAt / metadata
jsonb. NO status column and NO schema change is allowed — the claim
state lives in `metadata` (e.g. { status: "processing" | "processed" }).

TARGET behavior (the decided contract — all of it binding):

1. Claim BEFORE dispatch: insert the delivery row with
   metadata.status="processing" (the unique eventId is the atomic
   claim; concurrent duplicate hits the unique violation and gets the
   current duplicate ack).
2. Handler SUCCESS: update the row's metadata.status to "processed";
   ack 200 as today.
3. Handler FAILURE (thrown error from the dispatched handler): DELETE
   the claim row, log the error (keep current error log lines where
   they exist), respond HTTP 500 with a minimal JSON body (no error
   internals leaked) so Stripe retries. This applies to BOTH endpoints.
4. Duplicate delivery of a SUCCESSFULLY processed event: unchanged
   current dedupe ack (both the pre-check and 23505 paths).
5. Signature/secret failures, unknown events, and
   payment_intent.succeeded / checkout.session.completed finalization
   semantics: UNCHANGED (finalization already owns its own claim; its
   handler errors now propagate like any other handler's).
6. stripe-refund-webhook.service.ts: REMOVE the internal catch-all
   swallowing in both operations so storage/refund-sync errors
   propagate to the route. Meta enqueue failures STAY swallowed
   (best-effort; the meta_capi_events outbox owns retries) — preserve
   those catches exactly.

TDD gate: behavior-changing. Write the failing tests FIRST, run them,
paste the red output into the report, then implement to green.

Test-net law for this slice: the characterization net stays FROZEN
EXCEPT the cases this packet unpins BY NAME (they pin the old bug and
must be REWRITTEN to the new contract, keeping their public-interface
style):
- server/src/routes/webhooks/__tests__/stripe.routes.test.ts:
  "acknowledges charge.refunded when refund storage fails" (:533; its
  candidate-bug comment at :542 is deleted with the rewrite) and
  "acknowledges Connect handler errors after delivery dedupe" (:730;
  comment at :740).
- server/src/services/__tests__/stripe-refund-webhook.service.test.ts:
  "swallows synchronization seam errors" and "swallows refund status
  synchronization seam errors" (rewrite to assert rejection).
  "swallows a charge refund Meta failure and completes the refund sync"
  and "swallows a refund update Meta failure and completes the status
  sync" stay AS-IS (Meta stays best-effort).
Every other existing case must pass UNMODIFIED.

New route-level red tests (minimum): failed refund handler -> 500 AND
the delivery id is claimable again (a retried identical delivery
dispatches the handler again — assert via seam-call counts across two
deliveries with a failing-then-working seam); failed Connect handler ->
500 + reclaimable; successful delivery marks metadata.status processed
(assert through the storage seam's update call, objectContaining);
concurrent-duplicate (unique-violation) path still acks duplicate.

Read e2e/customer-stripe-webhook-success.spec.ts (:255-:410) BEFORE
implementing: it asserts real signed success + duplicate-delivery
behavior, which this contract preserves; report (do not edit it) any
expectation this slice would break — finding one is a STOP-and-report,
not a fix-the-e2e.

## Goal

Failed webhook handlers become visible to Stripe (non-2xx, delivery
reclaimable => automatic retry) while successful and duplicate
deliveries keep today's semantics, proven by red-first route-level
tests and a green full suite.

## Scope and non-goals

In scope:
- server/src/routes/webhooks/stripe.routes.ts
- server/src/services/stripe-refund-webhook.service.ts
- server/src/routes/webhooks/__tests__/stripe.routes.test.ts (the two
  named rewrites + new cases; everything else additive-only)
- server/src/services/__tests__/stripe-refund-webhook.service.test.ts
  (the two named rewrites; everything else additive-only)
- docs/architecture/refactor-programs/complete-the-money-path/HANDOFF.md
  (full State/Next Slice rewrite: slice 1 done, mini-review next, then
  slice 2 refund pagination)

Non-goals (forbidden):
- ANY schema change (metadata jsonb only). No new npm deps/routes.
- Refund pagination / has_more (slice 2), idempotency keys (slice 3),
  notification suppression (slice 4).
- stripe-connect-webhook.service.ts and
  stripe-payment-webhook.service.ts internals (they already propagate).
- server/src/routes/test/stripe-webhook.routes.ts and the
  handlePaymentIntentSucceededWebhook export: unchanged.
- Retry/backoff logic of our own: Stripe owns retries; we only ack
  honestly.

## Exact implementation steps

1. Baseline green at HEAD; read both endpoints + the storage
   processed-webhook-event methods; enumerate the claim/ack seams in
   the report.
2. Write the red tests named above; run; paste red output.
3. Implement the claim contract on both endpoints (shared helper inside
   the route file is fine); remove the refund service's outer
   swallowing; keep Meta catches.
4. Green: full gate set.
5. HANDOFF.md per Scope.

FORBIDDEN test shapes: unchanged from prior packets (no snapshots, no
call-order asserts, no private-helper asserts, no mocking the module
under test).

## Validation commands (binding gates)

- `npm run typecheck` -> exit 0
- `npm run with:local-auth-env -- npm run test:unit` -> exit 0 (trap-100:
  one retry on full-suite failure; two failures = STOP, commit nothing,
  report exact assertions)
- Red-first evidence: the report contains the pasted failing-test
  output from step 2 (before implementation).
- `git diff-tree --no-commit-id --name-only -r <your-commit>` lists ONLY
  the five in-scope files (planning/ worktree dirt is the director's).
- `git diff HEAD~1 -- server/src/routes/test/stripe-webhook.routes.ts`
  -> empty output.
- Unpinned-case accounting in the report: exactly which existing `it(`
  cases changed (must be a subset of the four named) and how many new
  cases added (>= 4 route-level).
- ONE commit. Do NOT push.
- After code-review fixes: re-run the FULL gate set before final JSON.

## Edge cases / failure modes

- Claim-row DELETE itself failing after a handler failure: still
  respond 500; log the cleanup failure (delivery stays claimed until
  ops intervention — document in report, do not build reconciliation
  here).
- checkout.session.completed / payment_intent.succeeded handlers use
  the finalization claim internally; their thrown errors (if any) now
  500 — that is the intended contract; do not add special cases.
- If the diff exceeds 600 non-test lines, STOP and propose a split.

## Hard rules

- No push, deploy, merge, production mutation, real Stripe charge, or
  real email. Never print secrets. Touch NOTHING outside Scope.

## Rollback

Revert the single commit; no state outside git.
