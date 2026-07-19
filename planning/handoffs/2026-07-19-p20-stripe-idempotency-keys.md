# Packet: P20 — Stripe idempotency keys: deterministic refund key, keys on checkout creates

Lane: implementation

## Context (self-contained; verified by director 2026-07-19)

Repo: /Users/thomascarney/Projects/powerplunge, branch
refactor/complete-the-money-path. HEAD is P19 (178b52f) + director
loop-state commits. Baseline VERIFIED by execution at 178b52f:
`npm run typecheck` exit 0; `npm run with:local-auth-env -- npm run
test:unit` green (42 files / 344 tests).

Chunk 4 slice 3 — BEHAVIOR-CHANGING, approved by Tommy 2026-07-13 (D3
fold: idempotency keys into hardening). Director-verified current
state:

1. server/src/services/refund.service.ts:84 builds
   `refund_${orderId}_${amount}_${Date.now()}` — the Date.now() makes
   every attempt a fresh key, so a retry after a crash BETWEEN the
   Stripe refunds.create success and the local storage.createRefund
   write (:112 region) issues a SECOND real refund. existingRefunds is
   already loaded at :68 (computeRefundableAmount input).
2. server/src/services/checkout.service.ts default deps send NO
   idempotency options: paymentIntents.create at :678 and
   checkout.sessions.create at :691. Both call sites run AFTER the
   local order row exists (order.id available: PI metadata at :497,
   clientReferenceId at :614).

DIRECTOR DECISION (binding key formulas):

- Refund: `refund_${orderId}_${amount}_${existingRefunds.length}`
  (attempt index = count of already-persisted refunds for the order).
  Properties this buys, name them in a test comment: crash-window
  retry replays the SAME Stripe refund (no double refund, local record
  then created); a subsequent intentional refund after the first
  persisted increments the count -> fresh key; two concurrent
  same-amount submissions collapse to one refund at Stripe
  (double-click protection, acceptable).
- PaymentIntent create: `pi_create_${order.id}`.
- Checkout Session create: `checkout_session_${order.id}`.
  order.id is fresh per checkout attempt, so a key can never be reused
  with different params (Stripe would 400 on that).

Wiring: extend the checkout.service dep INPUTS (createPaymentIntent
input and the session-creator input) with an `idempotencyKey` field;
the default impls pass it as the Stripe options arg
(`{ idempotencyKey }`, second parameter). The service composes the key
from order.id so tests assert it via the existing injected dep spies.
Refund key stays inside refund.service.ts (same seam as today, the
options arg of refunds.create).

TDD gate: red-first. Named failing tests BEFORE implementation (paste
red output): (a) refund.service: refunds.create receives the
deterministic key for a first refund (count 0) and a different
deterministic key after one refund exists (count 1) — no timestamp
component; (b) checkout.service: createPaymentIntent dep receives
`idempotencyKey: "pi_create_<order.id>"`; (c) session flow: session
creator receives `checkout_session_<order.id>`.

## Goal

Every Stripe mutation in the money path carries a deterministic
idempotency key derived from durable local identity, so
network/crash retries can never double-charge or double-refund.

## Scope and non-goals

In scope:
- server/src/services/refund.service.ts (key line only region)
- server/src/services/checkout.service.ts (dep input types + default
  impls + call-site key composition)
- server/src/services/__tests__/refund.service.test.ts
- server/src/services/__tests__/checkout.service.test.ts
- docs/architecture/refactor-programs/complete-the-money-path/HANDOFF.md
  (full State/Next Slice rewrite: slice 3 done, next = slice 4
  unpaid-order notification suppression)

Non-goals (forbidden):
- Webhook routes/services (FROZEN; empty-diff gate), storage.ts,
  StripeService.ts, schema, new deps.
- The affiliate-payout key (already deterministic:
  affiliate-payout.service.ts:201) — do not touch.
- /reprice-payment-intent (chunk 5) — paymentIntents.update calls are
  out of scope.
- No behavior change beyond the keys: request params byte-identical.

## Exact implementation steps

1. Baseline green at HEAD; read both services + both test files;
   report the refund test file's Stripe seam (module mock vs injected)
   before writing tests.
2. Red tests (a)(b)(c); run; paste red output.
3. Implement: refund key formula; checkout dep input fields + key
   composition + options pass-through.
4. Green: full gate set.
5. HANDOFF.md per Scope.

FORBIDDEN test shapes: unchanged (no snapshots, no call-order asserts,
no private-helper asserts, no mocking the module under test).
Asserting the key VALUE passed to a seam is a behavior assert, not a
call-order assert.

## Validation commands (binding gates)

- `npm run typecheck` -> exit 0
- `npm run with:local-auth-env -- npm run test:unit` -> exit 0
  (trap-100: one retry on full-suite failure; two failures = STOP,
  commit nothing, report exact assertions)
- Red-first evidence: pasted failing output from step 2 BEFORE
  implementation.
- `git diff-tree --no-commit-id --name-only -r <your-commit>` lists
  ONLY the five in-scope files (planning/ worktree dirt is the
  director's).
- `git diff HEAD~1 -- server/src/routes/webhooks/ server/src/services/stripe-refund-webhook.service.ts server/src/integrations/stripe/StripeService.ts server/storage.ts`
  -> empty output.
- No `Date.now` remains in refund.service.ts idempotency-key
  construction: `grep -n 'Date.now' server/src/services/refund.service.ts`
  output listed in the report (hits allowed elsewhere in the file,
  none on the key line).
- Each of the two test files gains >= 1 new `it(` case (state
  before/after counts; baseline 24 refund / 16 checkout).
- ONE commit. Do NOT push.
- After code-review fixes: re-run the FULL gate set before final JSON.

## Edge cases / failure modes

- Stripe replays the ORIGINAL response for a reused key, including
  error responses, for 24h. Acceptable for these flows (a failed
  create retried same-request gets the same error; a new admin attempt
  after a persisted refund gets a fresh key).
- Do NOT include mutable fields (status, timestamps) in any key.
- If the diff exceeds 200 non-test lines, STOP and propose a split.

## Hard rules

- No push, deploy, merge, production mutation, real Stripe charge, or
  real email. Never print secrets. Touch NOTHING outside Scope.

## Rollback

Revert the single commit; no state outside git.
