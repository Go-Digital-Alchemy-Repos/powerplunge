# Packet: P2 — dedupe confirm-payment paid-state guards; drop notification re-export

Lane: implementation

## Context (self-contained; verified by director 2026-07-13)

Repo: /Users/thomascarney/Projects/powerplunge, branch
refactor/complete-the-money-path (P1 landed as d0c7528). Baseline VERIFIED
by execution: `npm run typecheck` exit 0 and `npm run with:local-auth-env
-- npm run test:unit` green (37 files / 226 tests).

VERIFIED by inspection in
/Users/thomascarney/Projects/powerplunge/server/src/routes/public/payments.routes.ts,
handler `POST /confirm-payment` (:923):

- Route-level guards BEFORE calling the finalization service:
  - :930 missing orderId/paymentIntentId -> 400 "Missing orderId or paymentIntentId"
  - :935 Stripe unconfigured -> 400 "Stripe is not configured"
  - :940 `paymentIntent.status !== "succeeded"` -> 400 "Payment not completed"
  - :944 `paymentIntent.metadata.orderId !== orderId` (request body vs PI
    metadata) -> 400 "Invalid payment verification"
  - :952-954 `storage.getOrder(orderId)` missing -> 404 "Order not found"
  - :957 `paymentIntent.amount !== order.totalAmount` -> 400 "Payment amount mismatch"
  - :965 `paymentIntent.currency !== "usd"` -> 400 "Invalid currency"
- The service already owns the last three checks:
  /Users/thomascarney/Projects/powerplunge/server/src/services/order-finalization.service.ts
  `finalizeStripePaymentIntent` (:68) derives orderId from
  `paymentIntent.metadata.orderId` and returns `{status:"skipped",
  reason:...}` for `missing_order_id`, `order_not_found`,
  `checkout_session_payment_intent`, `amount_mismatch`,
  `currency_mismatch` (:71-99). Skipped results carry `order` EXCEPT
  `missing_order_id` and `order_not_found`.
- After finalization the handler uses `order` for Meta-tracking repair
  paths (:997, :1013) and always ends `res.json({ success: true, orderId })`.
- P1 leftover: payments.routes.ts still re-exports the notification
  function (`:11` import, `:15 export { sendOrderNotification }`) solely for
  /Users/thomascarney/Projects/powerplunge/server/src/routes/admin/orders.routes.ts:220
  `const { sendOrderNotification } = await import("../public/payments.routes");`
- Existing route tests:
  server/src/routes/public/__tests__/payments.routes.test.ts has exactly ONE
  confirm-payment test (:106, already-paid Meta repair path). The guard HTTP
  responses above are NOT characterized anywhere.

## Goal

The route stops re-implementing paid-state guard logic the service owns.
`order_not_found`, `amount_mismatch`, `currency_mismatch` are decided by the
service; the route only translates skipped reasons into the SAME HTTP
responses clients get today (404 "Order not found", 400 "Payment amount
mismatch", 400 "Invalid currency"). Request-validation guards (:930, :935,
:940, :944) stay at the route — the service never sees the request body, so
the body-vs-metadata orderId check cannot move. Also: admin orders.routes.ts
imports the notification service directly and the payments.routes re-export
is gone. Proof: new characterization tests written against TODAY'S behavior
pass unchanged after the refactor; full unit suite green.

## Scope and non-goals

In scope:
- server/src/routes/public/payments.routes.ts (confirm-payment handler + drop re-export)
- server/src/routes/public/__tests__/payments.routes.test.ts (characterization tests)
- server/src/routes/admin/orders.routes.ts (:220 import path only)
- docs/architecture/refactor-programs/complete-the-money-path/HANDOFF.md
  (State + slice status; you MAY rewrite the Next Slice block to describe P3:
  rename order-claim.service to account-linking vocabulary + CONTEXT.md note)

Non-goals (forbidden):
- Any change inside order-finalization.service.ts or its tests.
- Any change to pricing/coupon/affiliate logic (chunk 2 owns it).
- Renaming order-claim.service (P3 owns it).
- No new npm deps, schema changes, or new routes.
- Do NOT weaken responses: a request that gets a 4xx today must get the
  SAME status and message after.

## Exact implementation steps (TDD order is binding)

