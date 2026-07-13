# Packet: P16 — capability.updated into the Connect service + typed webhook dispatch

Lane: implementation

## Context (self-contained; verified by director 2026-07-13)

Repo: /Users/thomascarney/Projects/powerplunge, branch
refactor/complete-the-money-path. HEAD is P15's commit (director
verified before firing this; loop-state commits may also be present).
Baseline VERIFIED by execution at fire time: `npm run typecheck` exit 0;
`npm run with:local-auth-env -- npm run test:unit` green. The
characterizations in
server/src/routes/webhooks/__tests__/stripe.routes.test.ts are THE NET;
existing cases MUST NOT be edited.

Targets (both in
/Users/thomascarney/Projects/powerplunge/server/src/routes/webhooks/stripe.routes.ts):

1. `capability.updated` branch in POST /stripe-connect (director read it
   in full this session): resolves accountId from capability.account
   (string, or object take .id); if accountId AND a payout account
   exists for it: retrieves the FULL account via
   stripeService.retrieveAccount(accountId), updates the payout account
   (payouts_enabled/charges_enabled/details_submitted with ?? false
   defaults, requirements passthrough), logs "[CONNECT] Updated
   capability for payout account <id>", ALWAYS writes createAuditLog
   (action "stripe_connect.capability_updated", metadata incl.
   capability.id, capability.status, eventId) — note: unconditional
   audit, UNLIKE account.updated's changed-fields-only condition; if no
   accountId or no payout account: silently nothing. Errors propagate
   to the route's catch ("Error processing Connect webhook:", still
   200-acks).
2. Both webhook handlers' event routing is if-chains. Convert BOTH
   POST /stripe and POST /stripe-connect to a typed dispatch shape
   (e.g. a Record<string, handler> or switch per endpoint — pick ONE
   idiom and use it for both) where each event type maps to its thin
   service call. Pure code motion: same branches, same order-observable
   behavior, same log lines, same unknown-event fallthrough acks.

Existing services (P13-P15 precedent, all deps-injected factories):
- server/src/services/stripe-refund-webhook.service.ts
  (charge.refunded + refund.updated operations)
- server/src/services/stripe-connect-webhook.service.ts (account.updated
  operation, landed by P15; seam errors propagate out; extend THIS
  factory with the capability operation)

CRITICAL export constraint (director-verified this session):
/Users/thomascarney/Projects/powerplunge/server/src/routes/test/stripe-webhook.routes.ts:5
imports `handlePaymentIntentSucceededWebhook` from
"../webhooks/stripe.routes". That export MUST keep working identically
(keep the export in place; repoint its internals only if the dispatch
refactor requires it, and say so in the report).

Standing decisions that bind this slice:

- BEHAVIOR-PRESERVING: ack/dedupe semantics pinned (D2's approved
  changes land in a later dedicated slice, NOT here).
- The capability operation needs stripeService injected (it calls
  retrieveAccount) — inject it as a dep like storage; no Express types.
- Same log/audit messages byte-for-byte.

## Goal

capability.updated logic lives behind a second public operation on
stripe-connect-webhook.service.ts, and both webhook routes are reduced
to signature/secret/dedupe plumbing plus a typed per-event dispatch of
thin service calls. Proof: existing webhook characterizations pass
UNTOUCHED; full suite green; new service tests cover the capability
operation at its public interface; test route still functions
(typecheck + its imports resolve).

## Scope and non-goals

In scope:
- server/src/services/stripe-connect-webhook.service.ts
- server/src/services/__tests__/stripe-connect-webhook.service.test.ts
- server/src/routes/webhooks/stripe.routes.ts
- docs/architecture/refactor-programs/complete-the-money-path/HANDOFF.md
  (full State/Next Slice rewrite per its format: slice 5 done, chunk 3
  slices complete, next = chunk-3 gate: fixed floor + adversarial
  review + PR)

Non-goals (forbidden):
- Editing stripe.routes.test.ts in ANY way (frozen; empty-diff gate).
- Editing server/src/routes/test/stripe-webhook.routes.ts (its import
  must keep resolving without changes to that file).
- Changing any service operation landed by P13-P15 beyond wiring it
  into the dispatch.
- Touching ack/dedupe/secret-resolution/signature semantics (D2 later).
- No new schema/routes/npm deps. No Express types in services.

## Exact implementation steps

1. Re-run the baseline green at HEAD first.
2. Read the capability.updated branch fully; enumerate seam calls
   (storage.getAffiliatePayoutAccountByStripeAccountId,
   stripeService.retrieveAccount, storage.updateAffiliatePayoutAccount,
   storage.createAuditLog, console logging); list them in the report.
3. Add the capability operation to the Connect service factory
   (stripeService as an injected dep with a lazy default import if
   needed to avoid module-load side effects — follow the P13
   loadRefundOperations precedent and report the choice).
4. Replace the route branch with the thin call.
5. Convert both endpoints' event if-chains to the chosen typed dispatch
   idiom; unknown events keep their exact current ack path; the
   handlePaymentIntentSucceededWebhook export keeps its exact
   signature and behavior.
6. New service tests at the public interface: capability update happy
   path (full account retrieved, payout account updated, audit written
   unconditionally), accountId as object form, no payout account ->
   no writes, missing accountId -> no seam calls, seam error propagates
   (rejects). Stub external seams only.
7. HANDOFF.md per Scope.

FORBIDDEN test shapes: unchanged from prior packets (no snapshots, no
call-order asserts, no private-helper asserts, no mocking the module
under test).

## Validation commands (binding gates)

- `npm run typecheck` -> exit 0
- `npm run with:local-auth-env -- npm run test:unit` -> exit 0 (trap-100:
  one retry on full-suite failure; two failures = STOP, commit nothing,
  report exact assertions; the flake is confirmed on BOTH sandbox and
  director machines — planning/codex-traps.md trap 100)
- `git diff-tree --no-commit-id --name-only -r <your-commit>` lists ONLY
  the four in-scope files (planning/ worktree dirt is the director's).
- `git diff HEAD~1 -- server/src/routes/webhooks/__tests__/stripe.routes.test.ts`
  -> empty output.
- `git diff HEAD~1 -- server/src/routes/test/stripe-webhook.routes.ts`
  -> empty output.
- Connect service test file gains >= 5 new `it(` cases (state
  before/after counts).
- ONE commit. Do NOT push.
- After code-review fixes: re-run the FULL gate set before final JSON.

## Edge cases / failure modes

- capability.updated audit log is UNCONDITIONAL (fires on every matched
  update) — do not copy account.updated's changed-fields condition.
- The dispatch conversion must not change evaluation order where an
  event type could match multiple branches (verify none does; report).
- If the diff exceeds 500 non-test lines, STOP and propose a split.

## Hard rules

- No push, deploy, merge, production mutation, real Stripe charge, or
  real email. Never print secrets. Touch NOTHING outside Scope.

## Rollback

Revert the single commit; no state outside git.
