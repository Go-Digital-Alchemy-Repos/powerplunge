# Packet: P17 — chunk-3 review remediation: extract payment-failure alerting + dispatch hardening

Lane: implementation

## Current delta

Chunk-3 adversarial review (director-verified by reading the route this
session) found ONE blocking item: the payment_intent.payment_failed
handler in
/Users/thomascarney/Projects/powerplunge/server/src/routes/webhooks/stripe.routes.ts
(:106-126) still owns business mapping inline (PI fields ->
errorAlertingService.alertPaymentFailure payload + console.error
context). This packet extracts it behind a deps-injected service
operation, plus two small review follow-ups: (a) dispatch maps use
plain object literals, so inherited Object.prototype keys (e.g.
event.type "toString") resolve to truthy handlers — add an own-property
guard (or null-prototype maps) on BOTH endpoints' lookups so unknown
events take the exact unknown-event path; (b) add one route-level test
asserting payment_intent.payment_failed still alerts through the new
service wiring (route seam, not service internals).

## Preserved decisions

- BEHAVIOR-PRESERVING: same console.error message and object shape,
  same alertPaymentFailure payload mapping (incl. receipt_email ||
  metadata.customerEmail fallback and "Payment failed" default), same
  200 ack; ack/dedupe semantics stay pinned (resolved D2 lands later).
- House idiom: deps-injected factory (per
  server/src/services/stripe-connect-webhook.service.ts); plain event
  data in (payment intent object), no Express types; errors behave
  exactly as today (currently NOT caught inside the branch — preserve:
  let them propagate to the route's existing handling).
- FROZEN: the 20 characterization cases in
  server/src/routes/webhooks/__tests__/stripe.routes.test.ts existing
  content — ADDITIVE ONLY for the new route-level test (this packet MAY
  append; it must NOT modify existing cases);
  server/src/routes/test/stripe-webhook.routes.ts untouched;
  handlePaymentIntentSucceededWebhook export unchanged.
- Scope: new server/src/services/stripe-payment-webhook.service.ts +
  its __tests__ file, stripe.routes.ts, stripe.routes.test.ts
  (append-only), and
  docs/architecture/refactor-programs/complete-the-money-path/HANDOFF.md
  (full State/Next Slice rewrite: remediation done, next = chunk-3 PR).
  Nothing else.

## Banked facts

- HEAD at fire time: c56b100 + director loop-state commits; baseline
  VERIFIED by execution: typecheck 0; unit 41 files / 330 tests green.
- Dispatch maps: main endpoint handlers at stripe.routes.ts:85, lookup
  :129-130; Connect endpoint handlers at :210 with its own lookup just
  below. Both are Partial<Record<string, WebhookEventHandler>> object
  literals.
- Existing service tests count: stripe-refund-webhook 15 cases,
  stripe-connect-webhook 10 cases (do not touch either).
- Suite flake law: planning/codex-traps.md trap 100 — one retry
  allowed, two failures = STOP, reproduced on both machines.

## Validation commands (binding gates)

- `npm run typecheck` -> exit 0
- `npm run with:local-auth-env -- npm run test:unit` -> exit 0 (trap-100
  one-retry rule as above)
- `git diff-tree --no-commit-id --name-only -r <your-commit>` lists ONLY
  the five in-scope files (planning/ worktree dirt is the director's).
- `git diff HEAD~1 -- server/src/routes/webhooks/__tests__/stripe.routes.test.ts`
  shows ONLY added lines (no deletions/modifications of existing cases;
  deleted-line count for that file = 0).
- `git diff HEAD~1 -- server/src/routes/test/stripe-webhook.routes.ts`
  -> empty output.
- New service test file has >= 4 `it(` cases at the public interface
  (happy-path mapping with orderId, missing orderId/email fallbacks,
  default error message, error propagation).
- ONE commit. Do NOT push.
- After code-review fixes: re-run the FULL gate set before final JSON.

## Rollback

Revert the single commit; no state outside git.
