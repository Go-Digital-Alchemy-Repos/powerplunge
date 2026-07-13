# Loop State (LIVE-ONLY — rewrite each cycle; git history is the archive)

## Program

Complete the Money Path — Chunk 1 (small unlocks). P1 VERIFIED (d0c7528),
P2 VERIFIED (860ee7e). P3 (final chunk-1 slice) in flight.

## In-flight

- CHUNK 1 PR OPEN: https://github.com/Go-Digital-Alchemy-Repos/powerplunge/pull/25
  (refactor/complete-the-money-path -> main, pushed 2026-07-13 10:4x).
  CI GREEN 2026-07-13 (Typecheck, Build, Unit, Auth E2E pass).
  MERGE IS USER-GATED: waiting on Tommy.
- P4 VERIFIED (c371ed9): typecheck 0; unit 37/237 green; webhook seam
  test importActuals the real factory and fails-first on a broken
  default; email audit scans order-notification.service; commit scoped to
  4 files, no production code.
- Chunk-1 adversarial review DONE (HIGH, read-only): NO behavior defects;
  3 findings fixed in P4, 1 waived (W1, expires chunk-2 gate).
- P3 VERIFIED: typecheck 0; unit 37/236 green; zero order-claim /
  claimOrdersByEmail matches in server/src; CONTEXT.md Account linking
  entry present; git rename recorded; extra ref found+fixed in
  docs/ECOMMERCE_SYSTEM_PROMPT.md; ONE commit eadfffb.
- Chunk gate fixed floor DONE: typecheck 0, unit green, git diff --check
  clean over d366cef..HEAD. Local E2E SKIPPED: no
  .env.test.local.template on this machine; CI critical E2E on the PR is
  the binding gate for that surface.

## Verified facts (P2 cycle, 2026-07-13)

- P2 gates re-run by director: typecheck 0; unit 37 files / 236 tests
  green (10 new confirm-payment characterization tests, all asserting
  status+message+no-side-effects at the HTTP interface — quality PASS);
  admin orders.routes.ts has zero payments.routes refs; re-export gone;
  ONE commit 860ee7e. No divergence.
- Chunk-review note: confirm-payment now carries two narrow compatibility
  pre-guards (checkout_session amount/currency, uppercase-USD precedence)
  that pin possibly-accidental legacy behavior. Simplification candidate
  for chunk 2 (checkout service extraction); raise at chunk-1 adversarial
  review.

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

1. On P4 exit: triage verify-codex-report.mjs; re-run gates myself
   (typecheck, unit suite, zero public/payments.routes matches in
   stripe.routes.test.ts, email-audit lists order-notification.service);
   verify NO production-code files in the commit; confirm the
   default-notification-seam test would actually fail on a broken default
   (read the test, judge the seam); ONE commit.
2. If clean: push refactor/complete-the-money-path, open chunk-1 PR to
   main via gh-axi (CI pr-checks.yml is BINDING), notify Tommy at the
   gate. Merge stays user-gated.
3. After PR green + Tommy merge decision: draft chunk-2 program grilling
   (checkout service extraction; includes W1 waiver expiry + shim
   simplification).

## Standing facts

- Fire command + model policy: CLAUDE.md (repo root).
- Survey headline: ROUTES_REFACTOR_PLAN.md is PARTIAL — checkout.service,
  webhook-stripe.service, repo layer never built; storage.ts 2,067 lines.
- Chunk 2 target: extract checkout service (create-payment-intent pricing,
  payments.routes.ts:232-578). Chunk 3: webhook service (stripe.routes.ts).
- CI (pr-checks.yml) runs only on PRs to main: typecheck, build, db:push,
  seeds, verifySchema, unit tests, critical E2E.
