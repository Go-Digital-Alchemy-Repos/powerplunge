#!/usr/bin/env npx tsx
import { spawnSync } from "node:child_process";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required for local DB push.");
  process.exit(1);
}

async function verifyDatabaseConnection() {
  const client = new pg.Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    await client.query("select 1");
  } finally {
    await client.end().catch(() => undefined);
  }
}

try {
  await verifyDatabaseConnection();
} catch (error) {
  console.error("Local test database connection failed before db push:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const result = spawnSync("npx", ["drizzle-kit", "push"], {
  encoding: "utf8",
  stdio: "pipe",
  shell: process.platform === "win32",
});

if (result.stdout) {
  process.stdout.write(result.stdout);
}

if (result.stderr) {
  process.stderr.write(result.stderr);
}

const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
if (output.includes("created or renamed from another")) {
  console.error(
    "Drizzle stopped at an unresolved create/rename prompt. " +
      "Resolve the schema diff before running check:local.",
  );
  process.exit(1);
}

process.exit(result.status ?? 1);
