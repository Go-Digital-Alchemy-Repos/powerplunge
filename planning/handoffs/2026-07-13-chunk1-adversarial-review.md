# Packet: Chunk 1 adversarial review — small unlocks (P1+P2+P3)

Lane: review

READ-ONLY: no edits, no commits; final JSON report only. Before reporting
a finding, check
/Users/thomascarney/Projects/powerplunge/planning/loop/findings-waived.md
and do not re-raise anything already waived there (it is currently empty;
cite it as checked in your report).

## Context (self-contained; verified by director 2026-07-13)

Repo: /Users/thomascarney/Projects/powerplunge, branch
refactor/complete-the-money-path. Review the chunk diff:

```
git diff d366cef..eadfffb
```

(d366cef = branch baseline; three packet commits on top: d0c7528 P1,
860ee7e P2, eadfffb P3. Ignore everything under
/Users/thomascarney/Projects/powerplunge/planning/ in any diff; loop
bookkeeping is out of review scope.)

Chunk intent (program: Complete the Money Path, chunk 1 "small unlocks"):

- P1: moved `sendOrderNotification` (~180 lines) verbatim from
  server/src/routes/public/payments.routes.ts into new
  server/src/services/order-notification.service.ts; the
  order-finalization factory now defaults the dep;
  server/src/routes/webhooks/stripe.routes.ts no longer imports from a
  route module. New test:
  server/src/services/__tests__/order-notification.service.test.ts.
- P2: confirm-payment (payments.routes.ts POST /confirm-payment) stopped
  re-implementing order-not-found/amount/currency guards; it calls
  finalizeStripePaymentIntent and maps skipped reasons
  (order_not_found/missing_order_id -> 404, amount_mismatch -> 400,
  currency_mismatch -> 400) to the pre-existing HTTP contract. Two narrow
  route-level compatibility pre-guards were kept to preserve today's exact
  behavior: (a) checkout_session PaymentIntents get route-level
  amount/currency 4xx because the service intentionally skips them before
  its gates; (b) an uppercase-currency ("USD") request preserves the old
  order -> amount -> currency error precedence. 10 new characterization
  tests in server/src/routes/public/__tests__/payments.routes.test.ts.
  Also: admin orders.routes.ts imports the notification service directly;
  the payments.routes compatibility re-export is gone.
- P3: renamed order-claim.service.ts -> account-linking.service.ts
  (claimOrdersByEmail -> linkOrdersToCustomerByEmail, ClaimResult ->
  OrderLinkResult, log prefix [ACCOUNT-LINKING]); CONTEXT.md gained an
  "Account linking" entry so "claim" stays reserved for the Finalization
  claim; docs/ECOMMERCE_SYSTEM_PROMPT.md updated.

Verified by director (do not re-litigate, but you may contradict with
evidence): typecheck exit 0; unit suite 37 files / 236 tests green;
grep gates for import decoupling and vocabulary pass; one commit per
packet; git diff --check clean.

## Your job: try to break this chunk

Adversarial review. Hunt for real defects, not style. Priorities:

1. BEHAVIOR DRIFT in the money path. P1 claimed a verbatim move: diff the
   moved notification code against its previous in-route body (git show
   d366cef:server/src/routes/public/payments.routes.ts) and hunt for
   semantic differences (import binding, error swallowing, settings
   fallbacks, dynamic-vs-static import timing, module-level state).
2. confirm-payment HTTP contract: enumerate request/PI states (missing
   order, wrong metadata, checkout_session flow, uppercase currency,
   amount mismatch combinations, already-paid orders, Meta tracking
   present/absent) and check the new mapping + pre-guards reproduce the
   OLD code's response and side effects for every one. Pay attention to
   ordering: old code guarded BEFORE finalization; new code lets the
   service run first for some states — find any state where finalization
   (markOrderPaidIfPending, obligations, notification) now happens when
   it previously could not, or vice versa.
3. Webhook path: stripe.routes.ts factory calls now rely on the default
   notification dep. Confirm the default wiring cannot create an import
   cycle or a lazy-init race, and that webhook finalization still sends
   notifications exactly once.
4. TEST QUALITY (binding program rule): new tests must assert observable
   behavior at public interfaces only. Flag any test that would break on
   a further rename/move without behavior change, any HTML-body
   snapshot, internal call-order assert, or mock that re-implements the
   module under test. Also flag characterization tests that pin behavior
   so accidental it should instead be simplified (candidate already on
   record: the uppercase-USD precedence shim — give a recommendation:
   keep, simplify in chunk 2, or simplify now).
5. Rename completeness: any residual "order-claim"/claimOrdersByEmail
   references anywhere (client/, docs/, scripts/, e2e/) the grep gates
   missed; any log-consumer or dashboard that keyed on [ORDER-CLAIM].
6. Anything that would fail pr-checks.yml (typecheck, build, db:push,
   seeds, verifySchema, unit tests, critical E2E) that unit tests alone
   would not catch — especially the build step (client imports, path
   aliases) and the critical E2E specs under e2e/.

## Constraints

- READ-ONLY. Execute only non-mutating commands (git show/diff, rg, cat,
  npm run typecheck if desired). No file edits, no commits, no test-file
  changes, no npm installs.
- Findings must be concrete: file:line, the failing scenario, and why it
  is wrong. No "consider"-grade advice. Rank by severity. If you find
  nothing at a tier, say so explicitly.

## Validation commands (binding gates)

- Read-only compliance: `git -C /Users/thomascarney/Projects/powerplunge
  status --porcelain` shows NO new changes attributable to you at the end
  (pre-existing planning/loop dirt is not yours; do not touch it).
- Zero commits made: `git -C /Users/thomascarney/Projects/powerplunge log
  --oneline -1` still shows the same HEAD you started from.
- Report completeness: every finding carries file:line + concrete failing
  scenario; each of the six review priorities above is either covered by
  findings or explicitly cleared in the report.

## Final report

JSON per the standard schema. Put findings in code_review.findings with
severity major/minor; use decision_needed only for genuine
director-level calls. next_step_suggestion: what the director should do
before opening the chunk PR.
