/**
 * Persistenter Worker fuer die Mahn-E-Mail-Outbox (separater Prozess).
 *
 * Beispiele:
 *   pnpm --filter api run worker:reminder-emails:run
 *   pnpm --filter api run worker:reminder-emails:run -- --interval-ms=15000 --tenant-limit=200 --per-tenant-limit=50
 *
 * Exit-Codes:
 *   0 = sauber beendet
 *   2 = Konfiguration/DB nicht verfuegbar
 */
import { config as loadEnvFile } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { and, asc, count, eq, inArray, lt, min } from "drizzle-orm";

import { getOptionalDb } from "../src/db.js";
import { salesReminderEmailJobs, type Db } from "@repo/db";
import { processReminderEmailOutboxForAllTenants } from "../src/routes/sales.js";

function parsePositiveIntFlag(flagName: string, fallback: number): number {
  const prefix = `--${flagName}=`;
  const raw = process.argv.find((arg) => arg.startsWith(prefix));
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw.slice(prefix.length), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parsePositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw || raw.trim() === "") return fallback;
  const parsed = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function minutesSince(ts: Date | null | undefined): number | null {
  if (!ts) return null;
  const ageMs = Date.now() - ts.getTime();
  if (!Number.isFinite(ageMs)) return null;
  if (ageMs < 0) return 0;
  return Math.floor(ageMs / 60_000);
}

async function cleanupOutbox(
  db: Db,
  args: {
  sentRetentionDays: number;
  failedRetentionDays: number;
  processingStaleMinutes: number;
},
): Promise<{
  processingMarkedFailed: number;
  sentDeleted: number;
  failedDeleted: number;
}> {
  const now = new Date();
  const processingCutoff = new Date(
    Date.now() - args.processingStaleMinutes * 60_000,
  );
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

  const sentCutoff = new Date(Date.now() - args.sentRetentionDays * 86_400_000);
  const deletedSent = await db
    .delete(salesReminderEmailJobs)
    .where(
      and(
        eq(salesReminderEmailJobs.status, "sent"),
        lt(salesReminderEmailJobs.sentAt, sentCutoff),
      ),
    )
    .returning({ id: salesReminderEmailJobs.id });

  const failedCutoff = new Date(
    Date.now() - args.failedRetentionDays * 86_400_000,
  );
  const deletedFailed = await db
    .delete(salesReminderEmailJobs)
    .where(
      and(
        eq(salesReminderEmailJobs.status, "failed"),
        lt(salesReminderEmailJobs.updatedAt, failedCutoff),
      ),
    )
    .returning({ id: salesReminderEmailJobs.id });

  return {
    processingMarkedFailed: marked.length,
    sentDeleted: deletedSent.length,
    failedDeleted: deletedFailed.length,
  };
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, "../../..");
loadEnvFile({ path: join(repoRoot, ".env") });
loadEnvFile({ path: join(repoRoot, ".env.local"), override: true });

const intervalMs = parsePositiveIntFlag("interval-ms", 15_000);
const tenantLimit = parsePositiveIntFlag("tenant-limit", 50);
const perTenantLimit = parsePositiveIntFlag("per-tenant-limit", 20);

const failedAlertThreshold = parsePositiveIntEnv(
  "REMINDER_EMAIL_OUTBOX_FAILED_THRESHOLD",
  1,
);
const pendingAgeAlertMinutes = parsePositiveIntEnv(
  "REMINDER_EMAIL_OUTBOX_PENDING_AGE_MINUTES_THRESHOLD",
  30,
);
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
      msg: "sales_reminder_email_worker_missing_database_url",
    }),
  );
  process.exit(2);
}

let stopRequested = false;
process.on("SIGINT", () => {
  stopRequested = true;
});
process.on("SIGTERM", () => {
  stopRequested = true;
});

let iteration = 0;
let lastCleanupAt = 0;
console.log(
  JSON.stringify({
    level: "info",
    service: "zunftgewerk-api",
    msg: "sales_reminder_email_worker_started",
    intervalMs,
    tenantLimit,
    perTenantLimit,
    failedAlertThreshold,
    pendingAgeAlertMinutes,
    sentRetentionDays,
    failedRetentionDays,
    processingStaleMinutes,
  }),
);

while (!stopRequested) {
  iteration += 1;
  const startedAt = Date.now();

  try {
    const result = await processReminderEmailOutboxForAllTenants(db, {
      tenantLimit,
      perTenantLimit,
    });

    const rows = await db
      .select({
        status: salesReminderEmailJobs.status,
        total: count(),
      })
      .from(salesReminderEmailJobs)
      .groupBy(salesReminderEmailJobs.status)
      .orderBy(asc(salesReminderEmailJobs.status));

    const counts = new Map<string, number>();
    for (const row of rows) {
      counts.set(row.status, Number(row.total ?? 0));
    }
    const pending =
      (counts.get("pending") ?? 0) + (counts.get("processing") ?? 0);
    const sent = counts.get("sent") ?? 0;
    const failed = counts.get("failed") ?? 0;

    const [oldestPending] = await db
      .select({ createdAt: min(salesReminderEmailJobs.createdAt) })
      .from(salesReminderEmailJobs)
      .where(inArray(salesReminderEmailJobs.status, ["pending", "processing"]))
      .limit(1);

    const oldestPendingAgeMinutes = minutesSince(oldestPending?.createdAt ?? null);
    const needsAttention =
      failed >= failedAlertThreshold ||
      (oldestPendingAgeMinutes !== null &&
        oldestPendingAgeMinutes >= pendingAgeAlertMinutes);

    console.log(
      JSON.stringify({
        level: needsAttention ? "warn" : "info",
        service: "zunftgewerk-api",
        msg: "sales_reminder_email_worker_tick",
        iteration,
        durationMs: Date.now() - startedAt,
        run: {
          tenantCount: result.tenantCount,
          processed: result.processed,
          sent: result.sent,
          failed: result.failed,
          erroredTenants: result.erroredTenants,
        },
        global: {
          pending,
          sent,
          failed,
          oldestPendingAgeMinutes,
        },
        thresholds: {
          failedAlertThreshold,
          pendingAgeAlertMinutes,
        },
      }),
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        service: "zunftgewerk-api",
        msg: "sales_reminder_email_worker_tick_failed",
        iteration,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }

  const cleanupDue = Date.now() - lastCleanupAt >= 60 * 60_000;
  if (!stopRequested && cleanupDue) {
    lastCleanupAt = Date.now();
    try {
      const result = await cleanupOutbox(db, {
        sentRetentionDays,
        failedRetentionDays,
        processingStaleMinutes,
      });
      console.log(
        JSON.stringify({
          level: "info",
          service: "zunftgewerk-api",
          msg: "sales_reminder_email_worker_cleanup_finished",
          iteration,
          ...result,
        }),
      );
    } catch (error) {
      console.error(
        JSON.stringify({
          level: "error",
          service: "zunftgewerk-api",
          msg: "sales_reminder_email_worker_cleanup_failed",
          iteration,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }

  if (stopRequested) break;

  await sleep(intervalMs);
}

console.log(
  JSON.stringify({
    level: "info",
    service: "zunftgewerk-api",
    msg: "sales_reminder_email_worker_stopped",
    iteration,
  }),
);
process.exit(0);

