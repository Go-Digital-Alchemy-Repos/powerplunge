# Packet: P10 — reject empty carts and non-positive quantities at create-payment-intent

Lane: implementation

## Context (self-contained; verified by director 2026-07-13)

Repo: /Users/thomascarney/Projects/powerplunge, branch
refactor/complete-the-money-path @ d7199d2 (P9 landed). Baseline VERIFIED
by execution: `npm run typecheck` exit 0; `npm run with:local-auth-env --
npm run test:unit` green (39 files / 271 tests).

P5 pinned a candidate bug with two characterizations in
server/src/routes/public/__tests__/create-payment-intent.routes.test.ts
(:426 "currently creates a zero-total order and PaymentIntent for an
empty cart"; :439 "currently persists a zero-quantity line and creates a
zero-total PaymentIntent" — both commented "current behavior - candidate
bug"). Today POST /create-payment-intent accepts an empty items array or
a zero/negative/non-integer quantity, persists a zero-total pending order,
and creates a $0 PaymentIntent. The checkout flow now lives in
server/src/services/checkout.service.ts (quote +
createPaymentIntentCheckout operations, P6/P7).

## The new contract (director decision, delegated authority)

- Empty or missing items array -> 400 {message: "Cart is empty"}; nothing
  persisted, no Stripe call.
- Any item quantity that is not a positive integer -> 400
  {message: "Invalid item quantity"}; nothing persisted, no Stripe call.
- Placement: inside the create-payment-intent SERVICE operation (typed
  error, route maps to 400) — NOT in shared quote() internals, so
  POST /checkout behavior does not change (it has its own zero-payable
  rejection policy).

This packet is BEHAVIOR-CHANGING: red tests first.

## Goal

The two candidate-bug characterizations are REPLACED by tests asserting
the new contract; the guard lives in the service operation; /checkout and
all other tests are untouched and green.

## Scope and non-goals

In scope:
- server/src/services/checkout.service.ts (guard + typed error)
- server/src/services/__tests__/checkout.service.test.ts (service-level
  cases for the guard)
- server/src/routes/public/payments.routes.ts (error -> 400 mapping in
  create-payment-intent only)
- server/src/routes/public/__tests__/create-payment-intent.routes.test.ts
  (replace ONLY the two candidate-bug cases; every other case untouched)
- docs/architecture/refactor-programs/complete-the-money-path/HANDOFF.md
  (State + slice status: slice 6 done, chunk 2 slices COMPLETE, next =
  chunk 2 gate owned by the director)

Non-goals (forbidden):
- Any change to quote() semantics, /checkout, POST /checkout tests,
  payments.routes.test.ts, or order-finalization.
- No other validation additions (price, product status, etc.).

## Exact implementation steps (TDD order is binding)

1. RED FIRST: replace the two candidate-bug route tests with
   new-contract tests (empty cart -> 400 "Cart is empty", zero-quantity
   -> 400 "Invalid item quantity", both asserting storage.createOrder and
   paymentIntents.create NOT called); add service-level cases (typed
   error thrown/returned, no deps invoked). Run: new cases MUST FAIL
   against current code; record failing assertion names.
2. Implement the guard in createPaymentIntentCheckout (before any storage
   or Stripe access); route maps the typed error to 400 with the exact
   messages above.
3. GREEN: full suite green; trap-100 retry rule applies.
4. HANDOFF.md update per Scope.

FORBIDDEN test shapes: unchanged from prior packets.

## Validation commands (binding gates)

- `npm run typecheck` -> exit 0
- `npm run with:local-auth-env -- npm run test:unit` -> exit 0 (trap-100:
  one retry; two failures = STOP, commit nothing, report)
- `git diff-tree --no-commit-id --name-only -r <your-commit>` lists ONLY
  the five in-scope files.
- Report includes red-run evidence (failing assertions before the guard).
- The two old candidate-bug test names no longer exist; state the
  before/after `it(` counts for create-payment-intent.routes.test.ts.
- ONE commit. Do NOT push.
- After code-review fixes: re-run the FULL gate set before final JSON.

## Edge cases / failure modes

- Quantity 1.5 or "2" (string): the guard rejects non-positive-integer
  NUMBERS; characterize what express/json parsing delivers and reject
  anything that is not a positive integer number. Keep it strict and
  simple; note the exact predicate in the report.
- If any existing green test depended on zero-quantity passthrough
  (there should be none besides the two being replaced), STOP and report.

## Hard rules

- No push, deploy, merge, production mutation, real Stripe charge, or
  real email. Never print secrets. Touch NOTHING outside Scope.

## Rollback

Revert the single commit; no state outside git.
