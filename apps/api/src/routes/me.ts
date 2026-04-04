import type { Context } from "hono";

import { mapOrgToMeOrganization } from "./organization.js";

export function meHandler(c: Context) {
  const auth = c.get("auth");
  const org = c.get("organization");
  if (!auth || !org) {
    throw new Error("me route requires auth and organization middleware");
  }

  return c.json({
    sub: auth.sub,
    tenantId: auth.tenantId,
    organization: mapOrgToMeOrganization(org),
  });
}
