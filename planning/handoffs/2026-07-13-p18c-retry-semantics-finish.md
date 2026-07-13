# Packet: P18c — retry semantics finish: fifth case unpinned, land the commit

Lane: implementation

## Current delta

P18b stopped correctly at a decision point (director-verified): the
uncommitted worktree holds the retry-semantics implementation (5 files
modified: stripe.routes.ts, stripe-refund-webhook.service.ts, both test
files, server/storage.ts), focused 39/40 green, with ONE red case —
server/src/services/__tests__/stripe-refund-webhook.service.test.ts
"keeps earlier charge refund writes when a later write fails" (:198
region, `.resolves.toBeUndefined()` at :215), which was not on P18b's
unpin list and contradicts the propagation contract. DIRECTOR DECISION:
that case is now UNPINNED (fifth and final). Rewrite it to the decided
contract: when a later per-refund write fails mid-loop, the
already-completed earlier refund writes PERSIST (assert the earlier
create/update seam calls happened) AND the operation REJECTS
(propagates), so the route 500s and Stripe's retry re-delivers (safe
because per-refund processing is idempotent create-vs-update). Rename
the case to describe the new behavior. Then finish the P18b packet:
assess the existing worktree changes, keep what is sound, complete the
HANDOFF rewrite, run the FULL gate set, land ONE commit.

## Preserved decisions

- Entire P18b contract still binds: atomic claim
  (metadata.status processing->processed, no schema change); handler
  failure -> delete claim + 500 minimal JSON; success/duplicate/
  signature/unknown-event semantics unchanged; refund service outer
  swallowing removed, Meta catches stay; no touching the other two
  webhook services, the test route file, or the
  handlePaymentIntentSucceededWebhook export; storage.ts limited to the
  two new methods (update metadata by eventId, delete by eventId).
- Unpinned cases now number FIVE, by name: the four from P18b (two
  route candidate-bug acks; two service swallow cases) plus "keeps
  earlier charge refund writes when a later write fails" per Current
  delta. ALL other existing cases frozen.
- Red-first evidence: include P18b's already-captured red output in the
  report (it ran before implementation), plus the new red/green for the
  rewritten fifth case.
- e2e read-and-reconcile gate stands: report any
  e2e/customer-stripe-webhook-success.spec.ts (:255-:410) expectation
  the contract would break; none expected.
- FORBIDDEN test shapes unchanged.

## Banked facts

- Branch refactor/complete-the-money-path @ afe97b4 (+ director
  loop-state commits); the 5 modified files above are P18b's work
  product — assess, keep sound parts, do NOT blind-reset.
- Pre-P18 baseline: typecheck 0; unit 42 files / 335 tests green.
- processed_webhook_events: eventId unique, metadata jsonb
  (shared/schema.ts:1084).
- Trap 100: one retry on full-suite failure; two failures = STOP.

## Validation commands (binding gates)

- `npm run typecheck` -> exit 0
- `npm run with:local-auth-env -- npm run test:unit` -> exit 0 (trap-100
  one-retry rule)
- Red-first evidence in the report (prior red output + fifth-case
  red/green).
- `git diff-tree --no-commit-id --name-only -r <your-commit>` lists ONLY
  the six files: server/src/routes/webhooks/stripe.routes.ts,
  server/src/services/stripe-refund-webhook.service.ts,
  server/src/routes/webhooks/__tests__/stripe.routes.test.ts,
  server/src/services/__tests__/stripe-refund-webhook.service.test.ts,
  server/storage.ts,
  docs/architecture/refactor-programs/complete-the-money-path/HANDOFF.md.
- storage.ts diff contains ONLY the two new methods (interface +
  implementation); state method names and line ranges.
- `git diff HEAD~1 -- server/src/routes/test/stripe-webhook.routes.ts`
  -> empty output.
- Unpinned-case accounting: changed existing cases are exactly a subset
  of the FIVE named; new route-level cases >= 4.
- HANDOFF.md full State/Next Slice rewrite (slice 1 done, mini-review
  next, then slice 2 refund pagination).
- ONE commit. Do NOT push.
- After code-review fixes: re-run the FULL gate set before final JSON.

## Rollback

Revert the single commit; no state outside git.
