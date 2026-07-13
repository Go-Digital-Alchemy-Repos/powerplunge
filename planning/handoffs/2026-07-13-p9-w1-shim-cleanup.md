# Packet: P9 — retire the confirm-payment compatibility shims (W1 cleanup)

Lane: implementation

## Context (self-contained; verified by director 2026-07-13)

Repo: /Users/thomascarney/Projects/powerplunge, branch
refactor/complete-the-money-path @ 7ce1bd2 (P8 landed). Baseline VERIFIED
by execution: `npm run typecheck` exit 0; `npm run with:local-auth-env --
npm run test:unit` green (39 files / 273 tests).

Background: chunk 1 (P2) preserved two accidental legacy behaviors at
POST /confirm-payment in
/Users/thomascarney/Projects/powerplunge/server/src/routes/public/payments.routes.ts
via compatibility pre-guards (find them above the finalization call; they
were at :950-975 pre-P6, lines have shifted):

1. checkout_session pre-guard: PaymentIntents with
   metadata.paymentFlow === "checkout_session" get route-level 400s for
   amount/currency mismatch, because the finalization service
   intentionally skips session PIs before its own gates.
2. uppercase-USD pre-guard: currency "USD" (uppercase) is rejected 400
   "Invalid currency" with a preserved order->amount->currency error
   precedence, even though the service compares case-insensitively.

These are pinned by characterization tests in
server/src/routes/public/__tests__/payments.routes.test.ts (the
uppercase-USD and checkout-session guard cases; waiver W1 in
/Users/thomascarney/Projects/powerplunge/planning/loop/findings-waived.md
scheduled their retirement this chunk). This packet is
BEHAVIOR-CHANGING: red tests first.

## The new contract (director decision, delegated authority)

- Currency handling is case-insensitive end to end: a PaymentIntent with
  currency "USD" behaves exactly like "usd" (mismatch checks still reject
  genuinely different currencies via the service's currency_mismatch
  skip -> 400 "Invalid currency").
- checkout_session PaymentIntents at confirm-payment follow the service's
  intent: they skip finalization and fall through to the endpoint's
  normal success path (200 {success:true, orderId}) with the existing
  already-paid Meta-repair behavior. NO route-level amount/currency 4xx
  for session PIs: session integrity is owned by webhook/session-proof
  finalization, not this endpoint.
- Non-session PIs keep the exact P2 contract: order_not_found -> 404,
  amount_mismatch -> 400 "Payment amount mismatch", currency_mismatch ->
  400 "Invalid currency".

## Goal

Both pre-guards are deleted; the confirm-payment handler is: request
validation guards (missing params, Stripe unconfigured, PI not succeeded,
body-vs-metadata orderId) + finalization call + skip-reason mapping +
existing post-finalization behavior. Tests assert the new contract and
the old pinning tests are REPLACED. Full suite green.

## Scope and non-goals

In scope:
- server/src/routes/public/payments.routes.ts (confirm-payment handler
  only)
- server/src/routes/public/__tests__/payments.routes.test.ts (replace the
  shim-pinning cases with new-contract cases; other cases untouched)
- /Users/thomascarney/Projects/powerplunge/planning/loop/findings-waived.md
  (delete the W1 entry — this packet discharges it; leave the header and
  any other entries)
- docs/architecture/refactor-programs/complete-the-money-path/HANDOFF.md
  (State + slice status only)

Non-goals (forbidden):
- ANY change to order-finalization.service.ts or checkout.service.ts.
- Touching create-payment-intent.routes.test.ts or any non-shim test case.
- Changing the four request-validation guards or the skip-reason mapping
  for non-session PIs.

## Exact implementation steps (TDD order is binding)

1. RED FIRST: rewrite the shim-pinning test cases to assert the NEW
   contract (uppercase USD with matching amounts -> success path exactly
   like lowercase; session PI with mismatched amount -> 200 success
   fall-through, no 400; keep one case proving genuinely different
   currency still 400s via the service mapping). Run the file: the new
   cases MUST FAIL against the current shims. Record the failing
   assertion names in the report.
2. Delete both pre-guards from the handler. Ensure the post-finalization
   code still has the `order` it needs on the session skip path (the
   handler previously fetched it in the shim; keep a plain
   storage.getOrder where required — that is data access, not a guard).
3. GREEN: the rewritten cases pass; the rest of the file untouched and
   green; full suite green.
4. findings-waived.md: remove the W1 entry. HANDOFF.md: slice 5 done,
   next = slice 6 (zero-total guard).

## Validation commands (binding gates)

- `npm run typecheck` -> exit 0
- `npm run with:local-auth-env -- npm run test:unit` -> exit 0 (trap-100
  rule: one retry allowed; two failures = STOP, commit nothing, report)
- `git diff-tree --no-commit-id --name-only -r <your-commit>` lists ONLY
  the four in-scope files.
- Report includes the red-run evidence (which new assertions failed
  before the guard deletion).
- ONE commit. Do NOT push.
- After code-review fixes: re-run the FULL gate set before final JSON.

## Edge cases / failure modes

- The uppercase-USD success path must produce IDENTICAL side effects to
  lowercase (finalization runs, notification obligation, Meta enqueue) —
  assert via existing seam mocks, not new internals.
- If deleting the session pre-guard breaks the already-paid Meta repair
  test (:106 area), the fall-through wiring is wrong — the repair path
  must behave as before for paid session orders.
- If anything outside the two shims turns out to depend on the shim
  behavior (grep consumers first), STOP and report instead of expanding
  scope.

## Hard rules

- No push, deploy, merge, production mutation, real Stripe charge, or
  real email. Never print secrets. Touch NOTHING outside Scope.

## Rollback

Revert the single commit; no state outside git.
