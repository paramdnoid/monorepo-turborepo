import { eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";

import { organizations, type Db } from "@repo/db";

export function createOrgMiddleware(getDb: () => Db | undefined) {
  return createMiddleware(async (c, next) => {
    const db = getDb();
    if (!db) {
      return c.json(
        { error: "database_unavailable", code: "DATABASE_UNAVAILABLE" },
        503,
      );
    }

    const auth = c.get("auth");
    if (!auth) {
      return c.json(
        { error: "missing_auth_context", code: "MISSING_AUTH_CONTEXT" },
        500,
      );
    }
    const rows = await db
      .select()
      .from(organizations)
      .where(eq(organizations.tenantId, auth.tenantId))
      .limit(1);
    const org = rows[0];
    if (!org) {
      return c.json(
        {
          error: "tenant_not_provisioned",
          code: "TENANT_NOT_PROVISIONED",
          detail:
            "Für diese tenant_id existiert noch kein Mandant in der Datenbank. Nach erfolgreicher Web-Registrierung wird der Mandant angelegt — erneut anmelden oder kurz warten und erneut versuchen. Bei anhaltendem Fehler Support kontaktieren.",
        },
        403,
      );
    }

    c.set("organization", org);
    await next();
  });
}
