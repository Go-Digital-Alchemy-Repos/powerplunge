# Quick Start — Local Development

This guide covers running Power Plunge outside Replit (macOS, Linux, Codex Cloud).

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

## 3. Set up placeholder assets

The app references image assets in `attached_assets/` that live on Replit. For local dev, generate tiny placeholders:

```bash
npx tsx scripts/ensure-assets.ts
```

## 4. Push database schema

```bash
npm run db:push
```

## 5. Run the app

### Option A: Backend + Frontend together (recommended)

```bash
make dev
```

This runs the backend on port 5001 and frontend on port 5002.

### Option B: Separately

```bash
# Terminal 1 — backend
make dev-server

# Terminal 2 — frontend
make dev-client
```

### Option C: Without Make

```bash
npx concurrently --names server,client \
  "PORT=5001 NODE_ENV=development npx tsx server/index.ts" \
  "npx vite dev --port 5002"
```

## 6. Open the app

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

## Troubleshooting

- **Vite crashes on missing assets**: Run `npx tsx scripts/ensure-assets.ts`
- **Database connection fails**: Check your `DATABASE_URL` in `.env`
- **Port already in use**: Change `PORT` in `.env` or use different ports in Make commands
- **Auth errors**: Make sure `SESSION_SECRET` is set. For local auth, set `ENABLE_DEV_AUTH=true`
