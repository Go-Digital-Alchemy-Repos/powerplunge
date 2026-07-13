# Decisions Pending (delete entries when resolved; git history keeps them)

None open.

(D3 RESOLVED 2026-07-13: Tommy approved ALL director recommendations on
the arch-report adversarial review findings (RUN_DIR
20260713-142745-2026-07-13-arch-report-adversarial-review, findings
director-verified by execution). Binding spec for the driving lane:

1. D2 closeout slice EXPANDS to include, as binding red-first gates:
   (a) refund pagination — charge.refunded must paginate charge.refunds
   when has_more (today only embedded charge.refunds.data is read,
   stripe-refund-webhook.service.ts:76); characterize the >10-refund
   case; (b) stable refund idempotency key — drop Date.now() from
   refund.service.ts:84; key must identify the refund attempt stably
   (design note in packet: refund_{orderId}_{amount}_{attempt-identity},
   the packet author picks the attempt identity and says why).
2. NEW CHUNK 4 approved (program shape extension, Tommy 2026-07-13):
   complete B by extracting /reprice-payment-intent
   (payments.routes.ts:457-783: pricing, coupon, affiliate, Stripe PI
   update/recreate) into a repriceOrder operation on the existing
   checkout.service; add stable idempotency keys to checkout/reprice
   PaymentIntent + Checkout Session creates in the same chunk; plus the
   notification fix in (3). Runs AFTER the chunk-3 gate/PR/merge
   decision, BEFORE program closeout. Same slice discipline
   (characterize first; behavior-preserving extraction; behavior
   changes red-first).
3. Unpaid-order notifications (product ruling, Tommy 2026-07-13): on
   manual fallback (Stripe unconfigured, checkout.service.ts:~540-580)
   send the customer an "order received, payment pending" notice and
   SUPPRESS the fulfillment-ready notification until payment authority
   exists, per ADR-0001. Behavior-changing, red-first; rides chunk 4.
4. E (storage repositories) + atomic order-draft persistence: explicitly
   DEFERRED. Program closeout HANDOFF must record E as "deferred, not
   carved" (correcting the report's en-route posture) and name
   "checkout persistence atomicity + storage repositories" as the
   candidate follow-on program.
5. Report corrections fold into closeout docs: C's "exact duplicate"
   claim wrong (route-side status/orderId checks were NOT in the
   service; landed fix is the safer one, keep it); B's "zero tests"
   overstated (baseline E2E existed); E method count 236 not ~120;
   F promise reads "thin transport adapter with no event-specific
   business logic," not "pure dispatch"; fix finalization-claim vs
   paid-state-gate terminology per CONTEXT.md.

HANDOFF.md chunk list + Next Slice to be amended by the driving lane at
the next cycle boundary (worktree had in-flight P16 work when D3
resolved; director deliberately did not touch HANDOFF concurrently).)

(D1 resolved 2026-07-13: Tommy approved program "Complete the money
path", chunks A+C+D -> B -> F, grilling decisions delegated to director.)

(D2 RESOLVED 2026-07-13: Tommy approved (b) conditional on a Stripe-docs
check; R3 verdict SUPPORTED-WITH-CHANGES, director spot-checked citations
by execution. Final spec lives in loop-state "D2 resolved spec"; lands as
post-chunk-3 behavior-changing slice(s). D3 item 1 above EXPANDS the D2
slice scope.)
