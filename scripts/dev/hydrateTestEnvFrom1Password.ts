#!/usr/bin/env npx tsx
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

interface Options {
  force: boolean;
  outFile: string;
  templateFile: string;
}

function parseArgs(argv: string[]): Options {
  const options: Options = {
    force: false,
    outFile: ".env.test.local",
    templateFile: ".env.test.local.template",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--force") {
      options.force = true;
    } else if (arg === "--out") {
      options.outFile = argv[++i];
    } else if (arg === "--template") {
      options.templateFile = argv[++i];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function envKeys(filePath: string) {
  return readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Za-z_][A-Za-z0-9_]*)=/)?.[1])
    .filter((key): key is string => !!key);
}

const options = parseArgs(process.argv.slice(2));
const outFile = resolve(process.cwd(), options.outFile);
const templateFile = resolve(process.cwd(), options.templateFile);
const defaultOutFile = resolve(process.cwd(), ".env.test.local");

if (outFile !== defaultOutFile) {
  console.error("Refusing to write secrets outside .env.test.local.");
  process.exit(1);
}

if (!existsSync(templateFile)) {
  console.error(
    `Missing template: ${templateFile}. ` +
      "Create it from env.test.local.example with local 1Password item references.",
  );
  process.exit(1);
}

if (existsSync(outFile) && !options.force) {
  console.error(`${outFile} already exists. Re-run with --force to replace it.`);
  process.exit(1);
}

const result = spawnSync(
  "op",
  [
    "inject",
    "--in-file",
    templateFile,
    "--out-file",
    outFile,
    ...(options.force ? ["--force"] : []),
  ],
  { stdio: "pipe", encoding: "utf8" },
);

if (result.status !== 0) {
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.stdout) process.stdout.write(result.stdout);
  process.exit(result.status ?? 1);
}

chmodSync(outFile, 0o600);

const keys = envKeys(outFile);
console.log(`Wrote ${outFile}`);
console.log(`Mode: 0600`);
console.log(`Keys: ${keys.join(", ")}`);
