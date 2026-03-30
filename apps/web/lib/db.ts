import "server-only";

import { createDb, createPool } from "@repo/db";

let pool: ReturnType<typeof createPool> | undefined;
let warnedMissingDatabaseUrl = false;

function warnIfProductionMissingDatabaseUrl(): void {
  if (warnedMissingDatabaseUrl) return;
  const isProdLike = process.env.NODE_ENV === "production";
  if (!isProdLike) return;
  warnedMissingDatabaseUrl = true;
  console.warn(
    "[web/db] DATABASE_URL fehlt — Mandanten-Provision nach Registrierung wird übersprungen. In Staging/Prod dieselbe URL wie apps/api setzen (siehe apps/web/AGENTS.md).",
  );
}

/** Server-only: gleiche Postgres-URL wie `apps/api` (`DATABASE_URL`). */
export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    warnIfProductionMissingDatabaseUrl();
    return undefined;
  }
  if (!pool) {
    pool = createPool(url);
  }
  return createDb(pool);
}
