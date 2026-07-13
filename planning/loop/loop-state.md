# Loop State (LIVE-ONLY — rewrite each cycle; git history is the archive)

## Program

Complete the Money Path — Chunks 1 AND 2 MERGED to main (PR #25 511b0b3,
PR #26 1e6a120, both Tommy-approved 2026-07-13, CI green). Chunk 3
(webhook service extraction, FINAL chunk) open, research phase.

## In-flight

- CHUNK-3 GATE in progress. Fixed floor DONE. Adversarial review DONE
  (HIGH,
  RUN_DIR=/var/folders/kg/vqcvwwlx3xs4wblm4wpvpkz00000gn/T//codex-handoff/20260713-144604-2026-07-13-chunk3-adversarial-review):
  verdict HIGH, ONE blocking finding (payment_intent.payment_failed
  business mapping inline in route :106-126 — director confirmed by
  read) + 2 minors (prototype-inherited dispatch keys; missing
  payment_failed route-wiring test). Runtime behavior for real event
  types PRESERVED per review. Read-only compliance verified.
- P17 remediation VERIFIED (b8061ea): typecheck 0; unit 42/335 green;
  fixed floor re-passed (diff --check clean over 1e6a120..HEAD);
  commit-scoped 5 files; frozen files intact (0 deletions in
  stripe.routes.test.ts, test route untouched); hasOwnProperty guard on
  both dispatch lookups (:116, :218); 4 quality-PASS service cases.
  Review finding REMEDIATED.
- NEXT ACTION: push branch, open chunk-3 PR (CI BINDING; PR-CI FREEZE
  from open to merge decision — loop-state commits stay LOCAL from that
  moment), watch CI, then STOP for Tommy: merge decision + D3 queue +
  program closeout summary.
- P16 VERIFIED (c56b100): typecheck 0; unit 41/330 green first try;
  commit-scoped 4 files; frozen stripe.routes.test.ts AND test route
  file intact; Connect tests 5 -> 10; route 335 -> 238 lines (391 at
  chunk start); typed dispatch both endpoints; pinned export at :11.
  Codex review: 0 findings. ALL 5 CHUNK-3 SLICES DONE.
- P15 VERIFIED (658f5b4): typecheck 0; unit 41/325 green first try;
  commit-scoped 4 files; frozen stripe.routes.test.ts intact; 5 service
  cases incl. propagate-not-swallow boundary. Codex review: 0 findings.
- P14 VERIFIED (bd15b59): typecheck 0; unit 40/320 green ON RETRY
  (first run flaked 4 unrelated cross-route tests — trap 100 now
  reproduced director-side, note appended to codex-traps.md);
  commit-scoped 4 files; frozen stripe.routes.test.ts intact; service
  tests 7 -> 15 incl. both mini-review gap cases (Meta-failure
  continuation, multi-refund partial failure). Codex review: 0 findings.
- P13 MINI-REVIEW PASSED (HIGH, read-only,
  RUN_DIR=/var/folders/kg/vqcvwwlx3xs4wblm4wpvpkz00000gn/T//codex-handoff/20260713-141023-2026-07-13-p13-mini-review):
  LOW risk, zero semantic drift, lazy-import fix sound, boundary clean,
  7 tests obey brittle-seam law. 2 minor deferrable gaps folded into
  P14. Read-only compliance verified (0 files touched, HEAD unchanged).
- P13 VERIFIED (aa11e24): typecheck 0; unit 40/312 green (7 new service
  cases); commit-scoped to exactly 4 files; frozen
  stripe.routes.test.ts byte-identical; route charge.refunded branch
  now thin handleChargeRefundedWebhook() call; route 391 -> 335 lines.
  Codex self-review caught+fixed an eager refund.service import
  (module-load DB side effect) via injected loadRefundOperations —
  mini-review must confirm.
- P12 VERIFIED (e5baec6): typecheck 0; unit 39/305 green; 16 new cases
  (stripe.routes.test.ts 4 -> 20 it()); commit test-only + HANDOFF.
- D2 RESOLVED (Tommy approved (b) + R3 doc check 2026-07-13). R3
  verdict SUPPORTED-WITH-CHANGES; director spot-checked the two
  load-bearing citations by execution (recovery guide models
  processing/processed states; webhooks doc: exponential backoff,
  three-day live retry window, quick-2xx guidance).
  D2 resolved spec (post-chunk-3 behavior-changing slice(s), red-first):
  keep synchronous dispatch (no queue infra at this scale); on handler
  failure return non-2xx so Stripe retries; replace insert-after-success
  dedupe with an ATOMIC processing->processed claim (prevents concurrent
  duplicate work, per docs.stripe.com/webhooks/process-undelivered-events);
  stop swallowing refund/Connect handler errors (propagate to the ack);
  per-refund mutations idempotent (retries redeliver). SEPARATE follow-up
  (not this slice): charge.refunds.data pagination for >10 refunds.
- R2 VERIFIED and adopted: 5-slice chunk-3 plan in HANDOFF (characterize
  -> refund service [RISKIEST, mini-review after] -> refund.updated ->
  connect service -> capability + dispatch cleanup). Two endpoints
  confirmed: /stripe :18, /stripe-connect :231 (secret chain :238-258).
  Known sharp edge pinned as-is: swallowed handler errors still 200-ack
  and interact with pre-dispatch dedupe (no Stripe retry).
- Branch rebased onto main merge 1e6a120 and pushed; retro-rule commits
  (loop hygiene in CLAUDE.md + template) ride the chunk-3 PR.
- Loop hygiene rules ACTIVE (CLAUDE.md): pre-fire lint (R2 linted before
  firing), PR-CI freeze, commit-scoped gates, mid-chunk mini-review.
- .env.test.local.template scaffolded; BLOCKED on Tommy filling op://
  refs before local E2E works.
- Chunk-2 adversarial review DONE (HIGH, read-only): extraction
  behavior-preserving, service boundary clean, W1 genuinely discharged;
  2 majors + 1 minor -> P11; risk_level low. Read-only compliance
  verified (0 files touched).
- ALL 6 chunk-2 slices VERIFIED: P10 (2b58e20) typecheck 0, unit 39/276
  green, red-first evidence, old candidate-bug cases replaced; P9
  (d7199d2); P8 (7ce1bd2); P7 (42d6be2); P6 (088589e); P5 (0285f00).
- Chunk-2 fixed floor DONE: typecheck 0, unit green, git diff --check 0
  over 511b0b3..HEAD. Route file 1471 -> 1027 lines;
  checkout.service.ts 711 lines with quote/createPaymentIntentCheckout/
  createCheckoutSession.
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

1. On R2 exit: verify read-only compliance; grill the survey (spot-check
   citations by execution); adopt slice plan into program HANDOFF.md;
   author first chunk-3 packet (likely characterization baseline for the
   webhook route, mirroring chunk 2's P5 pattern).
2. Mid-chunk: after the flagged riskiest slice lands, scoped mini-review
   at HIGH read-only on that slice's diff (new loop-hygiene rule).
3. Chunk-3 gate mirrors prior chunks: fixed floor + adversarial review at
   HIGH + PR (CI binding, PR-CI freeze on pushes) + Tommy merge decision.
   After chunk 3: program closeout (HANDOFF final state, program summary
   for Tommy).

## Standing facts

- Fire command + model policy: CLAUDE.md (repo root).
- Survey headline: ROUTES_REFACTOR_PLAN.md is PARTIAL — checkout.service,
  webhook-stripe.service, repo layer never built; storage.ts 2,067 lines.
- Chunk 2 target: extract checkout service (create-payment-intent pricing,
  payments.routes.ts:232-578). Chunk 3: webhook service (stripe.routes.ts).
- CI (pr-checks.yml) runs only on PRs to main: typecheck, build, db:push,
  seeds, verifySchema, unit tests, critical E2E.
