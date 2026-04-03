/**
 * Legt eine Beispiel-Organisation an (idempotent per tenant_id).
 * Nutzung: DATABASE_URL=... SEED_TENANT_ID=my-tenant pnpm --filter @repo/db exec tsx scripts/seed-organization.ts
 * (ohne DATABASE_URL: lädt wie die API Repo-Root `.env` und `.env.local`)
 */
import { eq } from "drizzle-orm";

import { loadApiEnv } from "../load-api-env.js";
import { createDb, createPool, organizations } from "../src/index.js";

loadApiEnv();

const tenantId = process.env.SEED_TENANT_ID?.trim() || "local-dev-tenant";
const name = process.env.SEED_ORG_NAME?.trim() || "Local Dev GmbH";
const tradeSlug = process.env.SEED_TRADE_SLUG?.trim() || "maler";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Fehler: DATABASE_URL ist nicht gesetzt.");
  process.exit(1);
}

const pool = createPool(databaseUrl);
const db = createDb(pool);

try {
  const existing = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.tenantId, tenantId))
    .limit(1);

  if (existing[0]) {
    console.log(`Organisation existiert bereits: tenant_id=${tenantId}`);
    process.exit(0);
  }

  await db.insert(organizations).values({
    tenantId,
    name,
    tradeSlug,
  });

  console.log(
    `Organisation angelegt: tenant_id=${tenantId}, name=${name}, trade_slug=${tradeSlug}`,
  );
} finally {
  await pool.end();
}
