import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { TRADE_SLUGS } from "@repo/api-contracts";

import { createAuthMiddleware } from "./auth/middleware.js";
import { createOrgMiddleware } from "./auth/org-middleware.js";
import { createVerifyOrThrowNotConfigured } from "./auth/verify-token.js";
import type { AuthContext } from "./auth/verify-token.js";
import { loadEnv } from "./env.js";
import { getOptionalDb } from "./db.js";
import { requestContextMiddleware } from "./middleware/request-context.js";
import { meHandler } from "./routes/me.js";
import { createSyncHandler } from "./routes/sync.js";

function isDevEnv(): boolean {
  return process.env.NODE_ENV === "development";
}

export type CreateAppOptions = {
  /** Test: eigene JWT-Prüfung (z. B. lokaler JWKS). */
  verifyAccessToken?: (token: string) => Promise<AuthContext>;
  /** Test / Worker: DB-Factory. */
  getDb?: () => ReturnType<typeof getOptionalDb>;
};

export function createApp(options?: CreateAppOptions) {
  const env = loadEnv();
  const verify =
    options?.verifyAccessToken ?? createVerifyOrThrowNotConfigured(env);

  const getDb = options?.getDb ?? getOptionalDb;
  const authMiddleware = createAuthMiddleware(verify);
  const orgMiddleware = createOrgMiddleware(getDb);
  const syncHandler = createSyncHandler(getDb);

  const app = new Hono();

  /** Desktop (Vite :5173) und Web (:3000) rufen die API cross-origin auf — sonst „Failed to fetch“ (CORS). */
  const corsOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    ...(process.env.API_CORS_ORIGINS?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? []),
  ];
  app.use(
    "*",
    cors({
      origin: corsOrigins,
      allowHeaders: ["Authorization", "Content-Type"],
      allowMethods: ["GET", "POST", "OPTIONS", "HEAD"],
      maxAge: 86400,
    }),
  );

  app.use("*", requestContextMiddleware());

  app.onError((err, c) => {
    const requestId = c.get("requestId");
    console.error(
      JSON.stringify({
        level: "error",
        service: "zunftgewerk-api",
        requestId,
        msg: err instanceof Error ? err.message : String(err),
        ...(isDevEnv() && err instanceof Error && err.stack
          ? { stack: err.stack }
          : {}),
      }),
    );
    return c.json(
      { error: "internal_server_error", code: "INTERNAL_SERVER_ERROR" },
      500,
    );
  });

  app.get("/health", (c) =>
    c.json({
      status: "ok",
      service: "zunftgewerk-api",
      trades: TRADE_SLUGS,
    }),
  );

  app.get("/v1/health/db", async (c) => {
    const db = getDb();
    if (!db) {
      return c.json({ ok: false, reason: "missing_database_url" }, 503);
    }
    try {
      await db.execute(sql`select 1`);
      return c.json({ ok: true });
    } catch {
      return c.json({ ok: false, reason: "database_unreachable" }, 503);
    }
  });

  /** Kubernetes/Loadbalancer: 200 nur wenn DB erreichbar (Auth nicht nötig). */
  app.get("/ready", async (c) => {
    const db = getDb();
    if (!db) {
      return c.json({ ready: false, reason: "missing_database_url" }, 503);
    }
    try {
      await db.execute(sql`select 1`);
      return c.json({ ready: true });
    } catch {
      return c.json({ ready: false, reason: "database_unreachable" }, 503);
    }
  });

  const v1 = new Hono();
  v1.use("*", authMiddleware);
  v1.get("/me", orgMiddleware, meHandler);
  v1.post("/sync", orgMiddleware, syncHandler);

  app.route("/v1", v1);

  return app;
}
