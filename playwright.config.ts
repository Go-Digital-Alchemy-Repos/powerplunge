import { defineConfig, devices } from "@playwright/test";

const defaultPort = process.env.REPL_ID ? 5000 : 5001;
const e2ePort = Number(process.env.E2E_PORT ?? defaultPort);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${e2ePort}`;

export default defineConfig({
  testDir: "e2e",
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL,
    viewport: { width: 1280, height: 720 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
  ],
  globalSetup: "./e2e/global-setup.ts",
  webServer: {
    command: "npm run dev",
    port: e2ePort,
    reuseExistingServer: true,
    timeout: 30000,
  },
});
