import { config as loadEnv } from "dotenv";
import { serve } from "@hono/node-server";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createApp } from "./app.js";
import { getOptionalDb } from "./db.js";
import { processReminderEmailOutboxForAllTenants } from "./routes/sales.js";

const apiRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(apiRoot, "../..");
loadEnv({ path: join(repoRoot, ".env") });
loadEnv({ path: join(repoRoot, ".env.local"), override: true });

const app = createApp();
const port = Number(process.env.PORT ?? "4000");

function parsePositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

function isReminderOutboxWorkerEnabled(): boolean {
  const raw = process.env.REMINDER_EMAIL_WORKER_ENABLED;
  if (!raw) return true;
  return raw !== "0" && raw.toLowerCase() !== "false";
}

function startReminderOutboxWorker(): void {
  if (!isReminderOutboxWorkerEnabled()) return;

  const intervalMs = parsePositiveIntEnv(
    "REMINDER_EMAIL_WORKER_INTERVAL_MS",
    30_000,
  );
  const tenantLimit = parsePositiveIntEnv(
    "REMINDER_EMAIL_WORKER_TENANT_LIMIT",
    50,
  );
  const perTenantLimit = parsePositiveIntEnv(
    "REMINDER_EMAIL_WORKER_PER_TENANT_LIMIT",
    20,
  );

  let running = false;
  const runCycle = async () => {
    if (running) return;
    running = true;
    try {
      const db = getOptionalDb();
      if (!db) return;
      const result = await processReminderEmailOutboxForAllTenants(db, {
        tenantLimit,
        perTenantLimit,
      });
      if (
        result.processed > 0 ||
        result.failed > 0 ||
        result.erroredTenants.length > 0
      ) {
        console.log(
          JSON.stringify({
            level: "info",
            service: "zunftgewerk-api",
            msg: "sales_reminder_email_worker_cycle",
            tenantCount: result.tenantCount,
            processed: result.processed,
            sent: result.sent,
            failed: result.failed,
            erroredTenants: result.erroredTenants,
          }),
        );
      }
    } catch (error) {
      console.error(
        JSON.stringify({
          level: "error",
          service: "zunftgewerk-api",
          msg: "sales_reminder_email_worker_failed",
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    } finally {
      running = false;
    }
  };

  const timer = setInterval(() => {
    void runCycle();
  }, intervalMs);
  timer.unref();
  void runCycle();
}

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`api listening on http://127.0.0.1:${info.port}`);
});

startReminderOutboxWorker();
