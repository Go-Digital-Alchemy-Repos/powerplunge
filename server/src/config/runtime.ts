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

const isLocal = !isReplit && !isCI;

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
        : "Local / Codex";
  console.log(`[RUNTIME] Environment: ${env} (NODE_ENV=${runtime.nodeEnv})`);
}
