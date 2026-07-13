# Packet: Chunk 2 adversarial review — checkout service extraction (P5-P10)

Lane: review

READ-ONLY: no edits, no commits; final JSON report only. Before reporting
a finding, check
/Users/thomascarney/Projects/powerplunge/planning/loop/findings-waived.md
(currently has no active entries — W1 was discharged by P9; cite the file
as checked).

## Context (self-contained; verified by director 2026-07-13)

Repo: /Users/thomascarney/Projects/powerplunge, branch
refactor/complete-the-money-path. Review the chunk diff:

```
git diff 511b0b3..2b58e20
```

Ignore everything under /Users/thomascarney/Projects/powerplunge/planning/
in any diff; loop bookkeeping is out of review scope. Slice commits:
P5 0285f00 (characterization baseline), P6 088589e (quote nucleus),
P7 42d6be2 (PaymentIntent orchestration), P8 7ce1bd2 (/checkout
migration), P9 d7199d2 (shim retirement, BEHAVIOR-CHANGING), P10 2b58e20
(zero-total guard, BEHAVIOR-CHANGING).

Chunk intent (program: Complete the Money Path, chunk 2): extract the
checkout flow behind a deep service.
server/src/services/checkout.service.ts (711 lines) now owns quote(),
createPaymentIntentCheckout, createCheckoutSession (deps-injected
factory, typed errors); server/src/routes/public/payments.routes.ts is
down from 1471 (pre-chunk-1) / 1273 (post-P6) to 1027 lines — routes keep
parsing/validation, attribution/ownership resolution, error mapping,
response shaping.

Deliberate behavior changes (red-test-first; everything else claims
behavior-preservation):

- P9: currency comparison case-insensitive end to end; checkout_session
  PIs at confirm-payment fall through to the success path (no route-level
  amount/currency 4xx); non-session PI contract unchanged (404
  order-not-found, 400 amount/currency mismatch).
- P10: create-payment-intent rejects empty/missing carts (400 "Cart is
  empty") and non-positive-integer quantities (400 "Invalid item
  quantity") before any persistence or Stripe call; /checkout policies
  unchanged.

Director-verified per slice (may contradict with evidence): typecheck 0
and full unit suite green after every slice (now 39 files / 276 tests);
commit-scoped file lists clean; characterization freeze respected (P6/P7
did not touch the 16-case net); red-first evidence recorded for P9/P10.

## Your job: try to break this chunk

1. BEHAVIOR DRIFT in the extractions (P6/P7/P8): diff moved logic against
   its pre-chunk source (git show 511b0b3:server/src/routes/public/payments.routes.ts)
   hunting semantic differences — pricing/discount/rounding math
   (especially /checkout per-unit cent allocation and ineligible-product
   handling), coupon validity windows, tax calculation inputs, order/PI
   metadata contracts the webhook finalization depends on (Session
   subtotal invariant, metadata.orderId), write order and error
   semantics, manual-order fallback fields.
2. The service boundary: req/res leakage, hidden ambient state
   (Date.now, env, module singletons) moved INTO the service, import
   cycles, deps interfaces that lie (default deps diverging from what the
   routes previously did).
3. The two behavior changes (P9/P10): enumerate inputs whose response
   changed and check each was INTENDED per the contracts above. Hunt
   especially for collateral changes: non-session PIs with unusual
   metadata, session PIs on the already-paid Meta-repair path, /checkout
   empty-cart handling (must be UNCHANGED by P10), malformed items
   containers, webhook-path finalization (must be unaffected by P9's
   route change).
4. TEST QUALITY (binding rule): new/rewritten tests assert observable
   behavior at public interfaces; flag rename-brittle shapes, vacuous
   mocks, tests that re-implement the code under test, and any deleted
   coverage not replaced (P9 deleted shim characterizations — verify the
   replacements cover the guard space; P10 replaced the two candidate-bug
   cases).
5. Anything that would fail pr-checks.yml (typecheck, build, db:push,
   seeds, verifySchema, unit tests, critical E2E) that unit tests miss —
   especially the client build (does the SPA call create-payment-intent
   with shapes P10 now rejects? rg the client/ code for the request
   construction) and e2e specs' expectations against the changed
   confirm-payment contract.
6. W1 DISCHARGE AUDIT: confirm the shims are actually gone from the
   confirm-payment handler and the re-grounded tests genuinely exercise
   the new contract (not just renamed old asserts).

## Constraints

- READ-ONLY. Non-mutating commands only (git show/diff, rg, cat,
  npm run typecheck allowed). No edits, no commits, no installs.
- Findings concrete: file:line, failing scenario, why wrong. Rank by
  severity. Explicitly clear each of the six priorities if nothing found.

## Validation commands (binding gates)

- Read-only compliance: `git -C /Users/thomascarney/Projects/powerplunge
  status --porcelain` shows no new changes attributable to you at the end
  (pre-existing planning/ dirt is not yours).
- Zero commits: HEAD unchanged from the commit you started at (director
  loop-state commits may land concurrently; the gate is that YOU created
  none).
- Report completeness: all six priorities covered by findings or
  explicitly cleared.

## Final report

JSON per the standard schema. Findings in code_review.findings with
severity major/minor; decision_needed only for genuine director-level
calls. next_step_suggestion: what the director should do before opening
the chunk PR.
