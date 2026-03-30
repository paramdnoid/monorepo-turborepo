import "server-only";

import { provisionOrganizationIfAbsent } from "@repo/db";
import { tradeSlugSchema } from "@repo/api-contracts";

import { getDb } from "./db";

export type ProvisionOutcome =
  | { ok: true; skipped: true }
  | { ok: true; skipped: false; result: "inserted" | "exists" }
  | { ok: false; code: "INVALID_TRADE" | "PROVISION_FAILED" };

/**
 * Nach erfolgreicher Keycloak-Registrierung: Mandant in `organizations`.
 * Ohne `DATABASE_URL` (nur Web ohne API-DB): überspringen — lokal ok, Produktion sollte DB setzen.
 */
export async function tryProvisionOrganizationAfterSignup(input: {
  tenantId: string;
  companyName: string;
  tradeSlug: string;
}): Promise<ProvisionOutcome> {
  let db: ReturnType<typeof getDb>;
  try {
    db = getDb();
  } catch (error) {
    console.error("[tryProvisionOrganizationAfterSignup] getDb", error);
    return { ok: false, code: "PROVISION_FAILED" };
  }
  if (!db) {
    return { ok: true, skipped: true };
  }

  const trade = tradeSlugSchema.safeParse(input.tradeSlug);
  if (!trade.success) {
    return { ok: false, code: "INVALID_TRADE" };
  }

  try {
    const result = await provisionOrganizationIfAbsent(db, {
      tenantId: input.tenantId,
      name: input.companyName,
      tradeSlug: trade.data,
    });
    return { ok: true, skipped: false, result };
  } catch (error) {
    console.error("[tryProvisionOrganizationAfterSignup]", error);
    return { ok: false, code: "PROVISION_FAILED" };
  }
}
