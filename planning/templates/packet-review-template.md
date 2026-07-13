# Packet: <ID>-REVIEW — adversarial review of the <ID> packet (READ-ONLY)

Lane: review

<!--
AUTHORING RULES (delete this comment block from the real review packet):
- Fire with high effort (default; xhigh only for unusually load-bearing bets):
  CODEX_EXTRA_ARGS='-c model_reasoning_effort="high"' ~/.claude/skills/codex-handoff/scripts/codex-handoff.sh <this-file> <project-dir>
- The reviewer reviews a PACKET (a directive), not code. Its one job:
  find the flaw BEFORE a run burns on it.
- The two flaw classes that have actually bitten us, in order:
  1) internally contradictory plans (two binding gates that cannot both
     hold — RH.1's widened-sanitizer + byte-identical-parity);
  2) confidently wrong factual claims in Context (the dbFallback
     "object" claim — caught only because the reviewer was REQUIRED to
     check the claim against the real data).
  Every review must hunt both explicitly.
- When the review lands: verify its key claims YOURSELF before applying
  amendments (the reviewer can be wrong too), then amend, then fire.
-->

## Anti-abort guard

Final JSON only after the report file exists on disk with all sections
filled, or a tool-discovered blocker you can quote. This is a research lane:
NO code edits, NO commits, NO pushes; the only writes are the single
report file and the base-sync step in Hard rules (which may run only
after confirming the worktree is clean).

## Role

You are reviewing a PACKET (an implementation directive), not code. Find
the flaws that would burn a run: internal contradictions, wrong factual
claims, unsatisfiable gates, hidden scope, missing hooks for the packets
that come after it.

## Inputs (read these)

- The packet under review: <absolute path>
- The real data/code its claims rest on: <absolute paths; note "large —
  sample with node -e / jq, do not cat whole" where applicable>
- Repo context: <repo path + HEAD>; traps file:
  /Users/thomascarney/Projects/core-platform-work/planning/codex-traps.md

## Questions to answer adversarially (with evidence, not opinion)

1. Internal contradictions: can every binding gate pass SIMULTANEOUSLY?
   For each numeric/exit-code gate, PROVE satisfiability by actually
   running a throwaway check against the real inputs (throwaway scripts in
   /tmp only, never the repo). If any gate is unsatisfiable as written,
   name the exact gate and the evidence.
2. Factual claims: for every VERIFIED-marked claim in Context, re-verify it
   against the real data/code. For every unmarked assumption, test it.
   Classify each: VERIFIED / WRONG / UNVERIFIABLE (+ evidence).
3. Hidden scope: does the packet's "touch nothing else" hold, or do its own
   gates require config/CI/tsconfig/test-wiring edits it forbids? Check how
   the repo actually discovers the new files (test globs, tsconfig
   includes, CI workflow).
4. Coverage honesty: do the acceptance runs actually exercise the risky
   behavior, or only the happy path? Name what the gates do NOT cover.
5. Chain fit: does this packet's output foreclose anything the NEXT packets
   need (name the specific missing hook: provenance fields, identities,
   indexes)? Chain: <list the downstream packets and what they consume>.
6. Anything else that would make this packet fail on first fire.

Do a FULL pass: do not stop at the first killer defect — enumerate every
material flaw you can substantiate (a rev 2 folds them ALL in one pass).
Waived findings: read
/Users/thomascarney/Projects/core-platform-work/planning/loop/findings-waived.md
first; do not
re-raise entries there unless this packet introduces a NEW, materially
different problem in the same area (name the entry you are superseding).

## Validation commands (binding gates)

- `test -f <report path>` (the exact path from Output contract).
- The report contains all four sections (Verdict / Probe table / Amendments
  / Chain risks); every probe-table row carries literal command evidence
  (a row without a command is UNANSWERED and the verdict cannot be
  FIRE-AS-IS).
- Zero writes outside the report file (git status on every touched repo).

## Output contract

Write the report to: <absolute path under planning/research/>
Sections: Verdict (FIRE-AS-IS / FIRE-WITH-AMENDMENTS / REPLAN) —
Probe table (one row per question above: probe / verdict / the exact
command(s) run / evidence — no narrative rows; a probe without command
evidence is UNANSWERED, not passed) — Amendments (exact replacement text
per packet section, ready to paste) — Chain risks. Every claim cites a
file/row/command output. Final JSON must conform to the enforced schema
(/Users/thomascarney/.claude/skills/codex-handoff/assets/report-schema.json);
put the verdict and report path in its summary field.

## Hard rules

Read-only on all repos and data. No commits, no pushes, no DB, no SSH, no
network beyond the local filesystem — EXCEPT `git fetch origin main`
followed by `git reset --hard origin/main`, which is the single
permitted network operation and MUST be run before any probe (lesson
2026-07-05: a review lane obeyed a no-network rule over the fetch
instruction and reviewed a stale SHA, producing 5 phantom defects). If
the fetch fails or the expected base SHA named by the packet is still
unreachable afterward, STOP and report the blocker instead of reviewing
at the wrong SHA. Never print secret values. Throwaway scripts in /tmp
only.
