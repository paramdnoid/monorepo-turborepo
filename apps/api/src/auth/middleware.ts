import { createMiddleware } from "hono/factory";

import type { AuthContext } from "./verify-token.js";
import {
  AuthNotConfiguredError,
  TenantClaimMissingError,
} from "./verify-token.js";

export function createAuthMiddleware(
  verify: (token: string) => Promise<AuthContext>,
) {
  return createMiddleware(async (c, next) => {
    const header = c.req.header("Authorization");
    if (!header?.startsWith("Bearer ")) {
      return c.json(
        { error: "missing_bearer_token", code: "MISSING_BEARER_TOKEN" },
        401,
      );
    }
    const token = header.slice("Bearer ".length).trim();
    if (!token) {
      return c.json(
        { error: "missing_bearer_token", code: "MISSING_BEARER_TOKEN" },
        401,
      );
    }

    try {
      const auth = await verify(token);
      c.set("auth", auth);
    } catch (e) {
      if (e instanceof AuthNotConfiguredError) {
        return c.json({ error: "auth_not_configured", code: "AUTH_NOT_CONFIGURED" }, 503);
      }
      if (e instanceof TenantClaimMissingError) {
        return c.json(
          {
            error: "tenant_claim_missing",
            code: "TENANT_CLAIM_MISSING",
            detail:
              "Access-Token enthält keinen Mandanten-Claim — Keycloak-Protokoll-Mapper für tenant_id konfigurieren.",
          },
          403,
        );
      }
      return c.json({ error: "invalid_token", code: "INVALID_TOKEN" }, 401);
    }

    await next();
  });
}
