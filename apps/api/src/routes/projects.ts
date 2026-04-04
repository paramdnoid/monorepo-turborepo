import { desc, eq } from "drizzle-orm";
import type { Context } from "hono";

import { projects, type Db } from "@repo/db";

export function createProjectsListHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }
    const rows = await db
      .select({
        id: projects.id,
        title: projects.title,
        createdAt: projects.createdAt,
      })
      .from(projects)
      .where(eq(projects.tenantId, auth.tenantId))
      .orderBy(desc(projects.createdAt))
      .limit(200);
    return c.json({
      projects: rows.map((r) => ({
        id: r.id,
        title: r.title,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  };
}
