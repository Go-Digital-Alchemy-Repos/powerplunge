# Loop State (LIVE-ONLY — rewrite each cycle; git history is the archive)

## Program

Complete the Money Path — Chunk 1 DONE and MERGED to main
(PR #25, merge 511b0b3, Tommy approved 2026-07-13; CI was green).
Chunk 2 (checkout service extraction) now open, research phase.

## In-flight

- Packet R1 chunk-2 checkout survey
  (planning/handoffs/2026-07-13-r1-chunk2-checkout-survey.md)
  FIRED 2026-07-13 11:34 at gpt-5.6-sol medium, READ-ONLY research lane.
  RUN_DIR=/var/folders/kg/vqcvwwlx3xs4wblm4wpvpkz00000gn/T//codex-handoff/20260713-113458-2026-07-13-r1-chunk2-checkout-survey
  Maps create-payment-intent (payments.routes.ts:232-~578), overlap with
  POST /checkout, test coverage, hidden couplings; proposes 3-6 slices
  including where W1 shim simplification lands.
- Branch refactor/complete-the-money-path fast-forwarded to 511b0b3
  (= main) and continues as the program branch for chunk 2.

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

1. On R1 exit: verify read-only compliance (HEAD still 511b0b3, clean
   tree); grill the survey — check its citations by targeted execution
   before trusting the slice plan; then write the chunk-2 slice list into
   the program HANDOFF.md (director edit) and author the first
   implementation packet.
2. Chunk-2 slices must include: deep checkout service behind a small
   interface; decision on /checkout sharing it; W1 waiver expiry (shim
   simplification + re-grounded characterizations at the chunk-2 gate).
3. Chunk-2 gate mirrors chunk 1: fixed floor + adversarial review at HIGH
   + PR (CI binding) + Tommy merge decision.

## Standing facts

- Fire command + model policy: CLAUDE.md (repo root).
- Survey headline: ROUTES_REFACTOR_PLAN.md is PARTIAL — checkout.service,
  webhook-stripe.service, repo layer never built; storage.ts 2,067 lines.
- Chunk 2 target: extract checkout service (create-payment-intent pricing,
  payments.routes.ts:232-578). Chunk 3: webhook service (stripe.routes.ts).
- CI (pr-checks.yml) runs only on PRs to main: typecheck, build, db:push,
  seeds, verifySchema, unit tests, critical E2E.
