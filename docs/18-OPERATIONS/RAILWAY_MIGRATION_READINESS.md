# Railway Migration Readiness

Date: 2026-06-22
Updated: 2026-06-23

This runbook tracks the first-pass Railway migration checks for moving Power Plunge runtime toward Railway + Neon Postgres + Cloudflare R2.

## Scope

Safe in this phase:

- Inventory Railway service config and variable names.
- Compare required app configuration against local 1Password-backed reference files.
- Validate Neon schema and R2 credential coverage without printing values.
- Prepare exact variable mapping and apply order.

Out of scope until explicit confirmation:

- Cloudflare DNS changes.
- Stripe webhook URL changes.
- Switching Stripe active mode to live.

## Railway Target

| Field | Value |
|---|---|
| Project | `Power Plunge` |
| Project ID | `eb3ef762-70c0-4bfe-bc0f-f02b8dc66fc7` |
| Environment | `production` |
| Environment ID | `b72125e3-ac62-41f1-863b-798ce54c990e` |
| Service | `powerplunge` |
| Service ID | `7b6c695e-08dd-4c61-be16-051639145382` |

Current service inventory:

- Source repo: `Go-Digital-Alchemy-Repos/powerplunge`
- Builder: `RAILPACK`
- Build command: `npm run build`
- Start command: `npm run start`
- Status: `SUCCESS`
- Current deployment ID: verify with `railway service status --json` before action.
- Sleep when inactive: disabled by `railway.json` after the next successful config-as-code deploy
- Healthcheck path: `/api/health` by `railway.json` after the next successful config-as-code deploy
- App health endpoint: `/api/health`

## Current Readiness

| Area | Status | Notes |
|---|---|---|
| Required env names | Present in Railway | `DATABASE_URL`, `SESSION_SECRET`, generic Stripe vars, `APP_SECRETS_ENCRYPTION_KEY`, R2 vars, `PUBLIC_SITE_URL`, and `BASE_URL` are configured by name. |
| Railway health | Ready for dry-run smoke | Confirmed redeploy on 2026-06-22 picked up the staged Neon `DATABASE_URL`; `/api/health` returns HTTP 200 with DB connected. |
| Neon project | Ready | Project `powerplunge`, branch `main`, database `powerplunge`, Postgres 17. |
| Neon schema | Ready for schema-only dry run | Schema verifier passes against the migration target; seed/content data is not migrated. |
| Cloudflare R2 refs | Staged in Railway | Required R2 ref names resolve through `.env.cloudflare.local` and are now configured on Railway with `--skip-deploys`. |
| Stripe env model | DB-first dry run staged | Runtime Stripe uses DB settings first. Neon has test mode active, with test and live Stripe values staged in encrypted DB fields. Generic Railway Stripe vars remain fallback-only and should not be relied on for cutover. |
| Stripe primary webhook secret | Rotated | Historically exposed primary PowerPlunge signing secret was rotated in Stripe Workbench on 2026-06-22; Neon now has an encrypted DB-stored live webhook secret. |
| Stripe primary webhook endpoint | Not ready | The primary `https://powerplunge.com/api/webhook/stripe` destination exists under the Nano-Shield Stripe account, but it is currently disabled. |
| Public URL config | Staged in Railway | `PUBLIC_SITE_URL` and `BASE_URL` are set to the Railway dry-run URL with `--skip-deploys`; update to the canonical domain only during DNS cutover. |
| Auth migration | Partially ready | Customer profile and affiliate routes no longer depend on mount-level Replit OIDC, and local smoke confirms unauthenticated `/api/customer/profile` returns HTTP 401 quickly. Full production auth remains a separate migration slice. |

## Variable Mapping

Use stdin or Railway dashboard masked fields for secret values. Do not pass secret values in shell arguments.

First-pass variable staging completed on 2026-06-22 with `--skip-deploys`; the variable staging did not trigger a Railway restart or deployment. A later confirmed restart reused the existing deployment snapshot and did not pick up the staged `DATABASE_URL`. The confirmed redeploy `3cb9858c-2866-4944-94e6-f9cc44e0a844` picked up the staged database variable.

### Database

| Railway var | Source ref | Action |
|---|---|---|
| `DATABASE_URL` | `.env.neon.local` -> `DATABASE_URL_NEON_POOLED` | Use for Railway web runtime. |

Notes:

