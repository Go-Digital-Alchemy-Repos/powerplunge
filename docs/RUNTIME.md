# Runtime Environment Detection

The server uses a centralized runtime detection module (`server/src/config/runtime.ts`) to identify which environment the app is running in and apply the correct defaults.

## Supported Environments

| Environment | How detected | Backend port | Auth | Dotenv |
|---|---|---|---|---|
| **Replit Deployment** | `REPLIT_DEPLOYMENT` set, or Replit + `NODE_ENV=production` | 5000 (from `PORT`) | Replit OIDC | No (Replit secrets) |
| **Replit Workspace** | `REPL_ID` set + not production | 5000 (from `PORT`) | Replit OIDC | No (Replit secrets) |
| **Codex Web** | `CODEX_SANDBOX=1` or `CODEX_ENV=web` (no Replit vars) | 5001 (default) | Disabled or dev stub | Yes (.env files) |
| **Codex Local** | `CODEX=1` without sandbox/web flag (no Replit vars) | 5001 (default) | Disabled or dev stub | Yes (.env files) |
| **Local** | No Replit, Codex, or CI env vars | 5001 (default) | Disabled or dev stub | Yes (.env files) |
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

- **On Replit**: Full OIDC auth via `setupAuth()` using `REPL_ID`.
- **Non-Replit (default)**: Auth routes return `503 Auth not configured`. Protected routes remain blocked (fail closed).
- **Non-Replit with `ENABLE_DEV_AUTH=true`**: A dev auth stub is active. `/api/login` auto-logs in as a dev user. Useful for testing authenticated flows without Replit.

## Dotenv Loading

`server/src/config/load-env.ts` is imported as the **very first** import in `server/index.ts`. When `shouldLoadDotenv` is true (i.e., not on Replit), it loads:

1. `.env.local` (highest priority, git-ignored)
2. `.env.development`
3. `.env` (lowest priority)

Files are loaded with `override: false`, so earlier files take precedence. Dotenv loading applies to all non-Replit environments: Codex Web, Codex Local, Local, and CI.

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
| `runtime.shouldEnableReplitOIDC` | Should set up Replit OIDC auth |
| `runtime.enableDevAuth` | Dev auth stub is active |
| `runtime.shouldTrustProxy` | Should set Express `trust proxy` |
| `runtime.defaultBackendPort` | Resolved port for backend |

## Files

- `server/src/config/runtime.ts` — detection and flags
- `server/src/config/load-env.ts` — conditional dotenv loading
- `server/src/config/local-auth-stub.ts` — dev auth stub + disabled routes
