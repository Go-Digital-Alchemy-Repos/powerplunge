# Packet: P12 — characterization baseline for the Stripe webhook routes

Lane: implementation

## Context (self-contained; verified by director 2026-07-13)

Repo: /Users/thomascarney/Projects/powerplunge, branch
refactor/complete-the-money-path (rebased on main merge 1e6a120, chunks
1-2 merged). Baseline VERIFIED by execution: `npm run typecheck` exit 0;
`npm run with:local-auth-env -- npm run test:unit` green (39 files / 289
tests). Program handoff (chunk-3 slice list):
/Users/thomascarney/Projects/powerplunge/docs/architecture/refactor-programs/complete-the-money-path/HANDOFF.md

Target: /Users/thomascarney/Projects/powerplunge/server/src/routes/webhooks/stripe.routes.ts
(391 lines). VERIFIED (R2 survey, director spot-checked):

- POST /stripe at :18 — main webhook: signature verification, delivery
  dedupe BEFORE dispatch, then event branches including
  payment_intent.succeeded / checkout.session.completed (finalization),
  payment_intent.payment_failed (alerting), charge.refunded (:87-150,
  dynamic import of refund.service; create-vs-update refund records; Meta
  enqueues; errors swallowed into 200 acks), refund.updated, unknown
  events acked 200.
- POST /stripe-connect at :231 — Connect webhook: secret resolution at
  :238-258 (settings-stored encrypted secret via decrypt() first, env
  STRIPE_CONNECT_WEBHOOK_SECRET fallback, 4xx/5xx when neither), then
  account.updated / capability.updated handling (affiliate payout
  enablement writes).
- R2 finding to characterize as-is: refund and Connect failures are
  INTENTIONALLY swallowed into 200 acknowledgements; unwrapped async
  failures elsewhere lack a reliable HTTP error path and can interact
  with pre-dispatch dedupe (a dedupe-marked delivery whose handler then
  crashes is not retried by Stripe). Pin CURRENT behavior; do not fix.
- Existing test file
  server/src/routes/webhooks/__tests__/stripe.routes.test.ts mocks
  storage/stripe/finalization/notification seams and boots the router via
  express; its cases are Checkout/finalization-focused. NOT covered:
  refund sync branches, Connect handling, payment-failure alerting,
  unknown-event fallthrough, signature/secret failure paths, dedupe.
- Diagnostic-only e2e: e2e/customer-stripe-webhook-success.spec.ts
  :255-:410 covers the real signed path + duplicate delivery; not a gate
  here.

## Goal

A characterization net over BOTH webhook endpoints at their public
interfaces (signed HTTP request in -> status + ack body + seam effects
out), green against CURRENT code, strong enough that slices 2-5
(refund-service and Connect-service extractions, dispatch cleanup) cannot
silently change acknowledgement semantics, dedupe behavior, or domain
writes. NO production code changes.

## Scope and non-goals

In scope:
- server/src/routes/webhooks/__tests__/stripe.routes.test.ts — ADDITIVE
  ONLY: add new describe blocks/cases; existing cases untouched. If the
  file exceeds ~1200 lines you MAY create
  server/src/routes/webhooks/__tests__/stripe-connect.routes.test.ts for
  the Connect endpoint using the same seam pattern; say which you chose.
- docs/architecture/refactor-programs/complete-the-money-path/HANDOFF.md
  (State + slice 1 status; full State/Next Slice rewrite per its format).

Non-goals (forbidden):
- ANY change under server/src outside __tests__ directories. Bugs or
  smells found (e.g. the dedupe-then-crash no-retry interaction) get a
  `// current behavior — candidate bug, do not rely on` comment and a
  decision_needed entry; do NOT fix.
- No new npm deps.

## Exact implementation steps

1. Read both handlers fully; enumerate the event branches and their seam
   effects; list them in the report.
2. Characterize POST /stripe: (a) invalid/missing signature -> exact
   current status+body; (b) duplicate delivery id -> dedupe ack without
   re-dispatch (assert the second delivery causes no seam calls);
   (c) unknown event type -> 200 ack, no writes; (d)
   payment_intent.payment_failed -> alerting seam called with the order
   context, 200; (e) charge.refunded happy path -> refund record CREATED
   with the Stripe refund fields, Meta enqueue attempted, 200;
   (f) charge.refunded for an already-known refund -> record UPDATED not
   duplicated; (g) charge.refunded with a storage/service error ->
   swallowed, still 200 (candidate-bug comment per Context);
   (h) refund.updated -> status normalization applied.
3. Characterize POST /stripe-connect: (a) settings-stored encrypted
   secret used when present; (b) env fallback when settings absent;
   (c) neither -> exact current failure status; (d) account.updated ->
   affiliate payout-enablement writes; (e) capability.updated -> its
   current effect; (f) handler error -> current ack behavior.
4. Assert at seams (storage methods, refund.service public functions,
   alerting, Meta, finalization) with expect.objectContaining on fields
   that matter; NO internal call-order asserts, no snapshot equality.
   Signature verification may be satisfied via the existing test
   pattern (however current tests construct valid events — reuse it; if
   they bypass signature via mocks, keep that seam and characterize the
   signature failure path at whatever boundary IS reachable; report the
   choice).
5. HANDOFF.md: slice 1 done, next = slice 2 (refund service extraction,
   riskiest, mini-review scheduled).

FORBIDDEN test shapes: HTML snapshots, call-order asserts, private-helper
asserts, mocking modules the test re-implements. Tests must survive
slices 2-5 moving branch logic into services unchanged.

## Validation commands (binding gates)

- `npm run typecheck` -> exit 0
- `npm run with:local-auth-env -- npm run test:unit` -> exit 0 (trap-100:
  one retry on full-suite failure; two failures = STOP, commit nothing,
  report exact assertions)
- At least 12 new `it(` cases mapping to groups 2a-2h and 3a-3f (state
  the count and mapping in the report).
- `git diff-tree --no-commit-id --name-only -r <your-commit>` lists ONLY
  the in-scope files (test file(s) + HANDOFF.md); worktree dirt under
  planning/ is the director's.
- Existing `it(` count in stripe.routes.test.ts not decreased (state
  before/after via `git show HEAD~1:<file> | grep -c "it("`).
- ONE commit. Do NOT push.
- After code-review fixes: re-run the FULL gate set before final JSON.

## Edge cases / failure modes

- Dedupe characterization must not depend on dedupe storage internals;
  drive it through two identical HTTP deliveries and observe seam-call
  counts.
- If a branch is unreachable through the router with the existing seam
  mocks (e.g. decrypt() needs a real key), stub at the narrowest PUBLIC
  module boundary the route imports and list every vi.mock added and why.
- If characterization reveals the R2 survey misdescribed a branch, trust
  the code, pin what IS, note the discrepancy.

## Hard rules

- No push, deploy, merge, production mutation, real Stripe charge, or
  real email. Never print secrets. Touch NOTHING outside Scope.

## Rollback

Revert the single commit; no state outside git.
