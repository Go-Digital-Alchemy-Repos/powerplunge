# Packet: R3 — verify D2 webhook-retry recommendation against Stripe's current docs

Lane: research

READ-ONLY on the repo: no edits, no commits; final JSON report only.
Network/web access IS in scope: this packet's whole job is reading
Stripe's official documentation. Check
/Users/thomascarney/Projects/powerplunge/planning/loop/findings-waived.md
(no active entries) and cite it as checked.

## Context (self-contained; verified by director 2026-07-13)

Repo: /Users/thomascarney/Projects/powerplunge, branch
refactor/complete-the-money-path. The Stripe webhook handler at
/Users/thomascarney/Projects/powerplunge/server/src/routes/webhooks/stripe.routes.ts
currently: (a) marks a delivery id as processed (dedupe) BEFORE
dispatching the event to its handler, and (b) swallows handler errors
into 200 acknowledgements. Combined effect (VERIFIED by P12
characterization tests): a delivery whose handler crashes is still
acked 200 AND is dedupe-marked, so Stripe never retries it and a
redelivery would be skipped. Order volume is currently zero; this is a
queued production-reliability decision (D2 in
/Users/thomascarney/Projects/powerplunge/planning/loop/decisions-pending.md),
not a live incident.

Director's recommendation under review (approved by the user pending
this verification): move the dedupe-mark to AFTER successful dispatch,
as a behavior-changing slice after chunk 3 lands, so failed handlers
lead to non-2xx (or at least unmarked) deliveries that Stripe retries,
while duplicate deliveries of successfully processed events remain
skipped.

## Your job (research only — facts with citations)

1. Read Stripe's CURRENT official documentation on webhook delivery and
   best practices (docs.stripe.com — webhook endpoints, event delivery
   behavior, retries, duplicate events, asynchronous processing
   guidance). For each claim below, mark CONFIRMED / OUTDATED / NUANCED
   with the doc URL and the relevant wording:
   a. Stripe retries a delivery when the endpoint returns non-2xx (and
      on timeout); state the current documented retry schedule and
      total retry window for live mode.
   b. Stripe may send the same event more than once even after a 2xx,
      so endpoints must handle duplicates idempotently (dedupe by
      event id is a documented recommendation).
   c. Recommended pattern for failure handling: return non-2xx when
      processing fails so Stripe retries, OR ack fast and process
      async with your own retry mechanism; state what Stripe currently
      recommends about quick acknowledgement vs inline processing.
2. Evaluate the director's recommendation against what you read:
   dedupe-mark AFTER successful dispatch + non-2xx on handler failure.
   Does current Stripe guidance support it, or does Stripe now
   recommend a different shape (e.g. always-2xx + queue/async
   processing with own retries)? If the docs favor a different
   pattern, describe the minimal version appropriate for this app's
   scale (single server, low volume, no queue infrastructure).
3. Note any doc guidance on partial failures within one event (the
   charge.refunded branch iterates multiple refunds) and on retry
   safety (handlers must be idempotent because retries re-deliver).

## Constraints

- Repo READ-ONLY: non-mutating commands only; you may read repo files
  for context but change nothing.
- Cite every factual claim with a URL (Stripe docs) or file:line
  (repo). Distinguish VERIFIED (read this session) vs INFERRED.
- No advice without a cited fact.

## Validation commands (binding gates)

- Read-only compliance: `git -C /Users/thomascarney/Projects/powerplunge
  status --porcelain` shows no changes attributable to you.
- Zero commits: you created none (director loop-state commits may land
  concurrently).
- Report completeness: claims 1a-1c each marked
  CONFIRMED/OUTDATED/NUANCED with URLs; job 2 gives a clear verdict on
  the recommendation (SUPPORTED / SUPPORTED-WITH-CHANGES / NOT
  SUPPORTED) with the changes named.

## Final report

JSON per the standard schema; verdict and citations compactly in
summary; any recommended reshaping of D2 in next_step_suggestion.
code_review.performed=false, reason research-lane.
