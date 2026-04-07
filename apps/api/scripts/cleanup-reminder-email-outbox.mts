/**
 * One-shot Cleanup fuer die Mahn-E-Mail-Outbox (Retention + stale processing).
 *
 * Beispiele:
 *   pnpm --filter api run worker:reminder-emails:cleanup
 *
 * Exit-Codes:
 *   0 = erfolgreich
 *   2 = Konfiguration/DB nicht verfuegbar
 */
import { config as loadEnvFile } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { and, eq, lt } from "drizzle-orm";

import { getOptionalDb } from "../src/db.js";
import { salesReminderEmailJobs } from "@repo/db";

function parsePositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw || raw.trim() === "") return fallback;
  const parsed = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, "../../..");
loadEnvFile({ path: join(repoRoot, ".env") });
loadEnvFile({ path: join(repoRoot, ".env.local"), override: true });

const sentRetentionDays = parsePositiveIntEnv(
  "REMINDER_EMAIL_OUTBOX_SENT_RETENTION_DAYS",
  30,
);
const failedRetentionDays = parsePositiveIntEnv(
  "REMINDER_EMAIL_OUTBOX_FAILED_RETENTION_DAYS",
  90,
);
const processingStaleMinutes = parsePositiveIntEnv(
  "REMINDER_EMAIL_OUTBOX_PROCESSING_STALE_MINUTES",
  15,
);

const db = getOptionalDb();
if (!db) {
  console.error(
    JSON.stringify({
      level: "error",
      service: "zunftgewerk-api",
      msg: "sales_reminder_email_cleanup_missing_database_url",
    }),
  );
  process.exit(2);
}

const now = new Date();
const processingCutoff = new Date(Date.now() - processingStaleMinutes * 60_000);
const sentCutoff = new Date(Date.now() - sentRetentionDays * 86_400_000);
const failedCutoff = new Date(Date.now() - failedRetentionDays * 86_400_000);

const marked = await db
  .update(salesReminderEmailJobs)
  .set({
    status: "failed",
    lastError: "processing_timeout",
    updatedAt: now,
  })
  .where(
    and(
      eq(salesReminderEmailJobs.status, "processing"),
      lt(salesReminderEmailJobs.updatedAt, processingCutoff),
    ),
  )
  .returning({ id: salesReminderEmailJobs.id });

const deletedSent = await db
  .delete(salesReminderEmailJobs)
  .where(
    and(
      eq(salesReminderEmailJobs.status, "sent"),
      lt(salesReminderEmailJobs.sentAt, sentCutoff),
    ),
  )
  .returning({ id: salesReminderEmailJobs.id });

const deletedFailed = await db
  .delete(salesReminderEmailJobs)
  .where(
    and(
      eq(salesReminderEmailJobs.status, "failed"),
      lt(salesReminderEmailJobs.updatedAt, failedCutoff),
    ),
  )
  .returning({ id: salesReminderEmailJobs.id });

console.log(
  JSON.stringify({
    level: "info",
    service: "zunftgewerk-api",
    msg: "sales_reminder_email_cleanup_finished",
    sentRetentionDays,
    failedRetentionDays,
    processingStaleMinutes,
    processingMarkedFailed: marked.length,
    sentDeleted: deletedSent.length,
    failedDeleted: deletedFailed.length,
  }),
);

process.exit(0);

