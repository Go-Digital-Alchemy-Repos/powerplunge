# Loop State (LIVE-ONLY — rewrite each cycle; git history is the archive)

## Program

Complete the Money Path — chunks 1-3 MERGED to main (PR #25 511b0b3,
PR #26 1e6a120, PR #27 7b9e1ea; all Tommy-approved 2026-07-13, CI
green). Program EXTENDED per Tommy ("all your recommendations",
2026-07-13): chunk 4 = webhook hardening (D2 spec + D3 items 1-2, 4),
chunk 5 = reprice extraction; posture E (repository layer) explicitly
DEFERRED. Branch rebased onto 7b9e1ea and pushed.

## In-flight

- P18 webhook retry semantics (chunk-4 slice 1, RISKIEST — mini-review
  after) (planning/handoffs/2026-07-13-p18-webhook-retry-semantics.md)
  FIRED at gpt-5.6-sol medium, danger-full-access. BEHAVIOR-CHANGING,
  red-first. Contract: atomic claim via metadata.status
  processing->processed on processed_webhook_events (NO schema change);
  handler failure -> delete claim + 500 (Stripe retries); refund
  service outer swallowing removed (Meta catches stay); 4 cases
  unpinned BY NAME (2 route candidate-bug + 2 refund-service swallow
  cases); e2e spec read-and-reconcile gate. RUN_DIR: see task b6shc701e
  output.

## Chunk-4 plan (HANDOFF is truth)

1. Retry semantics (P18, in flight) — mini-review at HIGH after.
2. Refund pagination (has_more) + per-refund idempotency — red-first.
3. Stripe idempotency keys (refund create deterministic key; PI/Session
   creates in checkout.service) — red-first.
4. Unpaid-order notification suppression (manual-fallback PENDING
   orders; notification moves to finalization) — red-first.
Then chunk-4 gate (fixed floor + adversarial review HIGH + PR + Tommy
merge), then chunk 5 (reprice extraction, characterize-then-move),
then program closeout.

## Verified facts (chunk-3 gate, 2026-07-13)

- Chunk-3 final: 5 slices + P17 remediation; route 391 -> 238 lines;
  three webhook services; suite 305 -> 335 (42 files); chunk review
  verdict remediated (payment_failed extraction + hasOwnProperty
  dispatch guards :116/:218); PR #27 CI green 3m18s; merged 7b9e1ea.
- Baseline at chunk-4 start: typecheck 0; unit 42/335 green.
- processed_webhook_events schema (shared/schema.ts:1084): eventId
  unique, metadata jsonb, NO status column — claim state lives in
  metadata (decided, no schema change).
- Candidate-bug pins live at stripe.routes.test.ts :533/:542 and
  :730/:740; refund-service swallow cases in its test file. All named
  in P18.
- Trap 100 reproduced director-side once (P14 cycle); one-retry rule.

## Decisions

- D1/D2/D3 all RESOLVED (see decisions-pending.md tombstones + git
  history). No open decisions. Next Tommy gates: chunk-4 PR merge,
  chunk-5 PR merge, program closeout sign-off.

## Next intents

1. On P18 exit: triage; re-run gates (red-first evidence check,
   unpinned-case accounting vs the 4 named, typecheck, full suite w/
   trap-100, commit-scope, e2e reconciliation note); then MID-CHUNK
   MINI-REVIEW at HIGH on P18's diff (riskiest slice rule) before
   slice 2.
2. Slices 2-4 per chunk plan; chunk-4 gate mirrors prior chunks
   (PR-CI freeze law in effect from PR-open).
3. Standing: .env.test.local.template still BLOCKED on Tommy op:// refs
   (CI remains the only E2E gate).

## Standing facts

- Fire command + model policy: CLAUDE.md (repo root).
- Chunk 5 scope: /reprice-payment-intent (payments.routes.ts:457-783
  pre-chunk-3 numbering) into checkout.service; characterize first.
- CI (pr-checks.yml) runs only on PRs to main: typecheck, build,
  db:push, seeds, verifySchema, unit tests, critical E2E.
- Deferred debt recorded in HANDOFF: storage.ts repository carve
  (posture E); refund-list pagination beyond embedded data handled in
  slice 2.
