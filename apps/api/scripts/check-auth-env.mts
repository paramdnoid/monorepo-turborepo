/**
 * Prüft lokale Auth-Konfiguration (ohne laufende API): Issuer, JWKS-URL, optional Erreichbarkeit.
 * Lädt `apps/api/.env` und `.env.local` wie `src/server.ts`.
 *
 *   pnpm --filter api run check:auth-env
 *   pnpm --filter api run check:auth-env -- --skip-network  — kein HTTP (Offline/CI)
 */
import { config as loadEnvFile } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnv, resolveIssuer, resetEnvCacheForTests } from "../src/env.js";

const apiRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
loadEnvFile({ path: join(apiRoot, ".env") });
loadEnvFile({ path: join(apiRoot, ".env.local") });
resetEnvCacheForTests();

const skipNetwork = process.argv.includes("--skip-network");

let env;
try {
  env = loadEnv();
} catch (e) {
  console.error("Umgebungsvariablen ungültig (Zod):", e);
  process.exit(1);
}

const issuer = resolveIssuer(env);

console.log(
  "DATABASE_URL:",
  env.DATABASE_URL ? "gesetzt" : "fehlt (API /ready wird 503)",
);
console.log("AUTH_TENANT_CLAIM:", env.AUTH_TENANT_CLAIM);
if (env.AUTH_OIDC_AUDIENCE) {
  console.log("AUTH_OIDC_AUDIENCE: gesetzt");
}

if (!issuer) {
  console.error(
    "\nKein OIDC-Issuer: setze AUTH_OIDC_ISSUER oder AUTH_KEYCLOAK_BASE_URL (+ AUTH_KEYCLOAK_REALM).",
  );
  console.error("Siehe apps/api/KEYCLOAK-E2E-RUNBOOK.md §1\n");
  process.exit(1);
}

const issuerNorm = issuer.replace(/\/$/, "");
const jwksUrl = `${issuerNorm}/protocol/openid-connect/certs`;
const wellKnown = `${issuerNorm}/.well-known/openid-configuration`;

console.log("\nIssuer:", issuer);
console.log("JWKS:  ", jwksUrl);

if (skipNetwork) {
  console.log(
    "\n--skip-network: Kein HTTP (Well-known/JWKS werden nicht angefragt).",
  );
  process.exit(0);
}

try {
  const r = await fetch(wellKnown, {
    signal: AbortSignal.timeout(8000),
    headers: { Accept: "application/json" },
  });
  if (r.ok) {
    console.log("\nWell-known: erreichbar (OK)");
  } else {
    console.warn(`\nWell-known: HTTP ${r.status} — Issuer/Realm prüfen`);
  }
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  console.warn(
    `\nWell-known: nicht erreichbar (${msg}) — VPN/URL/Realm prüfen`,
  );
}

try {
  const r = await fetch(jwksUrl, { signal: AbortSignal.timeout(8000) });
  if (r.ok) {
    console.log("JWKS: erreichbar (OK)");
  } else {
    console.warn(`JWKS: HTTP ${r.status}`);
  }
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  console.warn(`JWKS: nicht erreichbar (${msg})`);
}

console.log(
  "\nNächster Schritt: Token + Org (KEYCLOAK-E2E-RUNBOOK.md), dann runbook:phase1 mit ACCESS_TOKEN.",
);
process.exit(0);
