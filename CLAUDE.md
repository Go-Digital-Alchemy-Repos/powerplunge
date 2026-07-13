# PowerPlunge Project Instructions (loop law)

Single-repo project: this repo doubles as the loop WORKSPACE
(collapsed from the core-platform two-repo pattern). `planning/`
holds loop state, packets, scripts, templates; commit loop state
every cycle. Truth precedence: repo git state >
`docs/architecture/refactor-programs/<slug>/HANDOFF.md` >
`planning/loop/loop-state.md`.

## Workflow Contract

Architecture work follows
`.agents/skills/powerplunge-refactor-program/SKILL.md`
(program -> chunk -> slice -> gate -> handoff). In loop mode,
one packet = ONE slice; Claude owns the big-picture review,
handoff refresh, chunk gate, and next-packet drafting; the
packet carries the slice implementation and its TDD gate.

## Operating Mode: Continuous Loop

Same cycle as the core-platform contract: author decision-complete
packet (planning/templates/) -> fire at Codex (background) ->
verify independently (triage with
`node planning/scripts/verify-codex-report.mjs $RUN_DIR`, then
re-run the packet's binding gates yourself) -> update
`planning/loop/` -> chain without approval unless a stop
condition fires.

Fire command (from repo root):

```bash
CODEX_PACKET_LINT=$PWD/planning/scripts/lint-packet.mjs \
CODEX_EXTRA_ARGS='-m gpt-5.6-sol -c model_reasoning_effort="medium"' \
~/.claude/skills/codex-handoff/scripts/codex-handoff.sh <packet> $PWD
```

Model policy (Tommy 2026-07-13): implementation and research
packets fire gpt-5.6-sol at medium effort; adversarial reviews
(packet pre-fire reviews, chunk-gate reviews) fire at high
("large"); escalate to xhigh only when a review's biggest bet is
unusually load-bearing, and say why. Sandbox:
`danger-full-access` when validation needs the localhost server
or Postgres; `read-only` for research and review lanes.

## Branch and Delivery Policy

- Program work happens on `refactor/<program-slug>`, never
  directly on main.
- Autonomous: commits on that branch (one per packet, HANDOFF.md
  included), pushing that branch, opening the chunk PR.
- The chunk PR's CI run (`pr-checks.yml`) is a BINDING gate: red
  PR = remediation packet before any new mutating packet.
- Gated on explicit user approval: merging to main, pushing
  main, deploys, anything in the Stop Conditions below.

## Stop Conditions (queue the decision, notify, end turn)

Global defaults plus:

- Stripe live mode, real email (anything beyond outbox mode),
  production database URLs, secrets changes.
- Merge to main or any deploy.
- Schema changes or new architectural surfaces not named by the
  current slice (see the skill's Rules section).
- Verification divergence twice on the same packet.
- The packet reveals the chunk plan is wrong, not merely
  incomplete.

## Token Economy (Tommy 2026-07-13)

Fable quota is limited. Codex is the workhorse: groundwork,
research, and diff-reading go into packets (read-only lanes for
research), not Claude subagents. Claude verifies mechanically
(targeted commands, exit codes, counts) instead of pulling large
files/diffs into context; caveman narration in-loop; no optional
dead-time passes (research-recon) unless asked.

## State Discipline

LIVE-ONLY files in `planning/loop/` (git history is the archive):
`loop-state.md` (rewrite each cycle), `journal.md` (append via
`planning/scripts/log.sh`), `decisions-pending.md` (resolved
entries deleted), `assumptions.md` (fuel for `research-recon`
during in-flight dead time), `findings-waived.md` (review-lane
waivers). Incident law: `planning/codex-traps.md` (inherited
generic traps; append PowerPlunge-specific ones as they occur).
