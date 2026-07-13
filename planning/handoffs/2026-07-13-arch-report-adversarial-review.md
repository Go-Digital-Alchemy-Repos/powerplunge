# Packet: Adversarial review — architecture review report + its recommended fixes

Lane: review

READ-ONLY: no edits, no commits; final JSON report only. Before reporting
a finding, check
/Users/thomascarney/Projects/powerplunge/planning/loop/findings-waived.md
(cite the file as checked).

## Context (self-contained; verified by director 2026-07-13)

Repo: /Users/thomascarney/Projects/powerplunge, branch
refactor/complete-the-money-path.

The artifact under review is the architecture review report:
`.lavish/architecture-review-2026-07-13.html` (read it directly; it is
HTML, strip tags mentally). It surveyed the repo, named six deepening
candidates A-F, and recommended a program "Complete the Money Path"
(chunk 1 = A+C+D, chunk 2 = B, chunk 3 = F, E deliberately deferred).

Supporting docs: `docs/architecture/refactor-programs/complete-the-money-path/HANDOFF.md`
(program state), `CONTEXT.md`, `docs/adr/` (esp. ADR-0001),
`docs/architecture/ROUTES_REFACTOR_PLAN.md` (the older plan the report
graded as PARTIAL).

Implementation state at review time (director-verified):

- Chunks 1 and 2 MERGED to main (PR #25 511b0b3, PR #26 1e6a120, CI
  green). A -> order-notification.service; C -> confirm-payment gate
  dedupe into order-finalization.service; D -> claim vocabulary split;
  B -> checkout.service.ts (quote / createPaymentIntentCheckout /
  createCheckoutSession).
- Chunk 3 (F) in progress on this branch: P12 webhook characterization
  (e5baec6), P13 charge.refunded -> stripe-refund-webhook.service
  (commit in `git log --oneline`), P14 refund.updated into same service
  (bd15b59). Remaining: Connect account/capability extraction (P15,
  staged) + dispatch cleanup, then a behavior-changing slice implementing
  the D2 retry spec (non-2xx on handler failure, atomic
  processing->processed claim, stop swallowing handler errors).
- Pre-program baseline for before/after comparison: main-merge history;
  the report's line refs were taken at commit 511b0b3's parent era
  (route file then 1,471 lines).

Ignore everything under /Users/thomascarney/Projects/powerplunge/planning/
except the files this packet names; loop bookkeeping is out of review
scope.

## Your job: try to break the REPORT, not the diffs

This is not a code review of the landed slices (those had their own
adversarial reviews). Attack the report's analysis and its
recommendations as an architecture reviewer would:

1. FACT-CHECK the report's load-bearing claims against git history.
   Examples to verify by execution, not by trusting the report: the
   route->service->route back-reference in A (did
   webhooks/stripe.routes.ts really import from payments.routes.ts?);
   B's claim that "payments.routes.test.ts never touches this path /
   zero tests reach create-payment-intent" pre-program; C's claim the
   route guards duplicated order-finalization.service checks exactly;
   D's claim order-claim.service was account-linking with 5 call sites;
   E's 2,067 lines / ~120 methods; F's line ranges. Use
   `git show <pre-program-sha>:<file>` against main history (e.g.
   `git log main --oneline` to find the pre-511b0b3 state).
2. WRONG-FIX ANALYSIS: for each candidate A-D (landed), does the landed
   fix actually deliver the report's claimed benefit? E.g. A promised
   the obligation becomes unit-testable without importing the route and
   the back-reference severed — is that true now on main? C promised one
   authoritative gate — did any route-side guard survive that can still
   diverge? B promised both flows behind one deep interface — is there
   residual pricing/discount logic still inline in routes?
3. MISSED CANDIDATES: what should the report have flagged on the money
   path but didn't? Look specifically at: webhook error handling /
   dedupe semantics (the report never mentioned the 200-ack-on-swallowed
   -error trap that later became decision D2 — what else of that class
   is hiding?), refund pagination (charge.refunds.data >10), Stripe
   idempotency keys on writes, the /checkout vs create-payment-intent
   duplication depth, storage.ts hot spots the chunks touched but left
   shallow. Name at most 5, each with file:line evidence and a deletion
   -test argument.
4. PROGRAM-SHAPE CRITIQUE: was the chunk ordering right (A+C+D before
   B before F)? Is the E posture ("carve repositories only en route")
   holding — did chunks 1-3 actually carve any repository, and if not,
   is the posture empty? Is anything in the remaining chunk-3 plan
   (Connect extraction, dispatch cleanup, D2 retry slice) misordered or
   wrongly scoped given what has already landed?
5. REPORT QUALITY: internal contradictions, benefits stated without a
   falsifiable claim, vocabulary drift from CONTEXT.md, any place the
   report's "deletion test" reasoning is misapplied.

## Constraints

- READ-ONLY. Non-mutating commands only (git show/diff/log, rg, cat,
  wc, npm run typecheck allowed). No edits, no commits, no installs, no
  network.
- Findings concrete: file:line (or report-section + repo evidence),
  failing scenario or wrong claim, why it matters. Rank by severity.
  Explicitly clear each of the five priorities if nothing found.
- Distinguish clearly: (a) report was wrong, (b) report was right but
  the fix drifted, (c) report was right and fix landed faithfully but
  a better option existed.

## Validation commands (binding gates)

- Read-only compliance: `git -C /Users/thomascarney/Projects/powerplunge
  status --porcelain` shows no new changes attributable to you at the
  end (pre-existing untracked planning/ files are not yours).
- Zero commits: HEAD unchanged from the commit you started at.
- Report completeness: all five priorities covered by findings or
  explicitly cleared.

## Final report

JSON per the standard schema. Findings in code_review.findings with
severity major/minor; each tagged with priority number 1-5 and the
(a)/(b)/(c) classification from Constraints. decision_needed only for
genuine director-level calls (e.g. a missed candidate big enough to
change the program's remaining scope). next_step_suggestion: what the
director should fold into the remaining chunk-3 packets or the program
closeout.
