# Packet: R1 — chunk 2 research: map the checkout/create-payment-intent surface

Lane: research

READ-ONLY: no edits, no commits; final JSON report only.

## Context (self-contained; verified by director 2026-07-13)

Repo: /Users/thomascarney/Projects/powerplunge, branch
refactor/complete-the-money-path @ 511b0b3 (chunk 1 merged to main; branch
fast-forwarded). Program handoff:
/Users/thomascarney/Projects/powerplunge/docs/architecture/refactor-programs/complete-the-money-path/HANDOFF.md

Chunk 2 goal (approved program): extract the checkout flow —
`POST /create-payment-intent`
(/Users/thomascarney/Projects/powerplunge/server/src/routes/public/payments.routes.ts:232,
runs to roughly :578) — behind a deep service interface
(checkout.service.ts), so pricing, discounts (coupons, affiliate,
friends-and-family), tax, and order creation live in a service tested at
its public interface, and the route becomes thin transport. Related:
`POST /checkout` (Checkout Sessions, same file, starts near :1029) shares
pricing/discount logic and may share the same service; chunk 2 must decide
that boundary. Also inherited into chunk 2: W1 waiver
(/Users/thomascarney/Projects/powerplunge/planning/loop/findings-waived.md)
— the confirm-payment uppercase-USD/checkout-session compatibility shims
from chunk 1 should be simplified once checkout owns its own
amount/currency truths, and their pinning characterization tests
re-grounded.

## Your job (research only — produce facts and a slice proposal)

1. MAP the create-payment-intent handler end to end: every input, every
   storage/stripe/coupon/affiliate/tax call, every branch (guest vs
   customer, coupon vs affiliate vs friends-and-family, zero-amount edge,
   manual orders if reachable), every write (order rows, order items,
   coupon redemptions, affiliate sessions), and the response contract.
   Cite file:line for each.
2. MAP the overlap with POST /checkout (Checkout Sessions): which
   pricing/discount/order-creation logic is duplicated, byte-similar, or
   divergent (cite line ranges of each duplicated block). Note where the
   two flows intentionally differ.
3. INVENTORY existing test coverage touching either flow (unit + e2e spec
   names): what behavior is already characterized at public interfaces,
   what is uncovered (especially pricing/discount math edge cases).
4. LIST hidden couplings that will resist extraction: module-level state,
   dynamic imports, req/res leakage into business logic, storage calls
   that assume route context, transaction boundaries.
5. PROPOSE a slice decomposition for chunk 2 (3-6 slices, each one
   packet-sized, each behavior-preserving unless a red test is named
   first): ordering, per-slice files, per-slice characterization strategy,
   and where the W1 shim simplification lands. Flag the riskiest slice and
   why. State explicitly whether /checkout should share the new service in
   this chunk or wait for its own slice/chunk.

## Constraints

- READ-ONLY: non-mutating commands only (rg/cat/git show; `npm run
  typecheck` allowed). No edits, no commits, no installs.
- Facts must carry file:line citations. Distinguish VERIFIED (you read
  it) from INFERRED (you suspect it). No advice without a cited fact
  under it.
- Check /Users/thomascarney/Projects/powerplunge/planning/loop/findings-waived.md
  and do not contradict the W1 disposition; cite it as checked.

## Validation commands (binding gates)

- Read-only compliance: `git -C /Users/thomascarney/Projects/powerplunge
  status --porcelain` shows no changes attributable to you at the end.
- Zero commits: `git -C /Users/thomascarney/Projects/powerplunge log
  --oneline -1` still shows 511b0b3.
- Report completeness: all five numbered jobs above answered, each with
  citations; the slice proposal names files and gates per slice.

## Final report

JSON per the standard schema. Put the full survey in summary/notes fields
compactly; slice proposal in next_step_suggestion or a structured notes
field. No code_review pass needed (nothing to review); set
code_review.performed=false with reason research-lane.
