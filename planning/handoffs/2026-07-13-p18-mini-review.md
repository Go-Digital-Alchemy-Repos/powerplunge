# Packet: P18-MR — mid-chunk adversarial mini-review of the retry-semantics slice

Lane: review

READ-ONLY: no edits, no commits; final JSON report only. Check
/Users/thomascarney/Projects/powerplunge/planning/loop/findings-waived.md
(no active entries) and cite it as checked.

## Context (self-contained; verified by director 2026-07-13)

Repo: /Users/thomascarney/Projects/powerplunge, branch
refactor/complete-the-money-path. Review target: commit 063f4df
("P18c finish webhook retry semantics"), chunk 4's flagged riskiest
slice, BEHAVIOR-CHANGING (approved contract, red-first evidence
verified). Director-VERIFIED: commit touches exactly 6 files
(stripe.routes.ts, stripe-refund-webhook.service.ts, both webhook test
files, server/storage.ts, program HANDOFF.md); typecheck 0; full suite
42 files / 339 tests green (director-executed); storage.ts adds only
updateProcessedWebhookEventMetadata + deleteProcessedWebhookEvent;
route test cases 21 -> 25; exactly five named characterizations were
unpinned and rewritten, the rest byte-frozen.

The DECIDED contract (do not relitigate the decisions, review the
implementation of them): atomic claim insert with
metadata.status="processing" before dispatch on both endpoints (unique
eventId is the claim; concurrent duplicates keep duplicate acks incl.
the 23505 path); success -> metadata.status="processed" + 200; handler
failure -> DELETE claim + minimal 500 so Stripe retries (exponential
backoff, 3 days live); refund service propagates non-Meta errors; Meta
catches stay best-effort; signature/secret/unknown-event semantics
unchanged; NO schema change; NO reconciliation machinery.

Known accepted limitations already on record (do NOT report as new
findings): (a) if the claim DELETE itself fails after a handler
failure, the stale processing row suppresses later retries (log-only;
adjudicated at the chunk-4 gate); (b) the claim protocol is duplicated
across the two endpoints (helper extraction is a chunk-gate candidate).

## Your job (adversarial review of `git show 063f4df`)

1. Claim-protocol correctness under concurrency: two simultaneous
   first deliveries (insert race), duplicate arriving DURING processing
   (row exists, status=processing — what ack? trace it), duplicate
   after failure-delete (must re-dispatch), duplicate after success
   (must dedupe-ack). Cite the exact code paths; flag any window where
   an event can be dispatched twice concurrently or lost besides
   accepted limitation (a).
2. Ack-semantics audit per event type and per endpoint: confirm
   signature/secret failures, unknown events, and successful paths kept
   their exact prior statuses/bodies; confirm failed handlers now 500
   on BOTH endpoints with no internals leaked in the body.
3. Blast-radius: finalization handlers (payment_intent.succeeded,
   checkout.session.completed) now propagate errors — check their
   internal claim/error behavior composes sanely with the new 500 path
   (no double-finalization on retry; the finalization claim is the
   inner idempotency guard).
4. Storage methods: correct Drizzle usage, update-by-eventId semantics
   (metadata replace vs merge — which, and is it consistent with what
   the route writes), delete-by-eventId return handling.
5. Test quality: the five rewritten + four new cases against the
   brittle-seam law; do the new tests drive behavior through two real
   HTTP deliveries rather than poking storage internals; would they
   survive a claim-helper extraction unchanged?
6. Verdict: risk_level low/medium/high; findings with severities;
   blocking-before-slice-2 vs deferrable-to-chunk-gate split.

## Constraints

- READ-ONLY: non-mutating commands only (you MAY run the test suite and
  typecheck). Facts carry file:line or commit citations; VERIFIED vs
  INFERRED distinguished.

## Validation commands (binding gates)

- Read-only compliance: `git -C /Users/thomascarney/Projects/powerplunge
  status --porcelain` shows no changes attributable to you.
- Zero commits: you created none (director loop-state commits may land
  concurrently).
- Report completeness: all 6 jobs answered with citations; explicit
  verdict and blocking-vs-deferrable split.

## Final report

JSON per the standard schema; verdict + findings compactly in summary;
blocking items (if any) in next_step_suggestion.
code_review.performed=false, reason review-lane.
