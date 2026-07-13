# Packet: P15 — extract account.updated handling into stripe-connect-webhook.service

Lane: implementation

## Context (self-contained; verified by director 2026-07-13)

Repo: /Users/thomascarney/Projects/powerplunge, branch
refactor/complete-the-money-path. HEAD is P14's commit (director
verified before firing this; loop-state commits may also be present).
Baseline VERIFIED by execution at fire time: `npm run typecheck` exit 0;
`npm run with:local-auth-env -- npm run test:unit` green. The
characterizations in
server/src/routes/webhooks/__tests__/stripe.routes.test.ts are THE NET;
existing cases MUST NOT be edited.

Target: /Users/thomascarney/Projects/powerplunge/server/src/routes/webhooks/stripe.routes.ts
POST /stripe-connect handler, `account.updated` branch ONLY (director
read it in full this session): looks up the affiliate payout account by
Stripe account id; if found: snapshots prev state (payoutsEnabled,
chargesEnabled, detailsSubmitted), updates the payout account from the
event's account object (payouts_enabled/charges_enabled/
details_submitted with ?? false defaults, requirements passthrough),
logs "[CONNECT] Updated payout account <id> for Stripe account <id>",
then writes a createAuditLog entry (action
"stripe_connect.account_updated", metadata incl. prevState/newState/
eventId) ONLY when payoutsEnabled or detailsSubmitted changed; if no
payout account found: silently does nothing. The branch sits inside the
route's try/catch that logs "Error processing Connect webhook:" and
still 200-acks.

Route context that STAYS in the route: Stripe-configured check, Connect
secret resolution (settings-encrypted then env fallback), signature
verification + failure alerting, dedupe (including the 23505
concurrent-duplicate race path), 200-ack mapping.

House idiom (P13/P14 precedent):
server/src/services/stripe-refund-webhook.service.ts — deps-injected
factory, plain event data in (object + event id), error handling
placement preserved exactly, no Express types.

Standing decisions that bind this slice:

- BEHAVIOR-PRESERVING: ack/dedupe semantics pinned (D2's approved
  changes land in a later dedicated slice, NOT here).
- Same log/audit messages byte-for-byte, including the
  changed-fields-only audit condition.
- capability.updated is slice 5 — do NOT touch it.

## Goal

New `server/src/services/stripe-connect-webhook.service.ts` owns the
account.updated payout-account synchronization behind a public
operation taking plain event data (account object + event id); the
route branch becomes a thin call inside its existing try/catch. Proof:
existing webhook characterizations pass UNTOUCHED; full suite green;
new service tests cover the operation at its public interface.

## Scope and non-goals

In scope:
- server/src/services/stripe-connect-webhook.service.ts (new)
- server/src/services/__tests__/stripe-connect-webhook.service.test.ts (new)
- server/src/routes/webhooks/stripe.routes.ts (account.updated branch
  only)
- docs/architecture/refactor-programs/complete-the-money-path/HANDOFF.md
  (full State/Next Slice rewrite per its format: slice 4 done, next =
  slice 5 capability.updated + dispatch cleanup)

Non-goals (forbidden):
- Editing stripe.routes.test.ts in ANY way (frozen; empty-diff gate).
- Touching capability.updated (slice 5), the /stripe endpoint or its
  services, secret resolution, dedupe, ack semantics.
- No new schema/routes/npm deps. No Express types in the service.

## Exact implementation steps

1. Re-run the baseline green at HEAD first.
2. Read the branch fully; enumerate seam calls
   (storage.getAffiliatePayoutAccountByStripeAccountId,
   storage.updateAffiliatePayoutAccount, storage.createAuditLog,
   console logging); list them in the report.
3. Create the service with a deps-injected factory (default deps = real
   storage); operation name from domain language (CONTEXT.md). Where
   error swallowing lives: the route's existing try/catch remains the
   swallow point for this endpoint (match P13/P14 report precedent only
   if it says otherwise — the branch itself has no inner try/catch;
   preserve that exactly: seam errors propagate OUT of the service and
   are caught by the route).
4. Replace the route branch with the thin service call; surrounding
   try/catch and 200-ack behavior unchanged.
5. New service tests at the public interface: happy-path update with
   audit log when payoutsEnabled changes; update WITHOUT audit log when
   only chargesEnabled changes; unknown Stripe account id -> no writes;
   ?? false defaulting when event fields are absent; seam error
   propagates (rejects) so the route's catch owns it. Stub external
   seams only.
6. HANDOFF.md per Scope.

FORBIDDEN test shapes: unchanged from prior packets (no snapshots, no
call-order asserts, no private-helper asserts, no mocking the module
under test).

## Validation commands (binding gates)

- `npm run typecheck` -> exit 0
- `npm run with:local-auth-env -- npm run test:unit` -> exit 0 (trap-100:
  one retry on full-suite failure; two failures = STOP, commit nothing,
  report exact assertions)
- `git diff-tree --no-commit-id --name-only -r <your-commit>` lists ONLY
  the four in-scope files (planning/ worktree dirt is the director's).
- `git diff HEAD~1 -- server/src/routes/webhooks/__tests__/stripe.routes.test.ts`
  -> empty output.
- New service test file has >= 5 `it(` cases (state count).
- ONE commit. Do NOT push.
- After code-review fixes: re-run the FULL gate set before final JSON.

## Edge cases / failure modes

- The no-payout-account path is SILENT today (no warn, no log) —
  preserve exactly.
- Audit log fires only on payoutsEnabled OR detailsSubmitted change
  (NOT chargesEnabled) — preserve exactly, including prevState/newState
  metadata shapes.
- If the diff exceeds 400 non-test lines, STOP and propose a split.

## Hard rules

- No push, deploy, merge, production mutation, real Stripe charge, or
  real email. Never print secrets. Touch NOTHING outside Scope.

## Rollback

Revert the single commit; no state outside git.
