# Packet: P11 — chunk 2 review remediation (cart-guard boundary + currency test)

Lane: implementation

## Current delta

Chunk 2 (P5-P10) is implemented, director-verified green, and
adversarially reviewed. The review cleared extraction drift, the service
boundary, and the W1 discharge, but found three defects in P10's guard
and P9's test grounding. This packet fixes them before the chunk PR.

## Preserved decisions

- P10 contract stands: empty/missing cart -> 400 "Cart is empty";
  non-positive-integer quantity -> 400 "Invalid item quantity"; rejection
  happens BEFORE any persistence or Stripe access (the review proved the
  current code violates this — that is the bug being fixed).
- P9 contract stands: currency case-insensitive end to end.
- Test-quality law and one-commit-per-packet unchanged.

## Banked facts

- Baseline at HEAD (2b58e20 + director loop-state commits): typecheck
  exit 0; `npm run with:local-auth-env -- npm run test:unit` green
  (39 files / 276 tests).
- Review findings (VERIFIED citations):
  F1 [major] payments.routes.ts:183,293-305,364 +
  checkout.service.ts:430-438 — the cart guard fires inside the service
  operation AFTER the route has resolved the Stripe client and
  created/updated the customer; a rejected request leaves customer
  persistence behind. Route tests (create-payment-intent.routes.test.ts
  :426-443) only assert order/PI creation skipped, so the leak is
  untested.
  F2 [major] checkout.service.ts:430-440 — malformed item containers:
  items="" bypasses both checks (zero-item quote proceeds to tax/PI);
  null or plain object throws -> 500 after customer persistence; nonempty
  strings hit "Invalid item quantity". Guard must require
  Array.isArray at the public boundary.
  F3 [minor] payments.routes.test.ts:199-233 — the uppercase-USD success
  test mocks the finalization service as already finalized, so it cannot
  catch a strict-comparison regression; order-finalization.service tests
  have no mixed-case currency case.

## Goal

Cart validation rejects empty/missing/malformed carts and invalid
quantities at the ROUTE ENTRY (before Stripe client resolution and before
any customer create/update), with the service keeping its guard as
defense in depth; malformed containers (empty string, null, plain object,
malformed elements) all get deterministic 400s; a service-level test
proves uppercase-USD PaymentIntents finalize through
markOrderPaidIfPending. Full suite green.

## Scope and non-goals

In scope:
- server/src/routes/public/payments.routes.ts (create-payment-intent
  handler: hoist cart validation to entry)
- server/src/services/checkout.service.ts (Array.isArray boundary +
  guard kept as defense)
- server/src/routes/public/__tests__/create-payment-intent.routes.test.ts
  (strengthen the two guard cases: assert NO customer create/update, NO
  tax call, NO Stripe access; add malformed-container cases)
- server/src/services/__tests__/checkout.service.test.ts (malformed
  container cases at the service interface)
- server/src/services/__tests__/order-finalization.service.test.ts
  (ADD one case: uppercase-"USD" PaymentIntent finalizes — reaches
  markOrderPaidIfPending; do not modify existing cases)
- docs/architecture/refactor-programs/complete-the-money-path/HANDOFF.md
  (State only: remediation landed, chunk 2 PR-ready)

Non-goals (forbidden):
- Changing the 400 messages or adding validations beyond the named guard
  space (empty/missing/malformed container, non-positive-integer
  quantity).
- Touching /checkout, quote(), payments.routes.test.ts existing cases,
  or order-finalization.service.ts production code.

## Exact implementation steps (TDD order is binding)

1. RED FIRST: strengthen/extend the route tests — rejected carts assert
   storage.createCustomer AND storage.updateCustomer AND the tax seam AND
   paymentIntents.create all uncalled; add malformed-container cases
   (items: "", null, {}, [{}], [{productId, quantity:"2"}]) each
   expecting a deterministic 400 (message per the P10 contract: container
   problems -> "Cart is empty" if empty/missing/not-an-array is your
   chosen mapping — pick ONE mapping, state it, keep it stable). Add the
   uppercase-USD finalization service case. Run: new/changed cases must
   FAIL against current code; record which.
2. Fix: hoist cart validation to the top of the create-payment-intent
   handler (before stripe client resolution and customer persistence),
   reusing a validation helper exported by checkout.service (single
   source of truth) — the service operation keeps calling it too.
   Array.isArray at the boundary.
3. GREEN: full suite; trap-100 retry rule.
4. HANDOFF.md State per Scope.

## Validation commands (binding gates)

- `npm run typecheck` -> exit 0
- `npm run with:local-auth-env -- npm run test:unit` -> exit 0 (trap-100:
  one retry; two failures = STOP, commit nothing, report)
- `git diff-tree --no-commit-id --name-only -r <your-commit>` lists ONLY
  the six in-scope files.
- Report includes red-run evidence and the chosen malformed-container
  message mapping.
- ONE commit. Do NOT push.
- After code-review fixes: re-run the FULL gate set before final JSON.

## Edge cases / failure modes

- Hoisting validation must not change WHICH 4xx wins for requests that
  fail both cart validation and customer validation — characterize the
  current precedence for one such combined case first and preserve
  whichever precedence the route has TODAY for inputs that already 400
  (only the never-persisted guarantee is new).
- If the shared validation helper would create an import cycle, keep two
  small predicates (route + service) and say so.

## Hard rules

- No push, deploy, merge, production mutation, real Stripe charge, or
  real email. Never print secrets. Touch NOTHING outside Scope.

## Rollback

Revert the single commit; no state outside git.
