# Packet: P6b — RESUME: land the quote-nucleus slice (P6)

Lane: implementation

## Current delta

P6 (quote-nucleus extraction) finished implementation but ended BLOCKED
without committing: your final full-suite runs failed nondeterministically
(cross-route HTTP status flips varying per retry) while focused tests were
green. The DIRECTOR has since executed the full binding gate set on your
uncommitted diff TWICE: `npm run with:local-auth-env -- npm run test:unit`
green both times (39 files / 263 tests) and `npm run typecheck` exit 0.
The diff is sound; the flake was environmental (recorded as trap 100 in
/Users/thomascarney/Projects/powerplunge/planning/codex-traps.md). Your
job now: assess the partial work as it stands, finish anything incomplete,
and land ONE clean commit.

## Preserved decisions

- All P6 packet rules stand
  (/Users/thomascarney/Projects/powerplunge/planning/handoffs/2026-07-13-p6-quote-nucleus.md):
  characterization test files UNTOUCHED, no behavior change, boundary =
  quote logic only, house factory idiom, no req/res in the service.
- One commit per packet; do NOT push.

## Banked facts

- Uncommitted work present in the tree (VERIFIED by director):
  modified server/src/routes/public/payments.routes.ts and
  docs/architecture/refactor-programs/complete-the-money-path/HANDOFF.md;
  untracked server/src/services/checkout.service.ts and
  server/src/services/__tests__/checkout.service.test.ts.
- Director-executed gates on this exact tree: full unit suite green twice
  (39/263), typecheck 0.
- HEAD is 0ae1cf7 (director loop-state commit); planning/codex-traps.md
  has a staged director edit — do NOT include planning/ files in your
  commit.

## Goal

The P6 slice is committed: one commit containing exactly the four files
above (two server/src files, one test file, HANDOFF.md), all P6 binding
gates green on your final run, working tree clean of YOUR files afterward.

## Exact steps

1. Review the uncommitted diff (`git diff` + the two untracked files)
   against the P6 packet's Scope; confirm nothing outside it changed and
   the characterization test files are untouched
   (`git diff --name-only` must not list either payments test file).
2. Run the P6 gate set ONCE: `npm run typecheck`;
   `npm run with:local-auth-env -- npm run test:unit`. If the full suite
   fails, run it a second time before concluding; report both outcomes.
   If it fails twice, STOP: commit nothing, report the exact failing
   assertions.
3. On green: `git add` ONLY the four P6 files and commit as
   "refactor(P6): extract checkout quote service". Do NOT add anything
   under planning/.
4. Report the final validation results and the commit hash.

## Validation commands (binding gates)

- `npm run typecheck` -> exit 0
- `npm run with:local-auth-env -- npm run test:unit` -> exit 0 (with the
  retry rule above)
- `git -C /Users/thomascarney/Projects/powerplunge diff HEAD~1 --name-only`
  after your commit lists EXACTLY: the two server/src files, the new
  service test, and the program HANDOFF.md — and does NOT list
  server/src/routes/public/__tests__/create-payment-intent.routes.test.ts,
  server/src/routes/public/__tests__/payments.routes.test.ts, or anything
  under planning/.
- ONE commit. Do NOT push.

## Hard rules

- No push, deploy, merge, production mutation, real Stripe charge, or
  real email. Never print secrets. Touch NOTHING outside the four P6
  files.

## Rollback

Revert the single commit; no state outside git.
