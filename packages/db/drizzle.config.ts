import { defineConfig } from "drizzle-kit";

/** Für `db:migrate` muss `DATABASE_URL` gesetzt sein; `db:generate` nutzt primär das Schema. */
const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://127.0.0.1:5432/postgres";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: databaseUrl },
});
