/**
 * One-shot Verarbeitung der Mahn-E-Mail-Outbox für Cron/Worker-Runner.
 *
 * Beispiele:
 *   pnpm --filter api run worker:reminder-emails:once
 *   pnpm --filter api run worker:reminder-emails:once -- --tenant-limit=100 --per-tenant-limit=50
 *
 * Exit-Codes:
 *   0 = erfolgreich
 *   1 = Lauf mit Fehlern (z. B. Tenant-Verarbeitung fehlgeschlagen)
 *   2 = Konfiguration/DB nicht verfügbar
 */
import { config as loadEnvFile } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { getOptionalDb } from "../src/db.js";
import { processReminderEmailOutboxForAllTenants } from "../src/routes/sales.js";

function parsePositiveIntFlag(flagName: string, fallback: number): number {
  const prefix = `--${flagName}=`;
  const raw = process.argv.find((arg) => arg.startsWith(prefix));
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw.slice(prefix.length), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, "../../..");
loadEnvFile({ path: join(repoRoot, ".env") });
loadEnvFile({ path: join(repoRoot, ".env.local"), override: true });

const tenantLimit = parsePositiveIntFlag("tenant-limit", 50);
const perTenantLimit = parsePositiveIntFlag("per-tenant-limit", 20);

const db = getOptionalDb();
if (!db) {
  console.error(
    JSON.stringify({
      level: "error",
      service: "zunftgewerk-api",
      msg: "sales_reminder_email_worker_missing_database_url",
    }),
  );
  process.exit(2);
}

try {
  const result = await processReminderEmailOutboxForAllTenants(db, {
    tenantLimit,
    perTenantLimit,
  });

  console.log(
    JSON.stringify({
      level: "info",
      service: "zunftgewerk-api",
      msg: "sales_reminder_email_worker_once_finished",
      tenantLimit,
      perTenantLimit,
      tenantCount: result.tenantCount,
      processed: result.processed,
      sent: result.sent,
      failed: result.failed,
      erroredTenants: result.erroredTenants,
    }),
  );

  if (result.erroredTenants.length > 0) {
    process.exit(1);
  }
  process.exit(0);
} catch (error) {
  console.error(
    JSON.stringify({
      level: "error",
      service: "zunftgewerk-api",
      msg: "sales_reminder_email_worker_once_failed",
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exit(1);
}
