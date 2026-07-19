# Packet: P20b — idempotency keys resume: route adapter joins scope

Lane: implementation

## Current delta

P20 blocked honestly (director-verified): the public payment route
wires its OWN checkout adapters, so the five-file scope could not pass
the suite or protect production. DIRECTOR DECISION (binding): scope
EXPANDS by exactly three files —
server/src/routes/public/payments.routes.ts,
server/src/routes/public/__tests__/payments.routes.test.ts,
server/src/routes/public/__tests__/create-payment-intent.routes.test.ts.
In payments.routes.ts the createPaymentIntent adapter (:364 region)
and the session-creator adapter forward `input.idempotencyKey` as the
Stripe options arg, mirroring the checkout.service default impls. No
other route logic changes.

The worktree holds P20's uncommitted partial work (4 files:
refund.service.ts, checkout.service.ts, both service test files).
Assess it, keep what is sound, finish, land ONE commit.

## Preserved decisions

- Key formulas UNCHANGED from P20: refund
  `refund_${orderId}_${amount}_${existingRefunds.length}`;
  `pi_create_${order.id}`; `checkout_session_${order.id}`.
- Red-first cases (a)(b)(c) from P20 stand; carry P20's already-captured
  red output into the report. Route tests updated to expect the new
  options arg count as behavior asserts (key VALUE), plus >= 1 route
  case proving the adapter forwards the key to the Stripe client.
- Request params byte-identical apart from the added options arg.
- FROZEN: webhook routes/services, StripeService.ts, storage.ts,
  schema, affiliate-payout key, /reprice-payment-intent, no new deps.
- FORBIDDEN test shapes unchanged; asserting the key value at a seam
  is a behavior assert.

## Banked facts

- Branch refactor/complete-the-money-path @ 178b52f + director
  loop-state commits (ced03e5). Baseline VERIFIED at 178b52f:
  typecheck 0; suite 42 files / 344 tests green.
- P20 blocker facts (Codex-reported, director-confirmed at :364/:474):
  payments.routes.ts createPaymentIntent adapter drops any
  idempotencyKey; payments.routes.test.ts:474 pins the old
  single-argument sessions.create call.
- refund existingRefunds already loaded at refund.service.ts:68.
- Trap 100: one retry on full-suite failure; two failures = STOP.

## Validation commands (binding gates)

- `npm run typecheck` -> exit 0
- `npm run with:local-auth-env -- npm run test:unit` -> exit 0
  (trap-100 one-retry rule)
- Red-first evidence: P20's captured red output plus red/green for any
  new route case.
- `git diff-tree --no-commit-id --name-only -r <your-commit>` lists
  ONLY the eight files: the five from P20 plus the three route files
  above (planning/ worktree dirt is the director's).
- `git diff HEAD~1 -- server/src/routes/webhooks/ server/src/services/stripe-refund-webhook.service.ts server/src/integrations/stripe/StripeService.ts server/storage.ts`
  -> empty output.
- `grep -n 'Date.now' server/src/services/refund.service.ts` output in
  the report; none on the key line.
- Test counts before/after for all four test files (baselines: refund
  24, checkout 16, payments.routes and create-payment-intent: state
  measured baselines).
- HANDOFF.md full State/Next Slice rewrite (slice 3 done incl. route
  adapters, next = slice 4 unpaid-order notification suppression).
- ONE commit. Do NOT push.
- After code-review fixes: re-run the FULL gate set before final JSON.

## Rollback

Revert the single commit; no state outside git.
