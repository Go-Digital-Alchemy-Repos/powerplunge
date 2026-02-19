const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";
const isDevelopment = !isProduction;

const isReplit =
  !!process.env.REPL_ID ||
  !!process.env.REPLIT_DEPLOYMENT ||
  !!process.env.REPLIT_URL ||
  !!process.env.REPLIT_DB_URL ||
  !!process.env.REPLIT_DEV_DOMAIN;

const isReplitDeployment =
  !!process.env.REPLIT_DEPLOYMENT || (isReplit && isProduction);

const isReplitWorkspace = isReplit && !isReplitDeployment;

const isCI = !!process.env.CI;

// --- Codex environment detection ---
// Codex Web: the Codex cloud sandbox sets CODEX=1 (or CODEX_SANDBOX=1) and
// exposes an HTTP port via CODEX_PORT or similar networking. We detect it by
// the presence of CODEX_SANDBOX or the explicit CODEX_ENV=web override.
// Codex Local: CODEX=1 is set but not in the web sandbox (developer running
// the Codex CLI on their own machine).
// If neither env var is present, these flags are both false and the runtime
// falls through to the generic "Local" bucket.
const codexFlag = !!process.env.CODEX || !!process.env.CODEX_SANDBOX;
const isCodexWeb =
  !isReplit &&
  !isCI &&
  (!!process.env.CODEX_SANDBOX || process.env.CODEX_ENV === "web");
const isCodexLocal =
  !isReplit && !isCI && codexFlag && !isCodexWeb;

const isLocal = !isReplit && !isCI && !isCodexWeb && !isCodexLocal;

const shouldLoadDotenv = !isReplit;

const defaultBackendPort = process.env.PORT
  ? Number(process.env.PORT)
  : isReplit
    ? 5000
    : 5001;

const shouldTrustProxy = isReplitDeployment || isProduction;

const shouldEnableReplitOIDC =
  isReplit && !!process.env.REPL_ID;

const enableDevAuth =
  !isReplit &&
  isDevelopment &&
  process.env.ENABLE_DEV_AUTH === "true";

const publicSiteUrl = process.env.PUBLIC_SITE_URL || "";

export const runtime = {
  nodeEnv,
  isProduction,
  isDevelopment,
  isReplit,
  isReplitDeployment,
  isReplitWorkspace,
  isCI,
  isCodexWeb,
  isCodexLocal,
  isLocal,
  shouldLoadDotenv,
  defaultBackendPort,
  shouldTrustProxy,
  shouldEnableReplitOIDC,
  enableDevAuth,
  publicSiteUrl,
} as const;

let logged = false;
export function logRuntimeOnce(): void {
  if (logged) return;
  logged = true;
  const env = runtime.isReplitDeployment
    ? "Replit Deployment"
    : runtime.isReplitWorkspace
      ? "Replit Workspace"
      : runtime.isCI
        ? "CI"
        : runtime.isCodexWeb
          ? "Codex Web"
          : runtime.isCodexLocal
            ? "Codex Local"
            : "Local";
  console.log(`[RUNTIME] Environment: ${env} (NODE_ENV=${runtime.nodeEnv})`);
}
