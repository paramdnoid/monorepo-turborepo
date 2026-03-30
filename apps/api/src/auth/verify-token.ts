import { createRemoteJWKSet, jwtVerify } from "jose";

import { type LoadedEnv, resolveIssuer } from "../env.js";

export class AuthNotConfiguredError extends Error {
  constructor() {
    super("AUTH_NOT_CONFIGURED");
    this.name = "AuthNotConfiguredError";
  }
}

export class TenantClaimMissingError extends Error {
  constructor() {
    super("TENANT_CLAIM_MISSING");
    this.name = "TenantClaimMissingError";
  }
}

export type AuthContext = {
  sub: string;
  tenantId: string;
};

/**
 * Erstellt einen Verifier gegen die Keycloak-OIDC-JWKS (`…/protocol/openid-connect/certs`).
 * `tenant_id` muss per Keycloak-Protokoll-Mapper im Access-Token stehen (Claim-Name über `AUTH_TENANT_CLAIM`).
 */
export function createAccessTokenVerifier(
  env: LoadedEnv,
): ((token: string) => Promise<AuthContext>) | null {
  const issuer = resolveIssuer(env);
  if (!issuer) return null;

  const jwksUrl = new URL(
    `${issuer.replace(/\/$/, "")}/protocol/openid-connect/certs`,
  );
  const JWKS = createRemoteJWKSet(jwksUrl);
  const tenantClaim = env.AUTH_TENANT_CLAIM;
  const audience = env.AUTH_OIDC_AUDIENCE;

  return async (token: string) => {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer,
      ...(audience ? { audience } : {}),
    });

    const sub = typeof payload.sub === "string" ? payload.sub : "";
    const raw = (payload as Record<string, unknown>)[tenantClaim];
    const tenantId =
      typeof raw === "string"
        ? raw
        : Array.isArray(raw) && typeof raw[0] === "string"
          ? raw[0]
          : undefined;

    if (!tenantId) {
      throw new TenantClaimMissingError();
    }

    return { sub, tenantId };
  };
}

export function createVerifyOrThrowNotConfigured(
  env: LoadedEnv,
): (token: string) => Promise<AuthContext> {
  const verifier = createAccessTokenVerifier(env);
  if (!verifier) {
    return async () => {
      throw new AuthNotConfiguredError();
    };
  }
  return (token) => verifier(token);
}
