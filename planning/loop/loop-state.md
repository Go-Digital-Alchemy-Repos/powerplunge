# Loop State (LIVE-ONLY — rewrite each cycle; git history is the archive)

## Program

Complete the Money Path — chunks 1-3 MERGED to main (PR #25 511b0b3,
PR #26 1e6a120, PR #27 7b9e1ea; all Tommy-approved 2026-07-13, CI
green). Program EXTENDED per Tommy ("all your recommendations",
2026-07-13): chunk 4 = webhook hardening (D2 spec + D3 items 1-2, 4),
chunk 5 = reprice extraction; posture E (repository layer) explicitly
DEFERRED.

## In-flight

- None. P19 (refund pagination, chunk-4 slice 2) staged at
  planning/handoffs/2026-07-13-p19-refund-pagination.md, linted;
  fire next after baseline refresh (packet says 42/339 — actual
  post-P18e baseline is 42/341; update Context before firing).

## Chunk-4 progress (HANDOFF is truth)

1. Retry semantics — DONE (P18/P18b/P18c 063f4df, mini-review MEDIUM,
   P18d 9209cd9, P18e adjudication 2878642). Director-verified at
   2878642: typecheck 0, suite 42/341 green, 3-file scope, routes +
   Connect service empty-diff, updateRefund-first order restored,
   accepted-limitation comment present.
2. Refund pagination (has_more) — NEXT (P19 staged).
3. Stripe idempotency keys (refund deterministic key; PI/Session
   creates in checkout.service) — red-first.
4. Unpaid-order notification suppression (notification moves to
   finalization) — red-first.
Then chunk-4 gate (fixed floor + adversarial review HIGH + PR + Tommy
merge), then chunk 5 (reprice), then closeout.

## Chunk-4 gate adjudication queue (accepted/known limitations)

- Crash-stale processing claims: process death after claim insert
  leaves a permanent processing row; later retries blindly 200.
- Cleanup-delete failure after handler failure: stale claim suppresses
  retries (log-only).
- Claim protocol duplicated across the two endpoints (helper-extraction
  candidate).
- refund.updated partial-progress window ACCEPTED (P18e decision):
  failure between updateRefund and later writes 500s, retry takes the
  status-equal fast path without completing order-status/audit; needs
  transactional storage = deferred posture E. Pinned by
  characterization with the accepted-limitation comment.
- No real-DB unique-index contention integration test.

## Verified facts

- Baseline at HEAD 2878642: typecheck 0; unit 42 files / 341 tests
  green (director-executed 2026-07-19).
- P18d lesson (director error, recorded): never pin write ordering
  without checking collaborator read-dependencies — enqueueRefundProcessed
  and updateOrderPaymentStatus RELOAD persisted refund state, so they
  must run AFTER updateRefund. Connect audit-first fix from 9209cd9
  STAYS (no read-deps).
- processed_webhook_events (shared/schema.ts:1084): eventId unique,
  metadata jsonb, NO status column.
- Trap 100 reproduced director-side once; one-retry rule; two
  failures = STOP.

## Decisions

- D1/D2/D3 all RESOLVED. No open decisions. Next Tommy gates: chunk-4
  PR merge, chunk-5 PR merge, program closeout sign-off.

## Next intents

1. Refresh P19 baseline numbers, fire P19 (gpt-5.6-sol medium,
   danger-full-access), verify per its gates.
2. Slices 3-4, then chunk-4 gate (PR-CI freeze law from PR-open).
3. Standing: .env.test.local.template still BLOCKED on Tommy op:// refs
   (CI remains the only E2E gate).

## Standing facts

- Fire command + model policy: CLAUDE.md (repo root).
- Chunk 5 scope: /reprice-payment-intent into checkout.service;
  characterize first.
- CI (pr-checks.yml) runs only on PRs to main.
- Deferred debt in HANDOFF: storage.ts repository carve (posture E).