- Keep `DATABASE_URL_NEON_DIRECT` for migrations, dumps, restores, and admin tasks.
- The app uses `pg.Pool` with a max of 20 connections in `server/db.ts`.

### Core Runtime

| Railway var | Source | Action |
|---|---|---|
| `SESSION_SECRET` | Current Railway or existing secret manager source | Preserve unless intentionally invalidating all sessions. |
| `APP_SECRETS_ENCRYPTION_KEY` | Current Railway or existing secret manager source | Preserve if production DB contains encrypted integration settings. |
| `PUBLIC_SITE_URL` | Railway dry-run URL first, final custom domain after DNS cutover | Required for canonical URLs, CORS allowlist, email links, and build-time meta images. |
| `BASE_URL` | Same as `PUBLIC_SITE_URL` | Required by one Stripe checkout path. |
| `CORS_ALLOWED_ORIGINS` | Canonical site URLs | Add only if cross-origin admin/customer flows need more than `PUBLIC_SITE_URL`. |
| `IP_HASH_SALT` | New secret manager value | Set before production cutover to avoid default affiliate IP hash salt. |

Do not set Replit detection vars on Railway: `REPL_ID`, `REPLIT_DEPLOYMENT`, `REPLIT_URL`, `REPLIT_DB_URL`, `REPLIT_DEV_DOMAIN`.

### Stripe

Stripe is DB-first at runtime. Environment variables are only a fallback for payment API keys when usable Stripe settings are absent from the database. The primary `/api/webhook/stripe` route uses the DB-stored webhook secret only, with no env fallback.

Before cutover, verify or update the DB Stripe settings through the admin integration flow:

- Active mode must be `live`.
- Live publishable key and live secret key must be present.
- Live webhook secret must be present and newly rotated.
- `APP_SECRETS_ENCRYPTION_KEY` must match the DB-encrypted values.

Current first-pass state:

- Neon has `integration_settings.id = main`, `stripe_active_mode = test`, and encrypted test and live Stripe API/webhook values.
- Railway dry-run still serves the test publishable key from `/api/stripe/config`.
- Stripe Workbench shows the primary PowerPlunge endpoint under Nano-Shield, and that endpoint is disabled as of 2026-06-22.

Recommended Railway fallback mapping:

| Railway var | Source | Action |
|---|---|---|
| `STRIPE_MODE` | Literal | Set to `live` only after DB live-mode settings are verified. |
| `STRIPE_SECRET_KEY_LIVE` | Stripe / 1Password | Fallback for payment API calls if DB Stripe settings are absent. |
| `STRIPE_PUBLISHABLE_KEY_LIVE` | Stripe / 1Password | Fallback for client publishable key if DB Stripe settings are absent. |
| `STRIPE_WEBHOOK_SECRET_LIVE` | Stripe / 1Password | Does not configure the primary webhook route; DB live webhook secret is required. |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | Stripe / 1Password or DB settings | Required only for Stripe Connect webhook route. |

Important:

- The historically exposed primary Stripe webhook secret has been rotated; do not publish raw pre-rotation diffs or logs that contain the old value.
- Do not change Stripe webhook endpoint URLs until the Railway domain passes smoke tests.
- Setting Railway Stripe env vars alone is not sufficient for production cutover when DB Stripe settings exist.

### Cloudflare R2

| Railway var | Source ref |
|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | `.env.cloudflare.local` |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | `.env.cloudflare.local` |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | `.env.cloudflare.local` |
| `CLOUDFLARE_R2_BUCKET_NAME` | `.env.cloudflare.local` |

These are required for env-based media storage on Railway unless valid R2 credentials already exist in DB integration settings.

### Optional Integrations

| Railway var(s) | When needed |
|---|---|
| `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_WEBHOOK_SIGNING_KEY` | Transactional email and inbound support email fallback if DB settings are absent. |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `TWILIO_VERIFY_SERVICE_SID` | SMS fallback if DB settings are absent. |
| `VITE_GA_MEASUREMENT_ID`, `GA_SERVICE_ACCOUNT_EMAIL`, `GA_SERVICE_ACCOUNT_PRIVATE_KEY`, `GA4_PROPERTY_ID` | Client analytics and admin analytics fallback. |
| `META_SYSTEM_USER_TOKEN`, `META_ACCESS_TOKEN`, `META_APP_SECRET`, `META_PIXEL_ID`, `META_DATASET_ID`, `META_CATALOG_ID`, `META_PRODUCT_FEED_ID`, `META_TEST_EVENT_CODE`, `META_CATALOG_FEED_KEY`, `META_CAPI_ENABLED` | Meta catalog/CAPI fallback if DB settings are absent. |

