import { eq } from "drizzle-orm";

import type { Db } from "./client.js";
import { organizations } from "./schema.js";

/**
 * Legt einen Mandanten an, falls noch keine Zeile mit dieser `tenant_id` existiert (idempotent).
 */
export async function provisionOrganizationIfAbsent(
  db: Db,
  input: { tenantId: string; name: string; tradeSlug: string },
): Promise<"inserted" | "exists"> {
  const existing = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.tenantId, input.tenantId))
    .limit(1);

  if (existing[0]) {
    return "exists";
  }

  await db.insert(organizations).values({
    tenantId: input.tenantId,
    name: input.name,
    tradeSlug: input.tradeSlug,
  });

  return "inserted";
}
