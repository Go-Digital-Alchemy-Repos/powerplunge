# Packet: P4 — chunk 1 review remediation (test/tooling findings)

Lane: implementation

## Current delta

Chunk 1 (P1 notification extraction d0c7528, P2 guard dedupe 860ee7e, P3
claim-vocabulary rename eadfffb) is implemented and director-verified
green. The adversarial chunk review found NO behavior defects; this packet
fixes its three remediable test/tooling findings before the chunk PR.
Nothing else from prior packets is open.

## Preserved decisions

- Uppercase-USD / checkout-session compatibility shims in
  payments.routes.ts STAY for chunk 1; simplification is a chunk-2 task.
- W1 waiver (findings-waived.md): the guard-placement characterizations in
  payments.routes.test.ts are out of scope for this packet.
- Test-quality law: observable behavior at public interfaces only.
- One commit per packet; Codex never pushes.

## Banked facts

- Baseline at HEAD: typecheck exit 0; unit suite 37 files / 236 tests
  green via `npm run with:local-auth-env -- npm run test:unit`.
- stripe.routes.ts no longer imports anything from payments.routes (P1).
- order-finalization.service.ts defaults its sendOrderNotification dep to
  the order-notification.service export via static import.

## Context (self-contained; verified by director 2026-07-13)

Repo: /Users/thomascarney/Projects/powerplunge, branch
refactor/complete-the-money-path (HEAD commits: eadfffb P3, then a
loop-state commit). Baseline VERIFIED by execution: `npm run typecheck`
exit 0; `npm run with:local-auth-env -- npm run test:unit` green (37 files
/ 236 tests). The chunk-1 adversarial review found no behavior defects but
three test/tooling gaps to fix before the chunk PR (a fourth finding was
waived, see
/Users/thomascarney/Projects/powerplunge/planning/loop/findings-waived.md
W1 — do NOT touch the uppercase-USD/checkout-session characterizations in
payments.routes.test.ts).

Findings to remediate, each VERIFIED by director inspection:

1. /Users/thomascarney/Projects/powerplunge/scripts/email-preview-audit.ts
   :76-86 `sourceScanPaths` still lists
   `server/src/routes/public/payments.routes.ts` but not
   `server/src/services/order-notification.service.ts`, where P1 moved the
   fulfillment email sender. The audit silently misses that sender now.
2. /Users/thomascarney/Projects/powerplunge/server/src/routes/webhooks/__tests__/stripe.routes.test.ts
   — mocks `../../public/payments.routes` (:47-49) exporting
   `sendOrderNotification`, but stripe.routes.ts no longer imports that
   module (P1 removed it); the finalization factory is ALSO fully mocked
   (:29-31), so any assertion involving mocks.sendOrderNotification is
   vacuous: deleting or miswiring the factory's default notification dep
   stays green.
3. /Users/thomascarney/Projects/powerplunge/server/src/services/__tests__/order-notification.service.test.ts
   :77-107 — asserts exact console wording via `vi.spyOn(console, ...)` and
   never restores the spies (no afterEach/mockRestore), so retained mock
   implementations can suppress diagnostics for later tests in the file.

## Goal

The email audit scans the notification service; webhook tests would FAIL if
the finalization factory's default notification dependency were deleted or
miswired; console spies are restored and log assertions no longer pin exact
prose. Full unit suite green.

## Scope and non-goals

In scope:
- /Users/thomascarney/Projects/powerplunge/scripts/email-preview-audit.ts
  (sourceScanPaths only)
- /Users/thomascarney/Projects/powerplunge/server/src/routes/webhooks/__tests__/stripe.routes.test.ts
- /Users/thomascarney/Projects/powerplunge/server/src/services/__tests__/order-notification.service.test.ts
- /Users/thomascarney/Projects/powerplunge/docs/architecture/refactor-programs/complete-the-money-path/HANDOFF.md
  (State only: note review remediation done, chunk 1 ready for PR)

Non-goals (forbidden):
- NO production-code changes anywhere (this packet is tests + one script
  list + handoff note).
