# Packet: P6 — extract the checkout quote nucleus into checkout.service.ts

Lane: implementation

## Context (self-contained; verified by director 2026-07-13)

Repo: /Users/thomascarney/Projects/powerplunge, branch
refactor/complete-the-money-path @ 0285f00 (P5 characterization baseline
landed). Baseline VERIFIED by execution: `npm run typecheck` exit 0;
`npm run with:local-auth-env -- npm run test:unit` green (38 files / 253
tests, including 16 create-payment-intent characterizations in
server/src/routes/public/__tests__/create-payment-intent.routes.test.ts —
they are THE NET for this slice and MUST NOT be edited).

Target: /Users/thomascarney/Projects/powerplunge/server/src/routes/public/payments.routes.ts
`POST /create-payment-intent`. The quote nucleus to extract (R1 survey,
director spot-checked):

- Product re-resolution + stored-price subtotal + order-item construction
  :379-401 (loop over items; storage.getProduct; 400 on unknown product;
  no guard on empty/zero quantities — that behavior must be PRESERVED this
  slice; slice 6 changes it later).
- Affiliate discount pricing :403-410.
- Coupon validation + discount :412-440 (read the actual coupon logic and
  its storage calls before moving).
- Stripe Tax calculation + totals or 422 :442-486.

NOT part of this slice (stays in the route): request parsing/validation
(:251-308), affiliate cookie/code/F&F attribution resolution (:310-343),
guest/auth ownership + self-referral (:345-377), order/PaymentIntent
creation + response (:488-571). Slice 3 moves orchestration later.

House idiom to follow: order-finalization.service.ts — factory
`createXService(deps?)` with an explicit deps interface, defaulted deps,
public result types, no Express types anywhere in the service.

## Goal

A new `server/src/services/checkout.service.ts` owns quoting: given plain
data (resolved attribution context + raw items + coupon code + tax
inputs), it returns a quote result (resolved items, subtotal, affiliate
discount, coupon discount, tax amount, total, plus whatever the route
needs to build the order and response). The route calls it and maps the
result; HTTP behavior is byte-equivalent. Proof: the 16 P5
characterizations pass UNTOUCHED; full suite green; new service unit tests
cover the quote math at the service's public interface.

## Scope and non-goals

In scope:
- server/src/services/checkout.service.ts (new)
- server/src/services/__tests__/checkout.service.test.ts (new)
- server/src/routes/public/payments.routes.ts (create-payment-intent
  handler consumes the service; moved code deleted)
- docs/architecture/refactor-programs/complete-the-money-path/HANDOFF.md
  (State + slice status only)

Non-goals (forbidden):
- Editing server/src/routes/public/__tests__/create-payment-intent.routes.test.ts
  or payments.routes.test.ts IN ANY WAY. If a characterization fails, your
  move changed behavior — fix the move, not the test. The ONLY exception:
  if a vi.mock module path must change because the route now imports the
  service (it should not — the tests mock storage/stripe seams, not route
  internals; verify before claiming otherwise), report it as
  decision_needed instead of editing.
- Touching POST /checkout (:1029+) — slice 4 owns it.
- Any behavior change, including the unguarded zero-total path.
- New schema, routes, npm deps. No req/res types in the service.

## Exact implementation steps

1. Re-run the characterization baseline green at HEAD before moving code.
2. Read :379-486 fully, including the coupon helpers/storage calls and the
   Stripe Tax call, and enumerate every external seam the moved code
   touches (storage methods, stripe tax, config/env). List them in the
   report.
3. Create checkout.service.ts with a deps-injected factory
   (createCheckoutService) whose deps default to the real storage/stripe
   integrations, mirroring order-finalization.service.ts. Public
   operation: a quote method taking plain-data input (items, affiliate
   pricing context as ALREADY-RESOLVED data, couponCode, customer/address
   data needed for tax) and returning a typed quote result. Name
   operations/types from CONTEXT.md domain language. Signature details are
   yours; the boundary above is not.
4. Move the logic verbatim-in-intent: same error semantics (unknown
   product, coupon invalid/expired handling, tax failure). Route maps
   service errors/results to the exact same HTTP responses (400 unknown
   product message, 422 tax contract, coupon-ignore behavior).
5. Write checkout.service.test.ts at the service public interface:
   subtotal math, affiliate discount cases (percent/fixed as they exist),
   coupon percent/fixed/cap/expired cases, tax success/failure, unknown
   product error. Stub only external seams (storage, stripe tax). Do NOT
   duplicate the HTTP-level assertions the P5 net already owns; test the
   service contract (inputs -> quote result / typed errors).
6. Slim the route handler to: validate/parse (unchanged), resolve
   attribution (unchanged), call the service, map result to
   order-creation + PaymentIntent flow (:488-571 unchanged), map errors.
7. HANDOFF.md: slice 2 done, next = slice 3 (PaymentIntent
   orchestration), State one-liner.

FORBIDDEN test shapes: HTML snapshots, call-order asserts, private-helper
asserts, mocking the module under test. Service tests must survive slice 3
moving orchestration into the same service.

## Validation commands (binding gates)

- `npm run typecheck` -> exit 0
- `npm run with:local-auth-env -- npm run test:unit` -> exit 0
- `git diff HEAD~1 --name-only` (after your commit) does NOT list
  server/src/routes/public/__tests__/create-payment-intent.routes.test.ts
  nor server/src/routes/public/__tests__/payments.routes.test.ts
- `rg -c 'createCheckoutService' /Users/thomascarney/Projects/powerplunge/server/src/services/checkout.service.ts` -> at least 1 match
- New checkout.service.test.ts exists with >= 8 `it(` cases (state count).
- ONE commit on refactor/complete-the-money-path. Do NOT push.
  Pre-existing dirt under
  /Users/thomascarney/Projects/powerplunge/planning/loop/ is NOT yours.
- After code-review fixes: re-run the FULL gate set before final JSON; if
  you cannot return to green, commit nothing and report the exact failing
  assertion plus your partial diff.

## Edge cases / failure modes

- The moved code may read env/config or ambient time (R1 flagged :417
  ambient config). Pass such values in as deps/inputs rather than
  importing them into the service if that is what the house idiom does;
  otherwise keep the import and note it.
- If the coupon logic at :412-440 turns out to be entangled with
  attribution state from :310-377 (shared variables), the quote input
  carries that resolved data; do NOT move attribution resolution itself.
- If extraction forces >600 non-test diff lines, STOP and propose a split.

## Hard rules

- No push, deploy, merge, production mutation, real Stripe charge, or real
  email. E2E suites are diagnostic here, not a gate.
- Never print secrets. Touch NOTHING outside Scope.

## Rollback

Revert the single commit; no state outside git.
