# Packet: R2 — chunk 3 research: map the Stripe webhook surface

Lane: research

READ-ONLY: no edits, no commits; final JSON report only. Check
/Users/thomascarney/Projects/powerplunge/planning/loop/findings-waived.md
(no active entries) and cite it as checked.

## Context (self-contained; verified by director 2026-07-13)

Repo: /Users/thomascarney/Projects/powerplunge, branch
refactor/complete-the-money-path (chunks 1-2 merged to main via PR #25 and
PR #26; branch rebased onto main's merge commit 1e6a120). Program handoff:
/Users/thomascarney/Projects/powerplunge/docs/architecture/refactor-programs/complete-the-money-path/HANDOFF.md

Chunk 3 goal (approved program): extract refund-sync + Connect handling
from /Users/thomascarney/Projects/powerplunge/server/src/routes/webhooks/stripe.routes.ts
(391 lines; single POST /stripe handler at :18; charge.refunded handling
around :87-150 with dynamic import of refund.service; more event types
below) into a webhook service so the route becomes pure dispatch:
signature verification + event routing, with per-event logic living in
services tested at their public interfaces. Chunks 1-2 already gave it
order-finalization and order-notification defaults; checkout.service now
owns creation flows.

## Your job (research only — facts and a slice proposal)

1. MAP the POST /stripe handler end to end: signature verification, every
   event type handled (payment_intent.*, checkout.session.*,
   charge.refunded, Connect/account events, anything else), what each
   branch does (storage writes, service calls, dynamic imports, Meta
   enqueues, logging), response/ack semantics (when does it 200 vs 4xx/5xx,
   retry implications), error swallowing per branch. Cite file:line.
2. MAP the Connect webhook path if separate (rg for connect webhook
   registration, STRIPE_CONNECT_WEBHOOK_SECRET consumers) — same detail.
3. INVENTORY existing coverage: stripe.routes.test.ts cases (which events,
   which seams), refund.service coverage, relevant e2e specs. What webhook
   behavior is uncovered (especially refund create-vs-update branches,
   idempotency/duplicate-event handling, unknown-event fallthrough).
4. LIST couplings resisting extraction: dynamic imports, module state,
   raw-body/signature needs, env access, transaction boundaries,
   finalization-claim interactions (CONTEXT.md: markOrderPaidIfPending owns
   the Finalization claim).
5. PROPOSE a slice decomposition (3-5 slices, each packet-sized,
   behavior-preserving unless a red test is named first): ordering,
   per-slice files, characterization strategy per slice, riskiest slice
   flagged (it gets a mid-chunk mini-review per CLAUDE.md loop hygiene).
   State whether refund-sync and Connect handling become one service or
   two, and what stays in the route (dispatch table? signature check?).

## Constraints

- READ-ONLY: non-mutating commands only. Facts carry file:line citations;
  VERIFIED vs INFERRED distinguished. No advice without a cited fact.

## Validation commands (binding gates)

- Read-only compliance: `git -C /Users/thomascarney/Projects/powerplunge
  status --porcelain` shows no changes attributable to you.
- Zero commits: you created none (director loop-state commits may land
  concurrently).
- Report completeness: all five jobs answered with citations; slice
  proposal names files and gates per slice.

## Final report

JSON per the standard schema; survey in summary compactly; slice proposal
in next_step_suggestion. code_review.performed=false, reason
research-lane.
