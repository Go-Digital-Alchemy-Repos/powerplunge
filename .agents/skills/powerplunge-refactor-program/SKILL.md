---
name: powerplunge-refactor-program
description: Run a PowerPlunge architecture refactor program - plan chunks and slices, or execute the next TDD-protected slice from the program handoff.
disable-model-invocation: true
argument-hint: "plan <goal> | run [handoff-path]"
---

# PowerPlunge Refactor Program

Architecture work runs as a **program** of **chunks** and **slices**:

- **Program** - the full architecture improvement effort.
- **Chunk** - a merge-worthy milestone with one coherent architectural goal.
- **Slice** - one small implementation step, protected by focused tests, committed on its own.
- **Gate** - a review checkpoint before a slice commits or a chunk is called merge-ready.
- **Handoff** - the durable state file; the single source of truth for the next slice.

The handoff lives at `docs/architecture/refactor-programs/<program-slug>/HANDOFF.md` and is committed with every slice. One file per program, rewritten in place; git history is the archive. Never create timestamped copies.

Pick the branch:

- `plan` - no handoff exists for this program, or new evidence invalidated the plan.
- `run` - a handoff exists; execute its Next Slice.

## Plan branch

Use `improve-codebase-architecture` for the architecture review. It already reads `CONTEXT.md` and `docs/adr/` and supplies the deepening vocabulary (module, interface, seam, depth, locality); use that vocabulary in the plan.

1. Run the review and pick the target module or seam with the user.
2. Split the program into chunks. Each chunk gets one coherent architectural goal and must be merge-worthy on its own.
3. Split the first chunk into slices. Classify every slice **behavior-changing** or **behavior-preserving**.
4. Write the handoff (format below).

Done when the handoff's Next Slice is executable by a worker reading only the handoff and the files it names, without redoing the architecture review. If you cannot write the Next Slice that concretely, the slicing is not finished.

## Run branch

Loop mode (default): when the `codex-handoff` loop drives this branch, Claude directs and Codex implements. The packet carries steps 1-5 and 7; Claude owns step 6 (big-picture verification replaces the worker-side gate; Codex's standard code-review pass still runs per the loop preamble), steps 8-9, and step 10 is replaced by the loop's chaining rule: fire the next slice packet without asking unless a stop condition applies (see repo `CLAUDE.md`). Thread mode below remains the fallback for one-off interactive slices.

1. Read the handoff, applicable `AGENTS.md`, and every file the Next Slice names. Confirm `git status`: clean, or only known unrelated work that must be preserved untouched.
2. If the seam, interface, repo convention, test strategy, or external behavior is uncertain, spawn read-only research subagents before writing code. Do not guess.
3. Implement with `tdd` at the slice level:
   - Behavior-changing slice: one red test - observe it fail - then green, then refactor.
   - Behavior-preserving slice: identify or add characterization coverage at the public interface first; move code only once that coverage is green. Never refactor while red.
4. Stay inside the chunk. If evidence shows the plan (not just the slice) is wrong, stop and report; do not improvise a new plan mid-slice.
5. Run the Next Slice's check commands from the handoff. All green before review.
6. Run the review gate from `handoff-implementation-thread` (independent read-only subagents, APPROVE / FIX / RESEARCH). Proceed only on APPROVE.
7. Commit the slice unless explicitly forbidden, including the handoff update from step 8.
8. Refresh the handoff: rewrite State and Next Slice in place. Replace, don't append.
9. If this slice completes a chunk, run the chunk gate below before calling the chunk done.
10. Ask exactly: `Start a new PowerPlunge slice thread from <handoff-path>?` On an explicit yes, create the thread per `handoff-implementation-thread`, pointing the worker prompt at the handoff and this skill's `run` branch. Never create a thread without that yes.

## Chunk gate

When the last slice of a chunk lands, run the fixed floor:

- all the chunk's slice tests, plus affected route/service/storage tests
- `npm run typecheck`
- `git diff --check`

Then add risk-based checks selected from `docs/09-TESTING/SCRIPTS.md`, and browser/E2E only when user-facing flows changed. State which checks you selected and which you skipped, with the reason. Finish with an independent read-only review of the full chunk diff for chunk-level regressions.

The chunk is done when every listed check ran green and the chunk review is APPROVE.

## Handoff format

```markdown
# Refactor Program: <name>

## Program

Goal, target module/seam, link to the architecture review artifact.

## Chunks

Ordered list with status (pending / in progress / done).

## Current Chunk Slices

Ordered list with status; each slice classified behavior-changing or behavior-preserving.

## State

Last verified result: commit hash, checks that ran, review outcome.

## Next Slice

- Files: exact paths to touch.
- Classification: behavior-changing or behavior-preserving.
- Test: the red test to write, or the characterization coverage to secure.
- Checks: the commands that prove the slice done.

## Risks / Constraints

Only entries that bind the next slice.
```

## Rules

- Prefer existing ownership boundaries, but refactor them deliberately. Deepen modules by moving behavior behind smaller interfaces and improving locality. Add new seams, tables, route families, services, dependencies, or architectural surfaces only when the handoff, tests, or research gate makes the need explicit.
- Use domain language from `CONTEXT.md` and `docs/adr/`; do not re-litigate accepted ADRs inside a slice.
- Prefix shell commands with `rtk`.
- Local dev protocol: `npm run dev`, `npm run local:urls`, no fallback ports.
- For Checkout or order-finalization work, do not add an obligation ledger schema unless the Next Slice says so explicitly.
- No push, deploy, merge, production mutation, real Stripe charge, or real email without explicit approval.
- No secrets in prompts, logs, tests, docs, commits, or summaries. Do not revert unrelated user changes.
