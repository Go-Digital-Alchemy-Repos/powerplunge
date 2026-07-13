# Packet: P8 — migrate POST /checkout onto checkout.service (createCheckoutSession)

Lane: implementation

## Context (self-contained; verified by director 2026-07-13)

Repo: /Users/thomascarney/Projects/powerplunge, branch
refactor/complete-the-money-path @ 42d6be2 (P7 orchestration landed).
Baseline VERIFIED by execution: `npm run typecheck` exit 0;
`npm run with:local-auth-env -- npm run test:unit` green (39 files / 266
tests).

Current state of
/Users/thomascarney/Projects/powerplunge/server/src/routes/public/payments.routes.ts
(1248 lines):

- POST /checkout handler: :987 to file end region. Affiliate
  cookie/code/F&F resolution :995-1030ish (duplicates what
  create-payment-intent resolves route-side); customer
  create/update/ownership + self-referral :1040-1060; product quoting +
  per-line discount allocation, zero-payable rejection, Checkout Session
  creation :1189 (checkout.sessions.create), manual-order fallback when
  Stripe is unavailable (:1112 area, "Stripe not configured - manual
  payment required"), referral/affiliate-session side effects.
- server/src/services/checkout.service.ts now owns quote() and the
  PaymentIntent orchestration operation (P6/P7), deps-injected factory,
  typed errors.

R1 survey (director-adopted; verify against current code, lines have
shifted): /checkout intentionally DIFFERS from create-payment-intent —
no coupon input; discounts allocated INTO nonzero Session line items with
per-unit cent allocation; zero payable subtotal REJECTED; automatic tax
deferred to Stripe (no synchronous Tax Calculation); manual order +
referral creation when Stripe is unavailable; downstream finalization
preserves the pre-tax Session subtotal invariant
(order-finalization.service.ts:150-190).

Existing /checkout unit coverage in
server/src/routes/public/__tests__/payments.routes.test.ts: durable local
identity/persistence ordering, global-percent line-item math, ineligible
products, 100%-discount zero-total rejection. NOT unit-covered: the
manual-order fallback branch and referral/affiliate-session side effects
(E2E only, diagnostic).

## Goal

POST /checkout consumes a distinct `createCheckoutSession` operation on
checkout.service (NOT the PaymentIntent operation, NOT an undifferentiated
"checkout" method): shared primitives (product resolution, affiliate
pricing) reused internally, /checkout-specific policies (no coupons,
line-item discount allocation, zero-payable rejection, deferred automatic
tax, manual-order fallback) owned by the operation as typed logic/results.
Route keeps request parsing, attribution/ownership resolution, HTTP
mapping. HTTP behavior byte-equivalent; ALL existing tests pass untouched.

## Scope and non-goals

In scope:
- server/src/services/checkout.service.ts
- server/src/services/__tests__/checkout.service.test.ts
- server/src/routes/public/payments.routes.ts (/checkout handler only)
- server/src/routes/public/__tests__/payments.routes.test.ts — ADDITIVE
  ONLY: you may add new characterization tests (see step 1); you MUST NOT
  modify or delete any existing test case in this file or in
  create-payment-intent.routes.test.ts.
- docs/architecture/refactor-programs/complete-the-money-path/HANDOFF.md
  (State + slice status only)

Non-goals (forbidden):
- Any behavior change, including the manual-order fallback semantics,
  discount cent-allocation math, and the Session subtotal invariant.
- Touching create-payment-intent handler or its tests.
- Coupon support in /checkout. No new schema/routes/npm deps. No Express
  types in the service.

## Exact implementation steps

1. CHARACTERIZE FIRST (against unmodified code): add unit tests to
   payments.routes.test.ts for the uncovered /checkout branches:
   (a) Stripe unavailable -> manual order created with current
   status/notes and response contract; (b) affiliate referral/session
   side effects on a successful Session (what IS persisted); (c) any
   Session-metadata contract the webhook finalization relies on
   (orderId, subtotal invariant fields). Green before refactor.
2. Read the full handler; enumerate every storage/stripe seam it touches;
   list them in the report.
3. Implement createCheckoutSession on the service (extend deps for
   checkout.sessions.create adapter and the storage methods the moved
   logic needs). Typed results for: session created (url/id), manual
   fallback, zero-payable rejection; typed errors mirroring current HTTP
   mapping.
4. Slim the route handler: parse/validate, resolve attribution/ownership
   (UNCHANGED), call the operation, map results to the same responses.
5. Extend checkout.service.test.ts at the service interface: line-item
   allocation math (including per-unit cent rounding and ineligible
   products), zero-payable rejection, manual fallback path, Session
   metadata contract.
6. HANDOFF.md: slice 4 done, next = slice 5 (W1 shim cleanup).

FORBIDDEN test shapes: HTML snapshots, call-order asserts, private-helper
asserts, mocking the module under test. Existing test cases untouched.

## Validation commands (binding gates)

- `npm run typecheck` -> exit 0
- `npm run with:local-auth-env -- npm run test:unit` -> exit 0 (trap-100
  rule: on full-suite failure run once more; two failures = STOP, commit
  nothing, report exact assertions)
- `git diff-tree --no-commit-id --name-only -r <your-commit>` lists ONLY
  the five in-scope files (worktree dirt under planning/ is not yours).
- `git diff HEAD~1 -- server/src/routes/public/__tests__/create-payment-intent.routes.test.ts`
  -> empty output (file untouched).
- Existing test names in payments.routes.test.ts all still present
  (additive-only proof): state in the report the before/after `it(` counts
  for that file (before: run `grep -c "it(" ` on HEAD~1 version via
  `git show`).
- ONE commit. Do NOT push.
- After code-review fixes: re-run the FULL gate set before final JSON.

## Edge cases / failure modes

- The manual-order fallback may create referral records with balances
  (R1: manual referral/balance side effects) — characterize before
  moving; preserve exactly.
- Per-unit cent allocation: if the moved math produces different rounding
  in ANY existing test fixture, the move is wrong — fix the move.
- If the handler reads ambient time (cookie expiry check at :1001 uses
  Date.now()), keep that route-side or inject a clock only if the house
  idiom already does; do not invent new abstractions.
- If the diff exceeds 600 non-test lines, STOP and propose a split.

## Hard rules

- No push, deploy, merge, production mutation, real Stripe charge, or
  real email. Never print secrets. Touch NOTHING outside Scope.

## Rollback

Revert the single commit; no state outside git.