### Better Auth

Keep these unset or false until the auth migration is intentionally planned:

- `USE_BETTER_AUTH`
- `VITE_USE_BETTER_AUTH`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_BASE_URL`
- `APP_URL`

Railway production auth is still a migration blocker because Replit OIDC does not apply outside Replit. Customer token-auth routes can run on Railway; any remaining Replit-only customer/admin flows need separate migration decisions.

## Apply Order After Confirmation

1. Confirm target URL for the dry-run service. Done for the Railway-provided URL.
2. Set Railway database and core variables with `--skip-deploys`. Done for `DATABASE_URL`, `PUBLIC_SITE_URL`, and `BASE_URL`.
3. Add R2 vars to Railway. Done with `--skip-deploys`.
4. Verify DB Stripe live-mode API keys and add Railway Stripe fallback vars.
5. Disable sleep and configure `/api/health` healthcheck if Railway should be treated as a production standby. Done in `railway.json`; verify after next deploy.
6. Trigger one explicit deployment after config or runtime-pin changes.
7. Run smoke tests against Railway domain. Done after the auth fix: health, public endpoints, admin auth enforcement, customer profile auth failure, and Stripe config returned expected statuses.
8. Only after smoke tests pass, plan DNS and Stripe webhook endpoint cutover.
9. Enable or replace the primary Stripe webhook destination only during the coordinated cutover.

## Safe Command Templates

These templates are for a confirmed config-change window only. They avoid printing secret values and skip automatic deploys.

```bash
op run --env-file=.env.neon.local -- sh -c 'test -n "$DATABASE_URL_NEON_POOLED" || { echo "DATABASE_URL_NEON_POOLED missing" >&2; exit 1; }; printf "%s" "$DATABASE_URL_NEON_POOLED" | railway variable set DATABASE_URL --stdin --project eb3ef762-70c0-4bfe-bc0f-f02b8dc66fc7 --environment b72125e3-ac62-41f1-863b-798ce54c990e --service 7b6c695e-08dd-4c61-be16-051639145382 --skip-deploys'
```

```bash
op run --env-file=.env.cloudflare.local -- sh -c 'for key in CLOUDFLARE_ACCOUNT_ID CLOUDFLARE_R2_ACCESS_KEY_ID CLOUDFLARE_R2_SECRET_ACCESS_KEY CLOUDFLARE_R2_BUCKET_NAME; do value=$(printenv "$key"); test -n "$value" || { echo "$key missing" >&2; exit 1; }; printf "%s" "$value" | railway variable set "$key" --stdin --project eb3ef762-70c0-4bfe-bc0f-f02b8dc66fc7 --environment b72125e3-ac62-41f1-863b-798ce54c990e --service 7b6c695e-08dd-4c61-be16-051639145382 --skip-deploys; done'
```

Use the Railway dashboard or a similar stdin pattern for Stripe and app secrets. Do not place those values in command arguments.

## Verification Commands

After a confirmed deploy:

```bash
curl -fsS https://powerplunge-production.up.railway.app/api/health
SMOKE_BASE_URL=https://powerplunge-production.up.railway.app npx tsx scripts/smoke/apiSmoke.ts
op run --env-file=.env.neon.local -- npx tsx scripts/db/verifySchema.ts
```

Expected first successful Railway health state:

- HTTP 200 from `/api/health`
- DB status connected
- Public smoke endpoints do not return 500
- R2 upload/read flows work through admin media routes or a targeted media smoke

## Remaining Blockers

- Railway service must be redeployed after the Node 22 `.nvmrc` and `railway.json` changes, then smoke-tested again.
- Production data/content has not been migrated into Neon.
- Stripe primary webhook endpoint is disabled in Stripe Workbench.
- Neon DB has Stripe test mode active, with live values staged but inactive.
- Railway auth path needs a separate production decision.
- Public R2 upload routes need auth/rate-limit review before production cutover.
- Content parity between source and Neon still needs read-only count comparison.
- Node runtime pinning is normalized in the repo via `.nvmrc`; verify Railway build metadata resolves Node 22 after the next deploy.
