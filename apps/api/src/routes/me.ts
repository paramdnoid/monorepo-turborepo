import type { Context } from "hono";

export function meHandler(c: Context) {
  const auth = c.get("auth");
  const org = c.get("organization");
  if (!auth || !org) {
    throw new Error("me route requires auth and organization middleware");
  }

  return c.json({
    sub: auth.sub,
    tenantId: auth.tenantId,
    organization: {
      id: org.id,
      name: org.name,
      tradeSlug: org.tradeSlug,
    },
  });
}
