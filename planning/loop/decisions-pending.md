# Decisions Pending (delete entries when resolved; git history keeps them)

## D3 — arch-report adversarial review fallout (2026-07-13, RUN_DIR
20260713-142745-2026-07-13-arch-report-adversarial-review; findings
director-verified by execution)

Review verdict: program direction sound, A/D landed faithfully, chunk
ordering right. But five money-path risks the report missed + one drift
need Tommy calls:

1. Refund pagination: charge.refunded iterates only embedded
   charge.refunds.data (stripe-refund-webhook.service.ts:76, no
   has_more handling); refund.updated ignores unknown local refunds.
   >10 refunds on a charge silently drop. Recommend: fold into the D2
   closeout slice as binding.
2. Stripe idempotency: refund key embeds Date.now()
   (refund.service.ts:84) so retries are never idempotent; checkout /
   reprice PI creates pass no key at all. Recommend: follow-on slice or
   explicit deferral, decide before program closeout.
3. B incomplete: /reprice-payment-intent (payments.routes.ts:457-783)
   still owns pricing/coupon/affiliate/Stripe mutation inline outside
   checkout.service. Declare B partially-complete and schedule follow-on,
   or extend chunk scope.
4. Unpaid-order notifications: manual-fallback path creates a PENDING
   order and immediately fires sendOrderNotification
   (checkout.service.ts:~576) — fulfillment notified of unpaid orders,
   contra ADR-0001 payment-authority language. Needs a product call
   (order-received notice vs suppress).
5. E posture unrealized: no repository was carved en route (storage.ts
   still 2,067 lines); either name a repository packet or record E as
   explicitly deferred at closeout.

Report corrections (no decision, folded into closeout docs): C's
"exact duplicate" claim was wrong (route kept status/orderId checks the
service lacked — landed fix is the SAFER one, keep it); B's "zero
tests" overstated (baseline E2E existed); E method count stale (236 not
~120); "pure dispatch" promise should read "thin transport adapter";
finalization-claim terminology conflation in C.

(D1 resolved 2026-07-13: Tommy approved program "Complete the money
path", chunks A+C+D -> B -> F, grilling decisions delegated to director.) (D1 resolved 2026-07-13: Tommy approved program "Complete the money
path", chunks A+C+D -> B -> F, grilling decisions delegated to director.)

(D2 RESOLVED 2026-07-13: Tommy approved (b) conditional on a Stripe-docs
check; R3 verdict SUPPORTED-WITH-CHANGES, director spot-checked citations
by execution. Final spec lives in loop-state "D2 resolved spec"; lands as
post-chunk-3 behavior-changing slice(s).)