1. CHARACTERIZE FIRST, against unmodified code: add tests to
   payments.routes.test.ts for the confirm-payment guard responses:
   - unknown orderId -> 404 {message:"Order not found"}
   - PI amount != order.totalAmount -> 400 {message:"Payment amount mismatch"}
   - PI currency != "usd" -> 400 {message:"Invalid currency"}
   - body orderId != PI metadata.orderId -> 400 {message:"Invalid payment verification"}
   - PI status != "succeeded" -> 400 {message:"Payment not completed"}
   Follow the file's existing seam pattern (it already stubs stripe/storage
   at their public interfaces). Assert ONLY status + message + that no
   finalization side effect happened where today none happens. Run the suite;
   these must be GREEN before any refactor. Commit checkpoint not required;
   one final commit still the rule.
2. Refactor the handler: delete guards :952-965 (getOrder-for-guarding,
   amount, currency). Call the finalization service, then map:
   - skipped order_not_found (and missing_order_id, defensive) -> 404 "Order not found"
   - skipped amount_mismatch -> 400 "Payment amount mismatch"
   - skipped currency_mismatch -> 400 "Invalid currency"
   - skipped checkout_session_payment_intent and any other skip -> current
     fall-through behavior (success path), unchanged.
   Source `order` for the Meta repair paths from finalizationResult.order
   when present; fetch via storage only if a path still needs it (e.g.
   already-paid skip on checkout_session). Existing test :106 must stay
   green UNTOUCHED — it pins the already-paid repair path.
3. Order of operations note: today amount/currency 4xx happen BEFORE
   finalization; after the change the service decides them. The service
   checks paymentFlow BEFORE amount/currency, so a checkout_session PI with
   a wrong amount that 400s today would skip-through after. Characterize
   what TODAY does for that combination and preserve it (if needed, keep a
   narrow route-level branch; say so in the report).
4. admin orders.routes.ts:220 -> import from
   "../../services/order-notification.service"; then delete the re-export
   and its import (:11 if now unused, :15) from payments.routes.ts; verify no
   other importer remains (`rg 'payments\.routes' server/src` — only route
   registration should remain).
5. Update HANDOFF.md State + slice status (P2 done, next P3) and rewrite
   Next Slice for P3 per its existing format.

FORBIDDEN test shapes: HTML-body snapshots, internal call-order asserts,
asserting private helpers, mocking modules the test re-implements. A test
that breaks on a further rename/move without behavior change is wrong.

## Validation commands (binding gates)

- `npm run typecheck` -> exit 0
- `npm run with:local-auth-env -- npm run test:unit` -> exit 0
- `rg -c 'payments\.routes' /Users/thomascarney/Projects/powerplunge/server/src/routes/admin/orders.routes.ts` -> exit 1 (zero matches)
- `rg -c 'export \{ sendOrderNotification \}' /Users/thomascarney/Projects/powerplunge/server/src/routes/public/payments.routes.ts` -> exit 1 (zero matches)
- New characterization tests present and passing in payments.routes.test.ts
  (at least the 5 guard cases from step 1).
- ONE commit on refactor/complete-the-money-path (code + tests + HANDOFF.md),
  packet-scoped paths clean. Do NOT push. Pre-existing dirt under
  /Users/thomascarney/Projects/powerplunge/planning/loop/ is NOT yours;
  leave it untouched and do not count it against cleanliness.
- After code-review fixes: re-run the FULL gate set before final JSON; if
  you cannot return to green, commit nothing and report the exact failing
  assertion plus your partial diff.

## Edge cases / failure modes

- If a characterization test reveals TODAY'S behavior differs from this
  packet's claims, the test wins: pin actual behavior, adjust the mapping to
  preserve it, and report the discrepancy. Never force-green by changing the
  assertion to match the refactor.
- The finalization service logs amount/currency mismatches via its own
  logger; the route's console.error for those guards disappears with the
  guards. That log-shape change is acceptable; HTTP behavior is the contract.
- If mapping skip reasons makes the handler LONGER/uglier than the guards it
  replaces, still prefer the mapping (single source of truth), but keep it a
  small pure function if that helps readability.

## Hard rules

- No push, deploy, merge, production mutation, real Stripe charge, or real
  email. E2E suites are diagnostic here, not a gate.
- Never print secrets. Touch NOTHING outside Scope. If the diff exceeds 600
  lines excluding tests, STOP and propose a split in the final JSON.

## Rollback

Revert the single commit; no state outside git.
