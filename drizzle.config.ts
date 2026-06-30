import { defineConfig } from "drizzle-kit";
import { normalizePostgresConnectionString } from "./server/src/db/connectionString";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: normalizePostgresConnectionString(process.env.DATABASE_URL),
  },
});
