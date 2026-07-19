# Loop State (LIVE-ONLY — rewrite each cycle; git history is the archive)

## Program

Complete the Money Path — chunks 1-3 MERGED to main (PR #25 511b0b3,
PR #26 1e6a120, PR #27 7b9e1ea; all Tommy-approved 2026-07-13, CI
green). Program EXTENDED per Tommy ("all your recommendations",
2026-07-13): chunk 4 = webhook hardening (D2 spec + D3 items 1-2, 4),
chunk 5 = reprice extraction; posture E (repository layer) explicitly
DEFERRED.

## In-flight

- None. Next: author P21 (slice 4, unpaid-order notification
  suppression).

## Chunk-4 progress (HANDOFF is truth)

1. Retry semantics — DONE (P18/P18b/P18c 063f4df, mini-review MEDIUM,
   P18d 9209cd9, P18e adjudication 2878642). Director-verified at
   2878642: typecheck 0, suite 42/341 green, 3-file scope, routes +
   Connect service empty-diff, updateRefund-first order restored,
   accepted-limitation comment present.
2. Refund pagination — DONE (P19 178b52f, director-verified: 4-file
   scope, routes empty-diff, StripeService +listRefundsForCharge only,
   replace-not-merge dedupe, typecheck 0, suite 42/344 green).
3. Idempotency keys — DONE (P20 honest block -> P20b ab6d4bd,
   director-verified: 8-file scope incl. route adapters, frozen
   empty-diff, deterministic keys refund/count pi_create
   checkout_session, typecheck 0, suite 42/348 green).
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

- Baseline at HEAD ab6d4bd: typecheck 0; unit 42 files / 348 tests
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

1. Author + fire P21 (slice 4); on exit triage, re-run gates.
2. Slice 4, then chunk-4 gate (PR-CI freeze law from PR-open).
3. Standing: .env.test.local.template still BLOCKED on Tommy op:// refs
   (CI remains the only E2E gate).

## Standing facts

- Fire command + model policy: CLAUDE.md (repo root).
- Chunk 5 scope: /reprice-payment-intent into checkout.service;
  characterize first.
- CI (pr-checks.yml) runs only on PRs to main.
- Deferred debt in HANDOFF: storage.ts repository carve (posture E).
