/**
 * Smoke-Test gegen echte DB ohne Keycloak: `createApp` mit Mock-JWT.
 *
 * Voraussetzung: Migration (`drizzle-kit migrate`). Legt bei Bedarf eine Zeile in
 * `organizations` an (gleiche Logik wie `provisionOrganizationIfAbsent`), damit kein
 * separates `db:seed` nötig ist.
 *
 *   DATABASE_URL in Repo-Root `.env.local` (siehe `/.env.example`)
 *   pnpm --filter api run smoke:http
 */
import { config } from "dotenv";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { provisionOrganizationIfAbsent } from "@repo/db";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(__dirname, "../../..");
config({ path: join(repoRoot, ".env") });
config({ path: join(repoRoot, ".env.local"), override: true });

const tenantId = process.env.SEED_TENANT_ID?.trim() || "local-dev-tenant";
const orgName = process.env.SEED_ORG_NAME?.trim() || "Local Dev GmbH";
const tradeSlug = process.env.SEED_TRADE_SLUG?.trim() || "maler";

const { createApp } = await import("../src/app.js");
const { getOptionalDb } = await import("../src/db.js");

const db = getOptionalDb();
if (!db) {
  console.error("DATABASE_URL fehlt (Smoke braucht echte DB).");
  process.exit(1);
}

const prov = await provisionOrganizationIfAbsent(db, {
  tenantId,
  name: orgName,
  tradeSlug,
});
console.log("Smoke: Mandant", prov, tenantId);

const app = createApp({
  verifyAccessToken: async () => ({ sub: "smoke-user", tenantId }),
  getDb: getOptionalDb,
});

const meRes = await app.request("http://localhost/v1/me", {
  headers: { Authorization: "Bearer mock" },
});
const meText = await meRes.text();
console.log("GET /v1/me", meRes.status, meText);

const syncRes = await app.request("http://localhost/v1/sync", {
  method: "POST",
  headers: {
    Authorization: "Bearer mock",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    deviceId: "550e8400-e29b-41d4-a716-446655440000",
    mutations: [
      {
        idempotencyKey: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        entityType: "project",
        operation: "create",
        payload: { title: "Smoke-Projekt" },
      },
    ],
  }),
});
const syncText = await syncRes.text();
console.log("POST /v1/sync", syncRes.status, syncText);

if (!meRes.ok || !syncRes.ok) {
  process.exit(1);
}