- Do NOT touch payments.routes.test.ts (W1 waiver covers it).
- Do NOT restructure the webhook test file beyond what finding 2 needs.
- No new npm deps.

## Exact implementation steps

1. email-preview-audit.ts: add
   "server/src/services/order-notification.service.ts" to sourceScanPaths.
   Check whether payments.routes.ts still contains any email-sending code
   (`rg -n 'sendEmail|mailgun' server/src/routes/public/payments.routes.ts`);
   if it has none, remove its entry; if it still sends (e.g. other flows),
   keep it and say so in the report.
2. stripe.routes.test.ts: delete the stale
   `vi.mock("../../public/payments.routes", ...)` and the
   `sendOrderNotification` mock property. Replace the vacuous coverage so
   the DEFAULT notification seam is exercised: mock
   `../../../services/order-notification.service` (the module the
   finalization factory statically imports for its default) and keep the
   finalization-factory mock as-is ONLY if an assertion still proves the
   default dep reaches the factory; otherwise unmock the factory and let the
   real createOrderFinalizationService run against the existing storage
   mocks, asserting observable webhook behavior (response status + that the
   notification module's export was invoked for the finalized order id).
   Choose the smallest change that makes this true: a test must FAIL if
   order-finalization.service.ts stops defaulting sendOrderNotification to
   the notification service. State in the report which approach you took and
   why. Write the failing-first proof: temporarily verify (do not commit)
   that reverting the default makes your new/changed test red, then restore.
3. order-notification.service.test.ts: keep the behavioral outcomes but
   drop exact-prose log assertions — assert the seam outcomes instead
   (e.g. sendOrderConfirmation called; for the failure cases assert a
   console.log/console.error call HAPPENED with the failure detail using
   expect.stringContaining on the stable fragment, not full sentences).
   Add afterEach with vi.restoreAllMocks() (or explicit mockRestore of the
   console spies).
4. HANDOFF.md State: append one sentence that chunk-1 review remediation
   landed and the chunk is PR-ready.

FORBIDDEN test shapes: HTML-body snapshots, internal call-order asserts,
mocking modules the test re-implements. A test that breaks on a further
rename/move without behavior change is wrong.

## Validation commands (binding gates)

- `npm run typecheck` -> exit 0
- `npm run with:local-auth-env -- npm run test:unit` -> exit 0
- `rg -c 'public/payments\.routes' /Users/thomascarney/Projects/powerplunge/server/src/routes/webhooks/__tests__/stripe.routes.test.ts` -> exit 1 (zero matches)
- `rg -c 'order-notification\.service' /Users/thomascarney/Projects/powerplunge/scripts/email-preview-audit.ts` -> at least 1 match
- `git diff HEAD~1 --stat` (after your commit) shows NO files under
  server/src outside the two test files (no production-code drift).
- ONE commit on refactor/complete-the-money-path. Do NOT push. Pre-existing
  dirt under /Users/thomascarney/Projects/powerplunge/planning/loop/ is NOT
  yours; leave it untouched.
- After code-review fixes: re-run the FULL gate set before final JSON; if
  you cannot return to green, commit nothing and report the exact failing
  assertion plus your partial diff.

## Edge cases / failure modes

- If unmocking the finalization factory in stripe.routes.test.ts pulls in
  deps that make tests slow/flaky, fall back to the narrower approach:
  keep the factory mocked, and add a separate small test that imports
  createOrderFinalizationService directly and asserts its default
  notification dep is the notification service's export (public factory
  surface, not internals). Say so in the report.
- If exact-prose log assertions turn out to be load-bearing elsewhere
  (some consumer greps logs), report it instead of changing behavior; the
  [ACCOUNT-LINKING]/[ORDER-CLAIM] renames in P3 already established log
  prose is not a contract here.

## Hard rules

- No push, deploy, merge, production mutation, real Stripe charge, or real
  email. E2E suites are diagnostic here, not a gate.
- Never print secrets. Touch NOTHING outside Scope. If the diff exceeds 600
  lines excluding tests, STOP and propose a split in the final JSON.

## Rollback

Revert the single commit; no state outside git.
