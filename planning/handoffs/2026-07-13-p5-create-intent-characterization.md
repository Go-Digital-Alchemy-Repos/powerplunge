# Packet: P5 — characterization baseline for POST /create-payment-intent

Lane: implementation

## Context (self-contained; verified by director 2026-07-13)

Repo: /Users/thomascarney/Projects/powerplunge, branch
refactor/complete-the-money-path @ 511b0b3 (= main; chunk 1 merged).
Baseline VERIFIED by execution: `npm run typecheck` exit 0;
`npm run with:local-auth-env -- npm run test:unit` green (37 files / 237
tests). Program handoff (chunk-2 slice list):
/Users/thomascarney/Projects/powerplunge/docs/architecture/refactor-programs/complete-the-money-path/HANDOFF.md

Target: /Users/thomascarney/Projects/powerplunge/server/src/routes/public/payments.routes.ts
`POST /create-payment-intent` (:232-571). VERIFIED structure (R1 survey,
director spot-checked):

- Inputs :232-244 (items, customer, affiliateCode, billing, couponCode,
  Meta tracking). Stripe client check :246-249. Customer/address
  validation :251-308. Affiliate cookie/code/F&F resolution :310-343
  (helpers :153-186). Guest/authenticated ownership + self-referral
  :345-377. Product re-resolution and stored-price subtotal :379-401
  (NOTE: no guard on empty items array or zero/negative quantity — zero
  totals flow through). Affiliate + coupon discounts :403-440. Stripe Tax
  or 422 :442-486. Order + items creation, PaymentIntent creation +
  linking, response with clientSecret/orderId/totals :488-571.
- Existing test file
  /Users/thomascarney/Projects/powerplunge/server/src/routes/public/__tests__/payments.routes.test.ts
  already stubs storage and Stripe at public seams (mocks :5-34 include
  paymentIntents.retrieve, checkout sessions create, tax
  createFromCalculation) and boots the router via express + app.request
  helpers. NO test currently POSTs /create-payment-intent.
- The only current coverage of this handler is E2E
  (e2e/customer-stripe-webhook-success.spec.ts:34-75) — diagnostic here,
  not a gate.

## Goal

A characterization net over create-payment-intent at its PUBLIC interface
(HTTP request in, HTTP response + storage/Stripe seam effects out), green
against CURRENT code, strong enough that slices 2-4 (quote-nucleus
extraction, orchestration move, /checkout migration) cannot silently change
response contracts or persistence behavior. NO production code changes.

## Scope and non-goals

In scope:
- server/src/routes/public/__tests__/payments.routes.test.ts — extend its
  mocks (paymentIntents.create, tax calculations as needed) and add the
  new describe block. If the file exceeds ~1200 lines, you MAY instead
  create server/src/routes/public/__tests__/create-payment-intent.routes.test.ts
  reusing the same seam pattern; say which you chose.
- docs/architecture/refactor-programs/complete-the-money-path/HANDOFF.md
  (State + slice 1 status only).

Non-goals (forbidden):
- ANY change under server/src outside __tests__ directories. This packet
  is characterization only; if a test reveals a bug (e.g. the zero-total
  path), pin CURRENT behavior with a `// current behavior — candidate bug,
  do not rely on` comment and report it in decision_needed. Do NOT fix it.
- Do NOT touch the W1-waived confirm-payment characterizations.
- No new npm deps.

## Exact implementation steps

1. Extend the mock surface minimally: stripeClient.paymentIntents.create,
   tax calculation seam (whatever :442-486 actually calls — read it),
   storage.createOrder/createOrderItem/updateOrder returns. Keep the
   existing hoisted-mocks pattern.
2. Add characterization tests, each asserting response status + body
   contract and the observable seam effects (what reached
   storage.createOrder / paymentIntents.create / tax seam), never internal
   call order:
   a. Happy path (guest): valid items + customer -> 200 with clientSecret,
      orderId, and totals; order created pending with correct subtotal /
      discount / tax / total; PaymentIntent created with the order total
      and metadata.orderId linking back.
   b. Validation failures: missing/invalid customer fields and any
      malformed-items handling that exists TODAY (:251-308) -> exact 4xx
      status + message.
   c. Stripe unconfigured (:246-249) -> exact current response.
   d. Affiliate branches: valid affiliate cookie applies session
      attribution; explicit affiliateCode applies discount math
      (:403-410); friends-and-family flag path when enabled; self-referral
      rejection/neutralization (:345-377) — assert the priced outcome and
      persisted attribution fields, not helper internals.
   e. Coupon branches (:412-440): valid coupon applies expected discount
      (pick real fixture math: percent and fixed if both exist — read the
      coupon service/storage shapes first); invalid/expired coupon ->
      current behavior (error or ignore — characterize what IS).
   f. Tax: successful calculation contributes to totals; tax failure path
      -> 422 with current message (:442-486).
   g. Zero/edge path: empty items array and zero-quantity item ->
      characterize CURRENT behavior (per R1 unguarded; verify) with the
      candidate-bug comment; report in decision_needed whether a guard
      slice should be added to the chunk plan.
   h. Authenticated customer path: ownership resolution (:345-377) —
      order belongs to the session customer, not a duplicate row.
3. Keep fixtures compact: shared builders inside the describe block; no
   snapshot assertions; expect.objectContaining for seam payloads with the
   fields that MATTER (amounts, ids, statuses), not full-object equality
   on incidental fields.
4. HANDOFF.md: mark slice 1 done, next = slice 2 (quote nucleus), State
   one-liner.

FORBIDDEN test shapes: HTML-body snapshots, internal call-order asserts,
asserting private helpers, full-response snapshot equality, mocking modules
the test re-implements. A test that breaks on a rename/move without
behavior change is wrong. Tests must survive slices 2-4 moving this logic
into a service unchanged.

## Validation commands (binding gates)

- `npm run typecheck` -> exit 0
- `npm run with:local-auth-env -- npm run test:unit` -> exit 0
- At least 10 new `it(` cases covering groups a-h above (state the count
  and map cases to groups in the report).
- `git diff HEAD~1 --stat` (after your commit) shows NO files under
  server/src outside __tests__ directories.
- ONE commit on refactor/complete-the-money-path. Do NOT push.
  Pre-existing dirt under
  /Users/thomascarney/Projects/powerplunge/planning/loop/ is NOT yours;
  leave it untouched.
- After code-review fixes: re-run the FULL gate set before final JSON; if
  you cannot return to green, commit nothing and report the exact failing
  assertion plus your partial diff.

## Edge cases / failure modes

- If the handler's tax/coupon/affiliate seams are hard to reach through
  the existing mock pattern (deep imports, dynamic imports), stub at the
  narrowest PUBLIC module boundary actually imported by
  payments.routes.ts — list every vi.mock you add and why.
- If a branch turns out to be dead code (unreachable input combination),
  do not force a test through internals; report it as a finding instead.
- If characterizing group d/e reveals behavior that contradicts the R1
  survey's line citations, trust the code, note the discrepancy.

## Hard rules

- No push, deploy, merge, production mutation, real Stripe charge, or real
  email. E2E suites are diagnostic here, not a gate.
- Never print secrets. Touch NOTHING outside Scope. If the diff exceeds
  600 lines excluding tests, STOP and propose a split in the final JSON.

## Rollback

Revert the single commit; no state outside git.
