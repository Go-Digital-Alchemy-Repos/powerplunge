# Loop State (LIVE-ONLY — rewrite each cycle; git history is the archive)

## Program

Complete the Money Path — Chunk 1 DONE and MERGED to main
(PR #25, merge 511b0b3, Tommy approved 2026-07-13; CI was green).
Chunk 2 (checkout service extraction) now open, research phase.

## In-flight

- Packet P5 create-payment-intent characterization baseline
  (planning/handoffs/2026-07-13-p5-create-intent-characterization.md)
  FIRED 2026-07-13 11:41 at gpt-5.6-sol medium.
  RUN_DIR=/var/folders/kg/vqcvwwlx3xs4wblm4wpvpkz00000gn/T//codex-handoff/20260713-114127-2026-07-13-p5-create-intent-characterization
  Test-only slice: >=10 characterization cases (groups a-h) over the
  handler at :232-571; no production code allowed in the commit.
- R1 survey VERIFIED and adopted: 5-slice chunk-2 plan now in program
  HANDOFF.md (characterize -> quote nucleus -> PI orchestration ->
  /checkout migration -> W1 cleanup). Slice-3 risk: non-atomic writes
  (payments.routes.ts:494-561). Zero/empty-item inputs unguarded —
  P5 pins current behavior and queues a guard decision.

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

1. On P5 exit: triage; re-run gates myself (typecheck, unit suite);
   verify commit touches NOTHING under server/src outside __tests__;
   REVIEW the new characterizations hard against the brittle-seam rule —
   they are the net slices 2-4 rely on; check the zero-total candidate-bug
   report in decision_needed and decide whether a guard slice joins the
   chunk plan.
2. If clean: author slice 2 (quote nucleus — checkout.service.ts owning
   product resolution + affiliate/coupon pricing + tax-line construction
   behind a public quote result), fire at medium.
3. Then slices 3-5 per HANDOFF; chunk-2 gate mirrors chunk 1: fixed floor
   + adversarial review at HIGH (W1 expiry check included) + PR (CI
   binding) + Tommy merge decision.

## Standing facts

- Fire command + model policy: CLAUDE.md (repo root).
- Survey headline: ROUTES_REFACTOR_PLAN.md is PARTIAL — checkout.service,
  webhook-stripe.service, repo layer never built; storage.ts 2,067 lines.
- Chunk 2 target: extract checkout service (create-payment-intent pricing,
  payments.routes.ts:232-578). Chunk 3: webhook service (stripe.routes.ts).
- CI (pr-checks.yml) runs only on PRs to main: typecheck, build, db:push,
  seeds, verifySchema, unit tests, critical E2E.
