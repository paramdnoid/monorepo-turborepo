import "server-only";

import { eq } from "@repo/db";
import { organizations } from "@repo/db";

import { getDb } from "./db";

/**
 * Mandanten-Gewerk aus Postgres (`organizations.trade_slug`), abgestimmt auf `tenant_id`.
 * Ist die Quelle der Wahrheit nach Registrierung — Keycloak-Mapper können veraltet sein.
 */
export async function getTradeSlugFromOrganization(
  tenantId: string | null,
): Promise<string | null> {
  const id = tenantId?.trim();
  if (!id) return null;

  const db = getDb();
  if (!db) return null;

  const rows = await db
    .select({ tradeSlug: organizations.tradeSlug })
    .from(organizations)
    .where(eq(organizations.tenantId, id))
    .limit(1);

  const slug = rows[0]?.tradeSlug?.trim();
  return slug || null;
}
