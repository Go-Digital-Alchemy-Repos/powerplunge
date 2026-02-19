# Runtime Environment Detection

The server uses a centralized runtime detection module (`server/src/config/runtime.ts`) to identify which environment the app is running in and apply the correct defaults.

## Supported Environments

| Environment | How detected | Backend port | Auth | Dotenv |
|---|---|---|---|---|
| **Replit Deployment** | `REPLIT_DEPLOYMENT` set, or Replit + `NODE_ENV=production` | 5000 (from `PORT`) | Replit OIDC | No (Replit secrets) |
| **Replit Workspace** | `REPL_ID` set + not production | 5000 (from `PORT`) | Replit OIDC | No (Replit secrets) |
| **Local / Codex Cloud** | No Replit env vars | 5001 (default) | Disabled or dev stub | Yes (.env files) |
| **CI** | `CI=true` | — | — | Yes |

## Detection Logic

```
isReplit       = REPL_ID or REPLIT_DEPLOYMENT or REPLIT_URL or REPLIT_DB_URL or REPLIT_DEV_DOMAIN
isReplitDeploy = REPLIT_DEPLOYMENT or (isReplit + production)
isReplitWork   = isReplit and not deploy
isLocal        = not isReplit and not CI
```

## Auth Behavior

- **On Replit**: Full OIDC auth via `setupAuth()` using `REPL_ID`.
- **Locally (default)**: Auth routes return `503 Auth not configured`. Protected routes remain blocked (fail closed).
- **Locally with `ENABLE_DEV_AUTH=true`**: A dev auth stub is active. `/api/login` auto-logs in as a dev user. Useful for testing authenticated flows without Replit.

## Dotenv Loading

`server/src/config/load-env.ts` is imported as the **very first** import in `server/index.ts`. When `shouldLoadDotenv` is true (i.e., not on Replit), it loads:

1. `.env.local` (highest priority, git-ignored)
2. `.env.development`
3. `.env` (lowest priority)

Files are loaded with `override: false`, so earlier files take precedence.

## Runtime Flags

| Flag | Description |
|---|---|
| `runtime.isReplit` | Running inside any Replit environment |
| `runtime.isReplitDeployment` | Running as a Replit production deployment |
| `runtime.isReplitWorkspace` | Running in the Replit editor/workspace |
| `runtime.isLocal` | Not Replit, not CI |
| `runtime.isCI` | CI environment |
| `runtime.shouldLoadDotenv` | Should load .env files |
| `runtime.shouldEnableReplitOIDC` | Should set up Replit OIDC auth |
| `runtime.enableDevAuth` | Dev auth stub is active |
| `runtime.shouldTrustProxy` | Should set Express `trust proxy` |
| `runtime.defaultBackendPort` | Resolved port for backend |

## Files

- `server/src/config/runtime.ts` — detection and flags
- `server/src/config/load-env.ts` — conditional dotenv loading
- `server/src/config/local-auth-stub.ts` — local dev auth stub + disabled routes
