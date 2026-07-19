# Packet: P21 — suppress fulfillment notification for unpaid manual-fallback orders

Lane: implementation

## Context (self-contained; verified by director 2026-07-19)

Repo: /Users/thomascarney/Projects/powerplunge, branch
refactor/complete-the-money-path. HEAD is P20b (ab6d4bd) + director
loop-state commits (0529d82). Baseline VERIFIED by execution at
ab6d4bd: `npm run typecheck` exit 0; `npm run with:local-auth-env --
npm run test:unit` green (42 files / 348 tests).

Chunk 4 slice 4 — BEHAVIOR-CHANGING, approved direction (Tommy
2026-07-13, D3 item 4): fulfillment notifications fire only for PAID
orders, at finalization. Director-verified current state:

1. server/src/services/order-finalization.service.ts:206 already sends
   the notification inside runPaidObligations (paid orders) — correct,
   UNTOUCHED.
2. server/src/services/checkout.service.ts:579 sends the notification
   for the manual-fallback UNPAID pending order (Stripe unconfigured,
   session flow). This is the ONLY unpaid-order send in checkout; the
   PI flow already sends nothing at create time.
3. Admin manual orders (server/src/routes/admin/orders.routes.ts:221)
   are deliberate admin actions — OUT of scope, notification stays.
4. The sendOrderNotification dep in checkout.service becomes DEAD once
   :579 is removed (interface field :180, default impl :718-720, no
   route wiring — payments.routes.ts has zero references; the route
   test mocks the module, not a dep).

DIRECTOR DECISION (binding):

- Remove the :579 send. Remove the now-dead sendOrderNotification dep
  field and its default impl from checkout.service entirely (dead deps
  are forbidden residue). manual_fallback response shape unchanged.
- Accepted consequence, state it in a test comment on the rewritten
  checkout case: a manual-fallback order (Stripe unconfigured) now
  produces NO email at all; it remains visible in the admin dashboard,
  and this mode only occurs when Stripe is unconfigured (non-prod
  degraded mode).

TDD gate: red-first. Exactly two existing cases are UNPINNED BY NAME
(the ONLY test changes allowed):

- checkout.service.test.ts case asserting
  `deps.sendOrderNotification).toHaveBeenCalledWith("order-1")` (:479
  region, the manual_fallback affiliate case) — flip to the dep being
  ABSENT (drop it from the test deps object; the case keeps its other
  asserts and the manual_fallback result shape).
- payments.routes.test.ts case asserting
  `mocks.sendOrderNotification).toHaveBeenCalledWith("order-1")` (:855
  region) — flip to `not.toHaveBeenCalled()` (module mock stays).

Rewrite them FIRST against the target behavior, run, paste the red
output, then implement. All other cases byte-frozen.

## Goal

No fulfillment notification for unpaid orders: the only
sendOrderNotification calls left in server/src are finalization
(paid) and the admin manual-order route (deliberate) — prove by grep
in the report.

## Scope and non-goals

In scope:
- server/src/services/checkout.service.ts
- server/src/services/__tests__/checkout.service.test.ts
- server/src/routes/public/__tests__/payments.routes.test.ts
- docs/architecture/refactor-programs/complete-the-money-path/HANDOFF.md
  (full State/Next Slice rewrite: slice 4 done, chunk-4 slices
  complete, next = chunk-4 gate: fixed floor + adversarial review HIGH
  + PR)

Non-goals (forbidden):
- order-finalization.service, order-notification.service, admin
  routes, payments.routes.ts (production file), webhook
  routes/services, storage.ts, schema, new deps.
- The manual-fallback affiliate-commission-before-payment behavior:
  known oddity, NOT this slice; do not touch.

## Exact implementation steps

1. Baseline green at HEAD; confirm the two named cases and the dead-dep
   analysis (report `grep -rn sendOrderNotification server/src` before
   and after).
2. Rewrite the two named cases; run; paste red output.
3. Implement: remove :579 call, dep field :180, default impl :718-720.
4. Green: full gate set.
5. HANDOFF.md per Scope.

FORBIDDEN test shapes: unchanged (no snapshots, no call-order asserts,
no private-helper asserts, no mocking the module under test).

## Validation commands (binding gates)

- `npm run typecheck` -> exit 0
- `npm run with:local-auth-env -- npm run test:unit` -> exit 0
  (trap-100: one retry on full-suite failure; two failures = STOP,
  commit nothing, report exact assertions)
- Red-first evidence: pasted failing output from step 2 BEFORE
  implementation.
- `git diff-tree --no-commit-id --name-only -r <your-commit>` lists
  ONLY the four in-scope files (planning/ worktree dirt is the
  director's).
- `git diff HEAD~1 -- server/src/routes/webhooks/ server/src/services/order-finalization.service.ts server/src/services/order-notification.service.ts server/src/routes/admin/ server/src/routes/public/payments.routes.ts`
  -> empty output.
- `grep -rn 'sendOrderNotification' server/src --include='*.ts'` after:
  no hits in checkout.service.ts or its test; hits remain in
  finalization service/test, notification service/test, admin route,
  and the payments.routes.test module mock. Paste the after-list.
- Changed existing cases are EXACTLY the two named (unpinned-case
  accounting).
- ONE commit. Do NOT push.
- After code-review fixes: re-run the FULL gate set before final JSON.

## Edge cases / failure modes

- If removing the dep breaks compilation anywhere outside the four
  files, STOP and report (that contradicts the director's no-wiring
  analysis) — do not expand scope yourself.

## Hard rules

- No push, deploy, merge, production mutation, real Stripe charge, or
  real email. Never print secrets. Touch NOTHING outside Scope.

## Rollback

Revert the single commit; no state outside git.
