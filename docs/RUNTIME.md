# Runtime Environment Detection

The server uses a centralized runtime detection module (`server/src/config/runtime.ts`) to identify which environment the app is running in and apply the correct defaults.

## Supported Environments

| Environment | How detected | Backend port | Auth | Dotenv |
|---|---|---|---|---|
| **Replit Deployment** | `REPLIT_DEPLOYMENT` set, or Replit + `NODE_ENV=production` | 5000 (from `PORT`) | Better Auth | No (Replit secrets) |
| **Replit Workspace** | `REPL_ID` set + not production | 5000 (from `PORT`) | Better Auth | No (Replit secrets) |
| **Codex Web** | `CODEX_SANDBOX=1` or `CODEX_ENV=web` (no Replit vars) | 5001 (default) | Better Auth | Yes (.env files) |
| **Codex Local** | `CODEX=1` without sandbox/web flag (no Replit vars) | 5001 (default) | Better Auth | Yes (.env files) |
| **Local** | No Replit, Codex, or CI env vars | 5001 (default) | Better Auth | Yes (.env files) |
| **CI** | `CI=true` | — | — | Yes |

## Detection Logic

```
isReplit        = REPL_ID or REPLIT_DEPLOYMENT or REPLIT_URL or REPLIT_DB_URL or REPLIT_DEV_DOMAIN
isReplitDeploy  = REPLIT_DEPLOYMENT or (isReplit + production)
isReplitWork    = isReplit and not deploy
isCI            = CI=true
isCodexWeb      = not Replit, not CI, and (CODEX_SANDBOX=1 or CODEX_ENV=web)
isCodexLocal    = not Replit, not CI, CODEX=1, and not CodexWeb
isLocal         = not Replit, not CI, not CodexWeb, not CodexLocal
```

Precedence: Replit > CI > Codex Web > Codex Local > Local. The flags are mutually exclusive.

## Auth Behavior

Better Auth is the login surface in every runtime after the auth cutover. Admin routes use `/api/admin/auth/*`, customer routes use `/api/customer/auth/*`, and Better Auth core routes mount under `/api/auth/*` when `BETTER_AUTH_SECRET` is configured.

Local and Codex testing should use seeded Better Auth accounts. Run commands through `npm run with:local-auth-env -- <command>` or use the local scripts `verify:seed-auth:local` and `test:e2e:local-auth`.

## Dotenv Loading

`server/src/config/load-env.ts` is imported as the **very first** import in `server/index.ts`. When `shouldLoadDotenv` is true (i.e., not on Replit), it loads:

1. `.env` (standard local/Codex runtime file, git-ignored)
2. `.env.local` (legacy or personal fallback values)
3. `.env.development` (development fallback values)

Files are loaded with `override: false`, so earlier files take precedence. Dotenv loading applies to all non-Replit environments: Codex Web, Codex Local, Local, and CI. This repo treats `.env` as the normal active local/Codex env file. Local development should point `DATABASE_URL` at local Postgres by default. 1Password is the backup/source store for secret values. Neon env files are for explicit ops/deploy commands.

## Runtime Flags

| Flag | Description |
|---|---|
| `runtime.isReplit` | Running inside any Replit environment |
| `runtime.isReplitDeployment` | Running as a Replit production deployment |
| `runtime.isReplitWorkspace` | Running in the Replit editor/workspace |
| `runtime.isCodexWeb` | Running in a Codex cloud sandbox |
| `runtime.isCodexLocal` | Running via Codex CLI on a local machine |
| `runtime.isLocal` | Not Replit, not CI, not Codex |
| `runtime.isCI` | CI environment |
| `runtime.shouldLoadDotenv` | Should load .env files |
| `runtime.shouldTrustProxy` | Should set Express `trust proxy` |
| `runtime.defaultBackendPort` | Resolved port for backend |

## Files

- `server/src/config/runtime.ts` — detection and flags
- `server/src/config/load-env.ts` — conditional dotenv loading
