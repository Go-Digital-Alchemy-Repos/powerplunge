# Loop State (LIVE-ONLY — rewrite each cycle; git history is the archive)

## Program

PowerPlunge refactor program — PLAN BRANCH in progress. No packets fired yet.

## In-flight

- Architecture friction survey complete (2026-07-13, Explore subagent).
  Candidates A-F identified; report presented to Tommy for target pick.
- Awaiting: Tommy picks the target candidate; then chunk/slice split and
  program handoff at docs/architecture/refactor-programs/<slug>/HANDOFF.md.

## Next intents

1. On pick: grill the chosen candidate (interfaces, chunk boundaries),
   write the program handoff, create refactor/<program-slug> branch.
2. Author first slice packet from planning/templates/, adversarial
   pre-fire review at high effort if non-trivial, fire at gpt-5.6-sol
   medium.

## Standing facts

- Fire command + model policy: CLAUDE.md (repo root). Codex auth verified
  2026-07-13 (PONG, gpt default model).
- Survey headline: ROUTES_REFACTOR_PLAN.md is PARTIAL — route relocation
  shipped; checkout.service.ts, webhook-stripe.service.ts, and the
  repository layer were never built; storage.ts grew to 2,067 lines.
- Survey rank #1: extract checkout service (create-payment-intent pricing,
  payments.routes.ts:232-578), prerequisite: move sendOrderNotification
  (payments.routes.ts:1276-1457) out of the route module.
- CI (pr-checks.yml) runs only on PRs to main: typecheck, build, db:push,
  seeds, verifySchema, unit tests, critical E2E.
