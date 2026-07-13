# PowerPlunge Repo Instructions

## Localhost Testing Protocol

- Use `npm run dev` for local development.
- Use `npm run local:urls` for the browser URL.
- Do not choose fallback ports. If the configured port is busy, identify and stop the owner or report the conflict.

## Access Policy for Codex Runs

- Autonomous: repo file edits, local dev/test Postgres, test fixtures and
  seeded dev users, commits on `refactor/*` program branches (one commit
  per packet). Codex never pushes; the director pushes after independent
  verification.
- Gated on explicit user approval: merge or push to main, deploys,
  Stripe live mode, real email (anything beyond `E2E_EMAIL_MODE=outbox`),
  production database URLs, secrets changes, new npm dependencies, schema
  changes not named by the current packet.
- Sandbox defaults: `danger-full-access` when validation needs the
  localhost server or Postgres (workspace-write blocks localhost DB
  sockets); `read-only` for research and review lanes.
- E2E suites are diagnostic during packets, not binding gates; binding
  E2E runs happen at the chunk gate and in PR CI.
- No secrets in prompts, logs, tests, docs, commits, or reports.
