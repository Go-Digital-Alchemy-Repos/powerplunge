# Environment Variables

This document lists all environment variables used by the Power Plunge server. Variables are validated at startup via `server/src/config/env-validation.ts`.

- **Production**: missing required vars throw an error and prevent startup.
- **Development**: missing required vars print a warning but the server continues.

## Required Variables

These must be set for the application to function. Production will not start without them.

| Variable | Feature | Description | Example |
|---|---|---|---|
| `DATABASE_URL` | Database | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `SESSION_SECRET` | Auth | Secret used to sign session cookies | `a-random-64-char-string` |
| `STRIPE_SECRET_KEY` | Payments | Stripe API secret key | `sk_live_...` or `sk_test_...` |
| `STRIPE_PUBLISHABLE_KEY` | Payments | Stripe publishable key (exposed to client) | `pk_live_...` or `pk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Payments | Stripe webhook signing secret | `whsec_...` |

## Optional Variables

Missing optional vars disable the associated feature with a warning at startup.

| Variable | Feature | Description | Example |
|---|---|---|---|
| `APP_SECRETS_ENCRYPTION_KEY` | Admin Settings | AES-256 key for encrypting stored secrets (e.g. Twilio auth token) | `base64-encoded-32-byte-key` |
| `MAILGUN_API_KEY` | Email | Mailgun API key for transactional emails | `key-...` |
| `MAILGUN_DOMAIN` | Email | Mailgun sending domain | `mg.powerplunge.com` |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | Media Storage (R2) | Cloudflare R2 access key ID | `...` |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | Media Storage (R2) | Cloudflare R2 secret access key | `...` |
| `CLOUDFLARE_R2_BUCKET_NAME` | Media Storage (R2) | Cloudflare R2 bucket name | `powerplunge-media` |
| `CLOUDFLARE_ACCOUNT_ID` | Media Storage (R2) | Cloudflare account ID for R2 endpoint | `...` |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | Affiliate Payouts | Stripe Connect webhook signing secret | `whsec_...` |
| `TWILIO_ACCOUNT_SID` | SMS | Twilio account SID for SMS verification | `AC...` |
| `TWILIO_AUTH_TOKEN` | SMS | Twilio auth token | `...` |
| `TWILIO_PHONE_NUMBER` | SMS | Twilio sender phone number | `+1234567890` |
| `BETTER_AUTH_SECRET` | Better Auth | Secret for Better Auth sessions (only if `USE_BETTER_AUTH=true`) | `a-random-string` |
| `IP_HASH_SALT` | Security | Salt for hashing IP addresses in analytics and fraud detection | `random-salt-string` |
| `CORS_ALLOWED_ORIGINS` | Security | Comma-separated additional allowed CORS origins in production | `https://admin.powerplunge.com,https://staging.powerplunge.com` |

## Build-Time Variables

These are used during `npm run build` only (not at runtime).

| Variable | Feature | Description | Example |
|---|---|---|---|
| `PUBLIC_SITE_URL` | SEO / Meta Tags | Canonical public URL for OpenGraph meta image URLs (preferred) | `https://www.powerplunge.com` |
| `VITE_PUBLIC_SITE_URL` | SEO / Meta Tags | Fallback for `PUBLIC_SITE_URL` | `https://www.powerplunge.com` |

The `vite-plugin-meta-images` plugin checks `PUBLIC_SITE_URL` first, then `VITE_PUBLIC_SITE_URL`. If neither is set, production builds print a warning and fall back to the Replit dev domain.

## Development / Testing Variables

These variables are used only in development (`NODE_ENV=development`). They are **never** read in production.

| Variable | Feature | Description | Example |
|---|---|---|---|
| `SEED_TEST_PASSWORD` | Dev Seed | Password used for all seeded test accounts (admin, customer, affiliate). Falls back to `testpass123` if unset. | `my-secret-test-pw` |

### Test user seeding

Run `npm run seed:dev-users -- --confirm` to create deterministic test users. The script:

- **Refuses to run** when `NODE_ENV=production`
- **Requires** the `--confirm` flag as a safety guard
- Reads `SEED_TEST_PASSWORD` for the shared password (default: `testpass123`)
- **Never logs plaintext passwords**
- Is idempotent — safe to run repeatedly

See `.agents/skills/playwright-testing/SKILL.md` for the full list of seeded accounts and Playwright usage instructions.

## Local / Codex Development Variables

These variables are only relevant when running outside Replit (Local, Codex Web, or Codex Local). See [RUNTIME.md](./RUNTIME.md) for environment detection details.

| Variable | Feature | Description | Example |
|---|---|---|---|
| `ENABLE_DEV_AUTH` | Local Auth | Set to `true` to enable a dev auth stub that auto-logs in. Default: disabled (fail closed). | `true` |

### Dotenv Loading

When running outside Replit, the server loads `.env` files automatically on startup. Files are loaded in this order (first match wins):

1. `.env.local` (git-ignored, your personal overrides)
2. `.env.development`
3. `.env` (shared defaults)

Copy `.env.example` to `.env` to get started: `cp .env.example .env`

## Informational Variables (set automatically)

| Variable | Feature | Description |
|---|---|---|
| `COMMIT_SHA` | Version endpoint | Git commit hash, returned by `GET /version` |
| `BUILD_TIME` | Version endpoint | Build timestamp, returned by `GET /version` |
| `NODE_ENV` | Core | `development` or `production` |
| `PORT` | Core | Server listen port (default `5000` on Replit, `5001` locally) |
