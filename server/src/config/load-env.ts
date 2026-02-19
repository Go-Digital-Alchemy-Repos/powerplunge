import { runtime } from "./runtime";
import { config as dotenvConfig } from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";

if (runtime.shouldLoadDotenv) {
  const root = process.cwd();
  const files = [".env.local", ".env.development", ".env"];

  for (const file of files) {
    const filePath = resolve(root, file);
    if (existsSync(filePath)) {
      dotenvConfig({ path: filePath, override: false });
    }
  }
}
