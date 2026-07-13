# Packet: P3 — split "claim" vocabulary: rename order-claim.service to account-linking language

Lane: implementation

## Context (self-contained; verified by director 2026-07-13)

Repo: /Users/thomascarney/Projects/powerplunge, branch
refactor/complete-the-money-path (P2 landed as 860ee7e). Baseline VERIFIED by
execution: `npm run typecheck` exit 0; `npm run with:local-auth-env -- npm run
test:unit` green (37 files / 236 tests).

The word "claim" means two unrelated things in this codebase:

1. Domain concept (CONTEXT.md:19-20): the **Finalization claim** — a durable
   claim that one process owns finalizing an Order (implemented by
   `order-finalization.service.ts` + `storage.markOrderPaidIfPending`).
2. /Users/thomascarney/Projects/powerplunge/server/src/services/order-claim.service.ts
   (1.8K): `claimOrdersByEmail(activeCustomerId, rawEmail, source)` — on
   customer auth events it reassigns orders belonging to OTHER customer rows
   with the same normalized email to the active customer, and marks those
   donor customers `mergedIntoCustomerId`. This is account linking, not a
   finalization claim. It exports `interface ClaimResult { claimed, orderIds }`
   and logs with an `[ORDER-CLAIM]` prefix.

VERIFIED complete list of references outside the service file itself:

- /Users/thomascarney/Projects/powerplunge/server/src/routes/customer/auth.routes.ts
  :7 import; call sites :147 (register), :194 (login), :249 (magic-link),
  :382 (password-reset), :407 (session) — all fire-and-forget `.catch(...)`.
- /Users/thomascarney/Projects/powerplunge/server/src/routes/customer/__tests__/auth.routes.test.ts
  :46, :58-59, :90-91 — mocks the module path
  `../../../services/order-claim.service`.

## Goal

The account-linking behavior no longer uses "claim" vocabulary anywhere
(filename, exports, types, log prefix), and CONTEXT.md disambiguates the two
concepts so the Finalization claim owns the word. Proof: typecheck + full
unit suite green; zero matches for the old filename and old export names
under server/src; CONTEXT.md documents both concepts.

## Scope and non-goals

In scope:
- server/src/services/order-claim.service.ts -> rename via `git mv` to
  server/src/services/account-linking.service.ts
- server/src/routes/customer/auth.routes.ts (import + 5 call sites)
- server/src/routes/customer/__tests__/auth.routes.test.ts (mock path + names)
- /Users/thomascarney/Projects/powerplunge/CONTEXT.md (add an
  "Account linking" entry; keep the Finalization claim entry authoritative)
- docs/architecture/refactor-programs/complete-the-money-path/HANDOFF.md
  (State + slice status; mark chunk 1 slices ALL done; set Next Slice to
  "chunk 1 gate: adversarial review + PR" per the existing format)

Non-goals (forbidden):
- ANY behavior change: the reassignment/merge logic, transaction shape, and
  fire-and-forget call pattern stay byte-equivalent in intent.
- No changes to order-finalization.service.ts, storage, or schema.
- No new tests required; this is a pure rename (module-path mock updates in
  the existing test file are mechanical, not new coverage).
- No new npm deps, routes, or services beyond the renamed file.

## Exact implementation steps

1. Behavior-preserving: run the characterization baseline first
   (`npm run with:local-auth-env -- npm run test:unit` green at HEAD).
2. `git mv server/src/services/order-claim.service.ts
   server/src/services/account-linking.service.ts`.
3. Rename inside the file: `claimOrdersByEmail` ->
   `linkOrdersToCustomerByEmail`; `ClaimResult` -> `OrderLinkResult` with
   field `claimed` -> `linkedCount` (internal-only type; verify by search no
   other file names these); log prefix `[ORDER-CLAIM]` ->
   `[ACCOUNT-LINKING]`, keep the same logged fields.
4. Update auth.routes.ts import and 5 call sites; update the test file's
   mock path and mock property names. NOTHING else about the tests changes.
5. CONTEXT.md: add an "Account linking" entry near the Finalization claim
   entry: linking reassigns pre-auth orders (same normalized email) to the
   authenticated customer and marks donor customer rows merged; explicitly
   note it is unrelated to the Finalization claim.
6. HANDOFF.md: State + slice statuses (P3 done, chunk 1 slices complete);
   Next Slice block describes the chunk 1 gate (adversarial review packet +
   branch push + PR — executed by the director, not a Codex packet).

## Validation commands (binding gates)

- `npm run typecheck` -> exit 0
- `npm run with:local-auth-env -- npm run test:unit` -> exit 0
- `rg -c 'order-claim' /Users/thomascarney/Projects/powerplunge/server/src --glob '!**/dist/**'` -> zero matches (exit 1)
- `rg -c 'claimOrdersByEmail' /Users/thomascarney/Projects/powerplunge/server/src` -> zero matches (exit 1)
- `rg -c 'Account linking' /Users/thomascarney/Projects/powerplunge/CONTEXT.md` -> at least 1 match
- ONE commit on refactor/complete-the-money-path (rename recorded as a git
  rename, code + CONTEXT.md + HANDOFF.md together), packet-scoped paths
  clean. Do NOT push. Pre-existing dirt under
  /Users/thomascarney/Projects/powerplunge/planning/loop/ is NOT yours;
  leave it untouched and do not count it against cleanliness.
- After code-review fixes: re-run the FULL gate set before final JSON; if you
  cannot return to green, commit nothing and report the exact failing
  assertion plus your partial diff.

## Edge cases / failure modes

- If search reveals additional references to the old names (client/, docs/,
  scripts/), update them too and list them in the report; the "complete list"
  above was verified but trust your own search.
- If any test asserts the `[ORDER-CLAIM]` log prefix or the `claimed` field
  name, that is a behavior-adjacent surface: keep `claimed` as the field name
  in that case (rename only the type/function/file) and report the conflict
  instead of silently expanding scope.
- Do not rename the CONTEXT.md Finalization-claim vocabulary; it keeps the
  word "claim".

## Hard rules

- No push, deploy, merge, production mutation, real Stripe charge, or real
  email. E2E suites are diagnostic here, not a gate.
- Never print secrets. Touch NOTHING outside Scope. If the diff exceeds 600
  lines excluding tests, STOP and propose a split in the final JSON.

## Rollback

Revert the single commit; no state outside git.
