# Loop State (LIVE-ONLY — rewrite each cycle; git history is the archive)

## Program

Complete the Money Path — Chunk 1 DONE and MERGED to main
(PR #25, merge 511b0b3, Tommy approved 2026-07-13; CI was green).
Chunk 2 (checkout service extraction) now open, research phase.

## In-flight

- Packet P9 W1 shim cleanup
  (planning/handoffs/2026-07-13-p9-w1-shim-cleanup.md)
  FIRED 2026-07-13 12:37 at gpt-5.6-sol medium. BEHAVIOR-CHANGING,
  red-test-first. New contract (director decision): currency
  case-insensitive end to end; checkout_session PIs at confirm-payment
  fall through to success (no route amount/currency 4xx — session
  integrity owned by webhook/session-proof finalization); non-session PI
  contract unchanged. Discharges W1 (entry deleted on land).
  RUN_DIR=/var/folders/kg/vqcvwwlx3xs4wblm4wpvpkz00000gn/T//codex-handoff/20260713-123703-2026-07-13-p9-w1-shim-cleanup
- P8 VERIFIED (7ce1bd2): typecheck 0; unit 39/273 green; frozen
  characterization file untouched (empty diff); payments.routes.test.ts
  additive 15->18 it(); commit scoped to 5 files; no review findings.
- P7 VERIFIED (42d6be2): typecheck 0; unit 39/266 green; scoped; clean.
- P5 VERIFIED (0285f00): typecheck 0; unit 38/253 green; 16 new cases,
  groups a-h; commit test-only; shapes clean (objectContaining at seams,
  no snapshots; candidate-bug cases commented).
- Chunk-2 plan now 6 slices: slice 6 = zero-total guard (empty cart /
  non-positive quantity -> reject), BEHAVIOR-CHANGING red-test-first,
  added by director under delegated grilling authority; it replaces the
  two candidate-bug characterizations when it lands.

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

1. On P6 exit: triage; re-run gates myself (typecheck, unit suite,
   characterization test files UNTOUCHED per git diff --name-only, new
   service test count >= 8); review checkout.service.ts interface against
   the deep-service goal (no req/res leakage, domain names) and its tests
   against the brittle-seam rule; ONE commit.
2. If clean: author slice 3 (PaymentIntent orchestration — riskiest,
   non-atomic writes at :488-571 move into the service preserving call
   order and HTTP mapping), fire at medium.
3. Then slices 4-6 per HANDOFF; chunk-2 gate mirrors chunk 1: fixed floor
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
