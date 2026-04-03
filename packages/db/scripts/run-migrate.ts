/**
 * Wendet SQL-Migrationen an — gleiche Logik wie `drizzle-kit migrate`, aber mit
 * ausgegebener Fehlermeldung (drizzle-kit unterdrückt den Fehler im Spinner).
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

import { createPool } from "../src/client.js";
import { loadApiEnv } from "../load-api-env.js";

function isScramPasswordError(err: unknown): boolean {
  const s =
    err instanceof Error
      ? `${err.message}${err.cause instanceof Error ? err.cause.message : ""}`
      : String(err);
  return (
    s.includes("password must be a string") ||
    s.includes("password must be a non-empty string")
  );
}

loadApiEnv();

const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://127.0.0.1:5432/postgres";

const migrationsFolder = join(
  dirname(fileURLToPath(import.meta.url)),
  "../drizzle",
);

const pool = createPool(databaseUrl);
const db = drizzle(pool);

try {
  await migrate(db, { migrationsFolder });
  console.log("Migrationen erfolgreich angewendet.");
} catch (err) {
  console.error("Migration fehlgeschlagen:");
  console.error(err);
  if (isScramPasswordError(err)) {
    console.error(`
SCRAM: Postgres verlangt ein Passwort als String. Bitte in `.env.local` am Repository-Root:
  • DATABASE_URL=postgresql://USER:PASSWORT@127.0.0.1:5432/DB (PASSWORT nicht leer lassen), oder
  • PGPASSWORD=<Passwort> setzen (node-pg nutzt das, wenn die URL kein Passwort hat).
`);
  }
  process.exitCode = 1;
} finally {
  await pool.end();
}

if (process.exitCode === 1) {
  process.exit(1);
}
