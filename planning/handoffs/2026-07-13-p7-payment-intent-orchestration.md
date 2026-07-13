# Packet: P7 — move create-payment-intent orchestration into checkout.service

Lane: implementation

## Context (self-contained; verified by director 2026-07-13)

Repo: /Users/thomascarney/Projects/powerplunge, branch
refactor/complete-the-money-path @ 088589e (P6 quote nucleus landed).
Baseline VERIFIED by execution: `npm run typecheck` exit 0;
`npm run with:local-auth-env -- npm run test:unit` green (39 files / 263
tests). The 16 create-payment-intent characterizations
(server/src/routes/public/__tests__/create-payment-intent.routes.test.ts)
and the 10 checkout.service tests are THE NET; the route
characterizations MUST NOT be edited.

Current handler state
(/Users/thomascarney/Projects/powerplunge/server/src/routes/public/payments.routes.ts,
POST /create-payment-intent at :237):

- Request parsing + customer/address validation: :239-~313 (stays).
- Affiliate cookie/code/F&F attribution + guest/auth ownership +
  self-referral resolution: between validation and the quote call
  (read exact lines; ends before :384).
- Quote: :384-447 — builds createCheckoutService with inline deps
  (storage subset + calculateTax adapter over
  stripeClient.tax.calculations.create) and maps
  CheckoutUnknownProductError -> 400, CheckoutTaxCalculationError -> 422.
- Orchestration TO MOVE: customer IP extraction :448-451;
  storage.createOrder (:453, pending order with quote amounts +
  attribution + Meta fields); order items loop; PaymentIntent creation
  :497 (amount, metadata incl. orderId); storage.updateOrder linking
  :518; response :522 (clientSecret, orderId, totals) STAYS in route,
  built from the service result.
- Service (server/src/services/checkout.service.ts, 262 lines): typed
  quote interfaces + createCheckoutService(deps) factory; errors
  CheckoutUnknownProductError / CheckoutTaxCalculationError.

R1 risk note (why this slice is the riskiest): the writes are
non-atomic — createOrder, per-item createOrderItem, paymentIntents.create,
updateOrder are independent awaits with no transaction; a mid-sequence
failure leaves partial state. This slice PRESERVES that behavior exactly
(same call order, same absence of cleanup); fixing atomicity is NOT in
scope and would be a separate named slice.

## Goal

checkout.service.ts exposes a second public operation (name it from domain
language, e.g. createPaymentIntentCheckout) that: takes plain-data input
(validated customer data, resolved attribution/ownership context, items,
couponCode, tax address, Meta/tracking fields, customer IP), internally
quotes (reusing the existing quote logic), creates the pending order +
items, creates and links the PaymentIntent, and returns a typed result
(order id, client secret, totals breakdown). The route: validates,
resolves attribution/ownership (UNCHANGED this slice), calls the
operation, maps typed errors to the same HTTP responses, and shapes the
same response body. HTTP behavior byte-equivalent: all 16
characterizations pass untouched.

## Scope and non-goals

In scope:
- server/src/services/checkout.service.ts
- server/src/services/__tests__/checkout.service.test.ts (extend for the
  new operation at its public interface)
- server/src/routes/public/payments.routes.ts (handler slims; moved code
  deleted; inline deps adapters may move/extend as needed)
- docs/architecture/refactor-programs/complete-the-money-path/HANDOFF.md
  (State + slice status only)

Non-goals (forbidden):
- Editing create-payment-intent.routes.test.ts or payments.routes.test.ts.
- Moving attribution/ownership resolution (cookie parsing, auth session,
  self-referral) — it touches req and belongs to route/slice-4 decisions.
- Any behavior change: keep write order, error semantics, zero-total
  passthrough, non-atomicity. NO transactions, NO cleanup-on-failure.
- Touching POST /checkout. No new schema/routes/npm deps. No Express
  types in the service.

## Exact implementation steps

1. Re-run the baseline green at HEAD first.
2. Read the handler fully; enumerate every storage/stripe call in the
   block being moved and list them in the report.
3. Extend CheckoutServiceDependencies with the storage methods and
   PaymentIntent seam the moved code needs (createOrder, createOrderItem,
   updateOrder, paymentIntents.create adapter — mirror the calculateTax
   adapter pattern). Defaults follow the house idiom.
4. Implement the new operation; the existing quote() stays public (the
   /checkout migration in slice 4 will consume it separately).
5. Slim the handler; keep response shaping and error mapping in the
   route; typed service errors for any failure the route currently maps
   to a specific status.
6. Extend checkout.service.test.ts: happy-path orchestration (order
   created with quote amounts + attribution fields; items persisted; PI
   created with total and metadata.orderId; order linked), mid-sequence
   failure passthrough (PI creation rejects -> error propagates, no
   cleanup attempted — pin CURRENT behavior), zero-total passthrough.
   Service-interface assertions only.
7. HANDOFF.md: slice 3 done, next = slice 4 (/checkout migration).

FORBIDDEN test shapes: HTML snapshots, call-order asserts beyond
observable seam effects, private-helper asserts, mocking the module under
test.

## Validation commands (binding gates)

- `npm run typecheck` -> exit 0
- `npm run with:local-auth-env -- npm run test:unit` -> exit 0 (if the
  full suite fails, run it a second time before concluding — trap 100;
  report both outcomes; two failures = STOP, commit nothing, report)
- `git diff-tree --no-commit-id --name-only -r <your-commit>` lists ONLY
  the four in-scope files — commit-scoped check, worktree dirt under
  /Users/thomascarney/Projects/powerplunge/planning/ is NOT yours and NOT
  part of this gate.
- ONE commit on refactor/complete-the-money-path. Do NOT push.
- After code-review fixes: re-run the FULL gate set before final JSON.

## Edge cases / failure modes

- Meta/tracking fields and customer IP flow into createOrder today;
  they enter the operation as plain input fields — do not read req inside
  the service.
- If the response body needs a field only available route-side, return it
  from the service result rather than recomputing in the route; if
  impossible, report it.
- If the diff exceeds 600 non-test lines, STOP and propose a split.

## Hard rules

- No push, deploy, merge, production mutation, real Stripe charge, or
  real email. Never print secrets. Touch NOTHING outside Scope.

## Rollback

Revert the single commit; no state outside git.
