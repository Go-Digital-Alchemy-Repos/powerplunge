# Quick Start — Local Development

This guide covers running Power Plunge outside Replit (Local, Codex Web, or Codex Local). See [RUNTIME.md](./RUNTIME.md) for environment detection details.

## Prerequisites

- Node.js 20+
- PostgreSQL database (local or remote)
- npm

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

- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — any random string (32+ chars)
- `STRIPE_SECRET_KEY` — Stripe test key
- `STRIPE_PUBLISHABLE_KEY` — Stripe test publishable key
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook secret

## 3. Push database schema

```bash
npm run db:push
```

## 4. Run the app

### Option A: npm scripts (most portable)

```bash
# Backend + frontend together
npm run dev:all

# Or separately:
npm run dev:local      # backend on port 5001
npm run dev:client:local  # frontend on port 5002
```

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

Visit `http://localhost:5002` for the frontend (proxied to backend on 5001).

## Auth in local dev

By default, auth routes return "not configured" and protected routes are blocked.

To enable a simple dev auth stub:

```bash
# Add to your .env
ENABLE_DEV_AUTH=true
```

With this set, `/api/login` auto-logs you in as a dev user. This is useful for testing authenticated flows.

## Seed test users (optional)

```bash
npm run seed:dev-users
```

## Run Playwright E2E (optional)

For local/Codex runs, enable the dev auth stub so admin session routes work:

```bash
ENABLE_DEV_AUTH=true npx playwright test
```

Playwright base URL defaults:

- Replit (`REPL_ID` set): `http://localhost:5000`
- Local/Codex: `http://localhost:5001`

You can override with `E2E_PORT` or `E2E_BASE_URL`.

## Available local scripts

| Script | Description |
|---|---|
| `npm run dev:local` | Backend on port 5001 |
| `npm run dev:client:local` | Frontend on port 5002 |
| `npm run dev:all` | Both together via concurrently |
| `npm run setup:local` | Ensure placeholder assets exist |
| `npm run db:push` | Push database schema |
| `npm run seed:dev-users` | Seed test users |

## Troubleshooting

- **Vite crashes on missing assets**: Run `npm run setup:local`
- **Database connection fails**: Check your `DATABASE_URL` in `.env`
- **Port already in use**: Change `PORT` in `.env` or use different ports
- **Auth errors**: Make sure `SESSION_SECRET` is set. For local auth, set `ENABLE_DEV_AUTH=true`
