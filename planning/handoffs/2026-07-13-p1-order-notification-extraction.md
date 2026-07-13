# Packet: P1 — extract sendOrderNotification into order-notification.service

Lane: implementation

## Context (self-contained; verified 2026-07-13)

Repo: /Users/thomascarney/Projects/powerplunge, branch
refactor/complete-the-money-path (from main @ 7621f7d), clean tree expected.
VERIFIED by execution: `npm run with:local-auth-env -- npm run test:unit`
exit 0 on this baseline. VERIFIED by inspection:

- /Users/thomascarney/Projects/powerplunge/server/src/routes/public/payments.routes.ts:1276
  `export async function sendOrderNotification(orderId: string)` (~180 lines,
  loads settings/order/customer/items from storage, sends customer
  confirmation via `customerEmailService.sendOrderConfirmation(orderId)`
  (dynamic import), then a fulfillment/admin notification email with inline
  HTML; logs successes/failures; never throws to callers).
- Same file :1189 `await sendOrderNotification(order.id);` (direct call) and
  :976-977 injects it into `createOrderFinalizationService({...})`.
- /Users/thomascarney/Projects/powerplunge/server/src/routes/webhooks/stripe.routes.ts
  :5 `import { sendOrderNotification } from "../public/payments.routes";`
  used at :10 and :15 to build finalization services.
- /Users/thomascarney/Projects/powerplunge/server/src/services/order-finalization.service.ts
  :54 dep type `sendOrderNotification: (orderId: string) => Promise<void>;`
  used at :205; factory params at :266/:296 pass it through.
- Existing tests: server/src/services/__tests__/order-finalization.service.test.ts
  (16.8K) injects its own stub — must stay green untouched.

## Goal

A `server/src/services/order-notification.service.ts` owns the post-payment
notification obligation (customer confirmation + fulfillment notification);
the finalization factory defaults to it so neither route injects it anymore;
the webhook router no longer imports anything from a route file. Proof: the
full unit suite is green and the webhook route has zero imports from
`../public/payments.routes`.

## Scope and non-goals

In scope:
- /Users/thomascarney/Projects/powerplunge/server/src/services/order-notification.service.ts (new)
- /Users/thomascarney/Projects/powerplunge/server/src/services/__tests__/order-notification.service.test.ts (new)
- /Users/thomascarney/Projects/powerplunge/server/src/routes/public/payments.routes.ts
- /Users/thomascarney/Projects/powerplunge/server/src/routes/webhooks/stripe.routes.ts
- /Users/thomascarney/Projects/powerplunge/server/src/services/order-finalization.service.ts (factory default only)
- /Users/thomascarney/Projects/powerplunge/docs/architecture/refactor-programs/complete-the-money-path/HANDOFF.md (State + slice status only)

Non-goals (forbidden):
- Any change to pricing/coupon/affiliate logic in payments.routes.ts (chunk 2 owns it).
- Any change to the paid-state guards at payments.routes.ts:936-965 (slice 2 owns them).
- Renaming order-claim.service (slice 3 owns it).
- No behavior change inside the moved function beyond import-path fixes; the
  email content, logging, and error swallowing stay byte-equivalent in intent.
- No new npm deps, no schema changes, no new routes.

## Exact implementation steps

1. This slice is behavior-preserving. BEFORE moving code, run the
   characterization baseline: `npm run with:local-auth-env -- npm run
   test:unit` must be green (it is at HEAD; re-verify).
2. Create order-notification.service.ts; move the entire
   `sendOrderNotification` function body verbatim from
   payments.routes.ts:1276-1457, including its inline HTML email and its
   helper usage; fix relative imports (`../../services/...` becomes `./...`
   etc.). Export `sendOrderNotification` with the unchanged signature
   `(orderId: string) => Promise<void>`.
3. In order-finalization.service.ts, make the factory param
   `sendOrderNotification` OPTIONAL, defaulting to the new service's
   function (static import). Keep the explicit dependency type and override
   so existing tests keep injecting stubs unchanged.
4. payments.routes.ts: delete the moved function; import the service
   function for the direct call at :1189; remove `sendOrderNotification`
   from the factory call at :976-977 (rely on the default).
5. stripe.routes.ts: remove the `../public/payments.routes` import; remove
   the injected `sendOrderNotification` at both factory calls (rely on the
   default).
6. Write __tests__/order-notification.service.test.ts asserting OBSERVABLE
   behavior only, with external seams (storage, customerEmailService, email
   transport) stubbed at their public interfaces:
   - missing order: resolves without sending anything and without throwing.
   - happy path: customer confirmation attempted for the order id, and the
     fulfillment notification email is attempted with the order's data
     (assert recipient/subject/order id fields reach the email seam).
   - email failure: function resolves (never throws), failure is logged.
   FORBIDDEN test shapes: HTML-body snapshots, asserting internal call
   order, asserting private helpers, mocking modules the test then
   re-implements. A test that would break on a further rename/move without
   behavior change is wrong.
7. Update the program HANDOFF.md State section (this slice done, next slice
   = paid-state guard dedupe) per its existing format; rewrite in place.

## Validation commands (binding gates)

- `npm run typecheck` -> exit 0
- `npm run with:local-auth-env -- npm run test:unit` -> exit 0
- `rg -c 'from "\.\./public/payments\.routes"' /Users/thomascarney/Projects/powerplunge/server/src/routes/webhooks/stripe.routes.ts` -> exit 1 (zero matches)
- `rg -c 'sendOrderNotification' /Users/thomascarney/Projects/powerplunge/server/src/services/order-notification.service.ts` -> at least 1 match (function lives there)
- ONE commit on refactor/complete-the-money-path (code + HANDOFF.md update
  together), clean tree. Do NOT push.
- After code-review fixes: re-run the FULL gate set before final JSON; if
  you cannot return to green, commit nothing and report the exact failing
  assertion plus your partial diff.

## Edge cases / failure modes

- The moved function uses a dynamic import of customer-email.service; keep
  the dynamic import if a static one creates an import cycle — check and
  report which you chose.
- If defaulting the factory dep creates an import cycle
  (order-finalization -> order-notification -> storage -> ...), fall back to
  a lazy default (dynamic import inside the default function) and say so in
  the report; do NOT reintroduce route-level injection.
- payments.routes.ts may re-export sendOrderNotification for other
  consumers you find; search first (`rg 'payments\.routes'` across server/)
  and fix every importer; report the list.
- Never force-green: if a characterization test fails after the move, the
  move changed behavior — fix the move, not the test.

## Hard rules

- No push, deploy, merge, production mutation, real Stripe charge, or real
  email. E2E email uses outbox mode; e2e suites are diagnostic here, not a
  gate.
- Never print secrets. Touch NOTHING outside Scope. If the diff exceeds 600
  lines excluding tests, STOP and propose a split in the final JSON.

## Rollback

Revert the single commit; no state outside git.
