import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const REPLIT_VARS = [
  "REPL_ID",
  "REPLIT_DEPLOYMENT",
  "REPLIT_URL",
  "REPLIT_DB_URL",
  "REPLIT_DEV_DOMAIN",
];
const CODEX_VARS = ["CODEX", "CODEX_SANDBOX", "CODEX_ENV"];
const ALL_DETECTION_VARS = [
  ...REPLIT_VARS,
  ...CODEX_VARS,
  "CI",
  "NODE_ENV",
  "PORT",
  "ENABLE_DEV_AUTH",
];

let savedEnv: Record<string, string | undefined>;

function saveEnv() {
  savedEnv = {};
  for (const key of ALL_DETECTION_VARS) {
    savedEnv[key] = process.env[key];
  }
}

function restoreEnv() {
  for (const key of ALL_DETECTION_VARS) {
    if (savedEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = savedEnv[key];
    }
  }
}

function clearDetectionVars() {
  for (const key of ALL_DETECTION_VARS) {
    delete process.env[key];
  }
}

async function loadRuntime() {
  vi.resetModules();
  const mod = await import("../runtime");
  return mod.runtime;
}

describe("runtime environment detection", () => {
  beforeEach(() => {
    saveEnv();
    clearDetectionVars();
  });

  afterEach(() => {
    restoreEnv();
  });

  describe("Replit Deployment", () => {
    it("detects REPLIT_DEPLOYMENT", async () => {
      process.env.REPLIT_DEPLOYMENT = "1";
      process.env.REPL_ID = "abc";
      process.env.NODE_ENV = "production";
      const rt = await loadRuntime();
      expect(rt.isReplit).toBe(true);
      expect(rt.isReplitDeployment).toBe(true);
      expect(rt.isReplitWorkspace).toBe(false);
      expect(rt.isCodexWeb).toBe(false);
      expect(rt.isCodexLocal).toBe(false);
      expect(rt.isLocal).toBe(false);
      expect(rt.isCI).toBe(false);
      expect(rt.shouldEnableReplitOIDC).toBe(true);
      expect(rt.shouldLoadDotenv).toBe(false);
      expect(rt.shouldTrustProxy).toBe(true);
    });

    it("defaults port to 5000", async () => {
      process.env.REPLIT_DEPLOYMENT = "1";
      process.env.REPL_ID = "abc";
      const rt = await loadRuntime();
      expect(rt.defaultBackendPort).toBe(5000);
    });
  });

  describe("Replit Workspace", () => {
    it("detects REPL_ID in development", async () => {
      process.env.REPL_ID = "abc";
      process.env.NODE_ENV = "development";
      const rt = await loadRuntime();
      expect(rt.isReplit).toBe(true);
      expect(rt.isReplitDeployment).toBe(false);
      expect(rt.isReplitWorkspace).toBe(true);
      expect(rt.isCodexWeb).toBe(false);
      expect(rt.isCodexLocal).toBe(false);
      expect(rt.isLocal).toBe(false);
      expect(rt.shouldEnableReplitOIDC).toBe(true);
      expect(rt.defaultBackendPort).toBe(5000);
    });
  });

  describe("Codex Web", () => {
    it("detects CODEX_SANDBOX=1", async () => {
      process.env.CODEX_SANDBOX = "1";
      const rt = await loadRuntime();
      expect(rt.isCodexWeb).toBe(true);
      expect(rt.isCodexLocal).toBe(false);
      expect(rt.isLocal).toBe(false);
      expect(rt.isReplit).toBe(false);
      expect(rt.shouldLoadDotenv).toBe(true);
      expect(rt.defaultBackendPort).toBe(5001);
    });

    it("detects CODEX_ENV=web", async () => {
      process.env.CODEX = "1";
      process.env.CODEX_ENV = "web";
      const rt = await loadRuntime();
      expect(rt.isCodexWeb).toBe(true);
      expect(rt.isCodexLocal).toBe(false);
    });
  });

  describe("Codex Local", () => {
    it("detects CODEX=1 without sandbox flag", async () => {
      process.env.CODEX = "1";
      const rt = await loadRuntime();
      expect(rt.isCodexLocal).toBe(true);
      expect(rt.isCodexWeb).toBe(false);
      expect(rt.isLocal).toBe(false);
      expect(rt.isReplit).toBe(false);
      expect(rt.shouldLoadDotenv).toBe(true);
      expect(rt.defaultBackendPort).toBe(5001);
    });
  });

  describe("Local (plain)", () => {
    it("detects when no special vars are set", async () => {
      const rt = await loadRuntime();
      expect(rt.isLocal).toBe(true);
      expect(rt.isCodexWeb).toBe(false);
      expect(rt.isCodexLocal).toBe(false);
      expect(rt.isReplit).toBe(false);
      expect(rt.isCI).toBe(false);
      expect(rt.shouldLoadDotenv).toBe(true);
      expect(rt.defaultBackendPort).toBe(5001);
    });
  });

  describe("CI", () => {
    it("detects CI=true", async () => {
      process.env.CI = "true";
      const rt = await loadRuntime();
      expect(rt.isCI).toBe(true);
      expect(rt.isLocal).toBe(false);
      expect(rt.isCodexWeb).toBe(false);
      expect(rt.isCodexLocal).toBe(false);
      expect(rt.isReplit).toBe(false);
      expect(rt.shouldLoadDotenv).toBe(true);
    });
  });

  describe("PORT override", () => {
    it("uses PORT env var when set", async () => {
      process.env.PORT = "3000";
      const rt = await loadRuntime();
      expect(rt.defaultBackendPort).toBe(3000);
    });
  });

  describe("enableDevAuth", () => {
    it("is false by default in local dev", async () => {
      const rt = await loadRuntime();
      expect(rt.enableDevAuth).toBe(false);
    });

    it("is true when ENABLE_DEV_AUTH=true in development", async () => {
      process.env.ENABLE_DEV_AUTH = "true";
      const rt = await loadRuntime();
      expect(rt.enableDevAuth).toBe(true);
    });

    it("is false on Replit even if ENABLE_DEV_AUTH=true", async () => {
      process.env.REPL_ID = "abc";
      process.env.ENABLE_DEV_AUTH = "true";
      const rt = await loadRuntime();
      expect(rt.enableDevAuth).toBe(false);
    });

    it("is false in production even if ENABLE_DEV_AUTH=true", async () => {
      process.env.NODE_ENV = "production";
      process.env.ENABLE_DEV_AUTH = "true";
      const rt = await loadRuntime();
      expect(rt.enableDevAuth).toBe(false);
    });
  });

  describe("mutual exclusivity", () => {
    it("Replit takes precedence over Codex vars", async () => {
      process.env.REPL_ID = "abc";
      process.env.CODEX = "1";
      const rt = await loadRuntime();
      expect(rt.isReplit).toBe(true);
      expect(rt.isCodexWeb).toBe(false);
      expect(rt.isCodexLocal).toBe(false);
      expect(rt.isLocal).toBe(false);
    });

    it("CI takes precedence over Codex vars", async () => {
      process.env.CI = "true";
      process.env.CODEX = "1";
      const rt = await loadRuntime();
      expect(rt.isCI).toBe(true);
      expect(rt.isCodexWeb).toBe(false);
      expect(rt.isCodexLocal).toBe(false);
    });
  });
});
