# Packet: P19 — refund completeness: paginate charge.refunded beyond the embedded list

Lane: implementation

## Context (self-contained; verified by director 2026-07-13)

Repo: /Users/thomascarney/Projects/powerplunge, branch
refactor/complete-the-money-path. HEAD is slice 1 fully closed: P18
(063f4df) + partial-progress remediation P18d (9209cd9) + adjudication
P18e (2878642) + director loop-state commits; the mid-chunk mini-review
passed and both its blocking findings are adjudicated. Baseline
VERIFIED by execution at 2878642: `npm run typecheck` exit 0; `npm run
with:local-auth-env -- npm run test:unit` green (42 files / 341 tests).
NOTE (binding, from P18e): in synchronizeStripeRefundStatus and
charge.refunded processing, storage.updateRefund runs BEFORE the Meta
enqueue and updateOrderPaymentStatus because those collaborators
re-read persisted refund state. Do NOT reorder writes in this slice.

Chunk 4 slice 2 — BEHAVIOR-CHANGING, approved by Tommy 2026-07-13 (D3
item 1). Stripe embeds at most 10 refunds in
charge.refunds.data and signals more via charge.refunds.has_more.
CURRENT behavior (director-verified):
/Users/thomascarney/Projects/powerplunge/server/src/services/stripe-refund-webhook.service.ts
iterates ONLY the embedded charge.refunds.data (no has_more handling
anywhere in the file — verified by grep) — refunds beyond the embedded
page are silently never synced.
/Users/thomascarney/Projects/powerplunge/server/src/integrations/stripe/StripeService.ts
has NO refunds surface (verified by grep) — this slice NAMES the new
seam: add ONE method to StripeService that lists all refunds for a
charge id (internally paginating with the Stripe SDK's refunds.list +
starting_after or autoPagination, whichever the SDK version supports —
check and report).

TARGET behavior (binding contract):

1. When charge.refunds.has_more is true, the charge.refunded operation
   fetches the COMPLETE refund list for the charge via the new
   StripeService method and processes every refund with the existing
   idempotent create-vs-update logic. When has_more is false/absent,
   behavior is byte-identical to today (no Stripe list call — assert
   this in a test).
2. The refund list fetch happening at all, and any failure of it,
   flows through the P18 error contract: a fetch failure propagates
   (route 500s, claim deleted, Stripe retries). No new swallowing.
3. Per-refund processing order and partial-failure semantics unchanged
   (earlier writes persist, failure propagates — pinned by the P18
   rewritten case).
4. refund.updated unknown-refund warn path: UNCHANGED (decided).

TDD gate: red-first. Named failing test BEFORE implementation: a
charge.refunded event whose refunds list has has_more=true and an
11th refund only available via the list call -> after the webhook, the
11th refund's record exists (created via the storage seam). Paste the
red output into the report.

The stripe-refund-webhook.service deps already inject storage and
loadRefundOperations; add the refund-listing dep the same way (default
= the new StripeService method; lazy import if needed to avoid
module-load side effects — follow the loadRefundOperations precedent).

## Goal

No refund on a charge is ever silently unsynced: pagination-complete
processing proven by a red-first test with an above-embedded-limit
refund, with fetch failures inheriting the P18 retry contract.

## Scope and non-goals

In scope:
- server/src/services/stripe-refund-webhook.service.ts
- server/src/services/__tests__/stripe-refund-webhook.service.test.ts
- server/src/integrations/stripe/StripeService.ts (ONLY the one new
  list-refunds-for-charge method)
- docs/architecture/refactor-programs/complete-the-money-path/HANDOFF.md
  (full State/Next Slice rewrite: slice 2 done, next = slice 3
  idempotency keys)

Non-goals (forbidden):
- server/src/routes/webhooks/stripe.routes.ts and its test file
  (FROZEN this slice; empty-diff gate).
- refund.updated logic, Connect/payment services, storage.ts, schema,
  new npm deps.
- Idempotency keys (slice 3), notification suppression (slice 4).
- No Stripe network calls in tests: stub the listing dep.

## Exact implementation steps

1. Baseline green at HEAD; read the service and StripeService; report
   the SDK pagination idiom available (autoPagingToArray vs manual
   starting_after loop) and which you used.
2. Write the red test (has_more=true, 11th refund via list) + a
   companion: has_more=false makes NO list call (spy count 0). Run;
   paste red output (the companion may be green — say so).
3. Add the StripeService list method; wire the injected dep; implement
   the has_more branch.
4. Add failure-path test: list fetch rejects -> operation rejects
   (propagates; no swallowing).
5. Green: full gate set.
6. HANDOFF.md per Scope.

FORBIDDEN test shapes: unchanged from prior packets (no snapshots, no
call-order asserts, no private-helper asserts, no mocking the module
under test).

## Validation commands (binding gates)

- `npm run typecheck` -> exit 0
- `npm run with:local-auth-env -- npm run test:unit` -> exit 0 (trap-100:
  one retry on full-suite failure; two failures = STOP, commit nothing,
  report exact assertions)
- Red-first evidence: pasted failing output from step 2 BEFORE
  implementation.
- `git diff-tree --no-commit-id --name-only -r <your-commit>` lists ONLY
  the four in-scope files (planning/ worktree dirt is the director's).
- `git diff HEAD~1 -- server/src/routes/webhooks/` -> empty output
  (route file AND its tests untouched).
- Service test file gains >= 3 new `it(` cases (state before/after
  counts).
- StripeService diff contains ONLY the one new method; state its name
  and line range.
- ONE commit. Do NOT push.
- After code-review fixes: re-run the FULL gate set before final JSON.

## Edge cases / failure modes

- Refunds appearing in BOTH the embedded page and the full list must
  not double-process: either dedupe by refund id before iterating or
  process the full list INSTEAD of the embedded one when has_more —
  pick one, state it, test covers no-duplicate-create.
- Stripe list pagination itself failing mid-stream: propagate (P18
  contract), no partial-swallow.
- If the diff exceeds 300 non-test lines, STOP and propose a split.

## Hard rules

- No push, deploy, merge, production mutation, real Stripe charge, or
  real email. Never print secrets. Touch NOTHING outside Scope.

## Rollback

Revert the single commit; no state outside git.
