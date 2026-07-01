# Quick Start — Local Development

This guide covers running Power Plunge outside Replit (Local, Codex Web, or Codex Local). See [RUNTIME.md](./RUNTIME.md) for environment detection details.

## Prerequisites

- Node.js 20+
- Local PostgreSQL database
- npm
- 1Password CLI (`op`) if hydrating `.env.test.local`

## 1. Clone and install

```bash
git clone <repo-url>
cd power-plunge
npm install
```

The `postinstall` hook automatically creates placeholder image assets needed by the frontend.

## 2. Create your .env file

```bash
cp .env.example .env
```

Edit `.env` with your values. At minimum you need:

- `DATABASE_URL` — local PostgreSQL connection string, for example `postgres://thomascarney@localhost:5432/powerplunge`
- `STRIPE_SECRET_KEY` — Stripe test key
- `STRIPE_PUBLISHABLE_KEY` — Stripe test publishable key
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook secret
- `BETTER_AUTH_SECRET` — random secret for Better Auth sessions

Use `.env` as the active local/Codex runtime file. Local development should point at local Postgres by default. Keep backup copies of secrets in 1Password. Do not put Neon production, Railway production, or legacy Replit production database credentials in `.env`.

Use Neon only when you deliberately run an ops/deploy command with `.env.neon.local`, for example:

```bash
op run --env-file=.env.neon.local -- npm run db:push
```

## 3. Push database schema

```bash
npm run db:push
```

## 4. Run the app

Use the repo script as the source of truth for local URLs:

```bash
npm run local:urls
```

### Option A: npm scripts (most portable)

```bash
# App server with Vite middleware on port 5011 by default
npm run dev

# Optional separate Vite client server
npm run dev:client:local  # client on port 5012
```

`npm run dev` respects existing `PORT`, `BETTER_AUTH_BASE_URL`, and `PUBLIC_SITE_URL` values. Without overrides, it uses `http://powerplunge.localhost` and direct URL `http://localhost:5011`.

### Option B: Makefile

```bash
make dev            # backend + frontend together
make dev-server     # backend only
make dev-client     # frontend only
```

### Option C: One-time setup shortcut

```bash
make setup    # npm install + copy .env.example
# or
npm run setup:local   # ensure assets exist
```

## 5. Open the app

Visit `http://powerplunge.localhost` when Caddy is running, or `http://localhost:5011` directly. Do not pick fallback ports for local app testing; if `5011` is busy, identify the listener and stop it or report the conflict.

## Auth in local dev

Local auth uses Better Auth seed accounts. For local Postgres defaults, run auth-sensitive commands through:

```bash
npm run with:local-auth-env -- <command>
```

For automated local checks against an isolated Neon test branch, create an ignored 1Password template and hydrate the local test env:

```bash
cp env.test.local.example .env.test.local.template
# Replace placeholders with local-test 1Password refs and host pin.
npm run env:test:hydrate
```

The hydrated `.env.test.local` is git-ignored, written with mode `0600`, and is loaded by `with:local-auth-env` / `with:test-env` before command defaults are applied. Remote test databases must set `LOCAL_TEST_DATABASE=true` and `LOCAL_TEST_DATABASE_HOST` to the exact expected host; otherwise local mutating commands refuse to run.

## Seed test users (optional)

```bash
npm run seed:dev-users:local
npm run verify:seed-auth:local
```

## Run Playwright E2E (optional)

```bash
npm run test:e2e:local
```

Playwright base URL defaults:

- Replit (`REPL_ID` set): `http://localhost:5000`
- Local/Codex: `http://localhost:5001`

You can override with `E2E_PORT` or `E2E_BASE_URL`. Playwright starts its own test-mode server when needed, so payment/webhook E2E specs should be run through the local test scripts instead of against an already-running normal `npm run dev` server.

## Available local scripts

| Script | Description |
|---|---|
| `npm run dev` / `npm run dev:local` | App server with Vite middleware on port 5011 by default |
| `npm run dev:client:local` | Optional standalone Vite client on port 5012 |
| `npm run local:urls` | Print canonical local app URLs and Caddy file path |
| `npm run setup:local` | Ensure placeholder assets exist |
| `npm run db:push` | Push database schema |
| `npm run db:push:local` | Push schema through local-test env guard |
| `npm run seed:dev-users` | Seed test users |
| `npm run seed:dev-users:local` | Seed test users through local-test env guard |
| `npm run env:test:hydrate` | Hydrate ignored `.env.test.local` from `.env.test.local.template` |
| `npm run check:local` | Run local DB push, seed checks, typecheck, doctor, schema verification, unit tests, CMS generator test, and Playwright |

## Troubleshooting

- **Vite crashes on missing assets**: Run `npm run setup:local`
- **Database connection fails**: Check your `DATABASE_URL` in `.env`
- **Local test DB guard fails**: Hydrate `.env.test.local` and confirm `LOCAL_TEST_DATABASE_HOST` matches the database host exactly
- **Port already in use**: Local app testing expects `5011`; identify the existing listener and stop it or report the conflict
- **Auth errors**: Make sure `BETTER_AUTH_SECRET` is set, or run through `npm run with:local-auth-env -- <command>`.
