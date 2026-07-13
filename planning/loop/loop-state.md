# Loop State (LIVE-ONLY — rewrite each cycle; git history is the archive)

## Program

Complete the Money Path — Chunk 1 (small unlocks). P1 VERIFIED and landed
(d0c7528). P2 next.

## In-flight

- Packet P2 (planning/handoffs/2026-07-13-p2-paid-state-guard-dedupe.md)
  firing at gpt-5.6-sol medium. Branch refactor/complete-the-money-path
  @ d0c7528 + loop-state commit.

## Verified facts (P1 cycle, 2026-07-13)

- P1 gates re-run by director: typecheck exit 0; unit suite 37 files /
  226 tests pass; stripe.routes.ts has zero payments.routes imports;
  ONE Codex commit d0c7528. Report consistent, no divergence.
- New test order-notification.service.test.ts reviewed: stubs at external
  seams only, observable-behavior asserts. PASS against brittle-seam rule.
- Leftover folded into P2: admin orders.routes.ts:220 imports
  sendOrderNotification via payments.routes compat re-export (:11,:15).
- P2 seam facts: confirm-payment guards at payments.routes.ts —
  :930 missing params, :935 stripe unconfigured, :940 PI not succeeded,
  :944 metadata.orderId vs body orderId (REQUEST validation, service never
  sees body orderId — STAYS at route); duplicates to dedupe: :952-954
  order not found (404), :957 amount mismatch (400), :965 currency (400).
  Service equivalents: order-finalization.service.ts :75-99 skipped
  reasons order_not_found / amount_mismatch / currency_mismatch (+
  missing_order_id, checkout_session_payment_intent). Skipped results
  carry `order` except order_not_found/missing_order_id.
- Coverage gap: only ONE confirm-payment route test exists (Meta repair
  path, payments.routes.test.ts:106). Guard HTTP responses are
  uncharacterized — P2 characterizes them FIRST, then dedupes.

## Next intents

1. On P2 exit: triage verify-codex-report.mjs; re-run gates myself
   (typecheck, unit suite, zero payments.routes import in admin
   orders.routes.ts, no sendOrderNotification re-export); review new
   characterization tests against brittle-seam rule; confirm ONE commit.
2. If clean: journal, commit loop state, author P3 (rename
   order-claim.service to account-linking vocabulary + CONTEXT.md note),
   fire at medium.
3. Chunk 1 gate after P3: fixed floor (typecheck, unit, git diff --check)
   + risk-picked checks from docs/09-TESTING/SCRIPTS.md + adversarial
   chunk review packet at HIGH effort (read-only lane) + push branch +
   open PR (CI binding) + notify Tommy.

## Standing facts

- Fire command + model policy: CLAUDE.md (repo root).
- Survey headline: ROUTES_REFACTOR_PLAN.md is PARTIAL — checkout.service,
  webhook-stripe.service, repo layer never built; storage.ts 2,067 lines.
- Chunk 2 target: extract checkout service (create-payment-intent pricing,
  payments.routes.ts:232-578). Chunk 3: webhook service (stripe.routes.ts).
- CI (pr-checks.yml) runs only on PRs to main: typecheck, build, db:push,
  seeds, verifySchema, unit tests, critical E2E.
