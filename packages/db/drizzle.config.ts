import { defineConfig } from "drizzle-kit";

import { loadApiEnv } from "./load-api-env.js";
import { normalizePostgresConnectionString } from "./src/normalize-postgres-url.js";

loadApiEnv();

/** Für `db:migrate`: `DATABASE_URL` aus Umgebung oder `apps/api/.env*`; sonst lokaler Default. */
const databaseUrl = normalizePostgresConnectionString(
  process.env.DATABASE_URL ?? "postgresql://127.0.0.1:5432/postgres",
);

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: databaseUrl },
});
