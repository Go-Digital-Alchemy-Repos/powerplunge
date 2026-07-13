# Codex Traps — PowerPlunge loop incident law

Inherited generic traps from the core-platform loop (numbers preserved
because planning/scripts/lint-packet.mjs cites them). Append
PowerPlunge-specific traps as they occur, numbered from 100.

- Trap 1 (L8): db-read lanes must carry the RLS warning — an empty result
  is not an absent row.
- Trap 3 (L4): e2e suites referenced in packets need a "diagnostic / not a
  gate" caveat; full e2e is a chunk-gate/CI concern.
- Trap 4: never accept Codex's self-reported validation — the director
  re-runs every binding gate by execution.
- Trap 6: warn packets about gitignored state when worktrees are possible.
- Trap 16 (L5/L6): packets are self-contained; never "re-read the prior
  packet"; continuations use the delta format.
- Trap 19 (L13): visual lanes need a computed hard gate (DOM/hash/HTTP);
  perception tools are last-resort.
- Trap 25 (L3): plain `npm install` fails with ERESOLVE; use `npm ci` or
  the pinned install form.
- Trap 27 (L1): workspace paths in packets are absolute.
- Trap 28 (L9): hostops lanes enumerate the mandated tool's call sites
  (command-surface evidence).

## Trap 100 (PowerPlunge, 2026-07-13): full-suite flake inside Codex sandbox

P6 run reported nondeterministic full-unit failures (cross-route HTTP
status flips: 200->404, 200->401, varying per retry) while focused tests
stayed green. Director reproduced the full suite GREEN twice on the same
diff. Suspect environment contention in the Codex sandbox (parallel vitest
workers + local auth env), not the diff. Law: when Codex reports
nondeterministic suite failures the director cannot reproduce, treat the
director's executed result as truth, land via a resume packet, and note
which suites flipped in case a pattern emerges.
