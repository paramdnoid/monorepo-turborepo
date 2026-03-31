function trimSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

/** Lokale Defaults nur außerhalb Production; mit DESKTOP_OIDC_STRICT=1 abschaltbar. */
function allowLocalDevDefaults(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.DESKTOP_OIDC_STRICT === "1") return false;
  return true;
}

function keycloakBaseUrl(): string | undefined {
  const fromEnv =
    process.env.DESKTOP_AUTH_KEYCLOAK_BASE_URL?.trim() ||
    process.env.AUTH_KEYCLOAK_BASE_URL?.trim() ||
    process.env.KEYCLOAK_BASE_URL?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  if (allowLocalDevDefaults()) {
    return "http://127.0.0.1:8080";
  }
  return undefined;
}

function keycloakRealm(): string {
  return (
    process.env.DESKTOP_AUTH_KEYCLOAK_REALM?.trim() ||
    process.env.AUTH_KEYCLOAK_REALM?.trim() ||
    "zgwerk"
  );
}

export type OidcResolvedConfig = {
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  clientId: string;
  redirectPath: string;
};

export function resolveIssuerUrl(): string | null {
  const explicit =
    process.env.DESKTOP_OIDC_ISSUER?.trim() ||
    process.env.AUTH_OIDC_ISSUER?.trim();
  if (explicit) {
    return trimSlash(explicit);
  }
  const base = keycloakBaseUrl();
  if (!base) {
    return null;
  }
  const realm = keycloakRealm();
  return `${trimSlash(base)}/realms/${encodeURIComponent(realm)}`;
}

export function getOidcConfig(): OidcResolvedConfig | null {
  const issuer = resolveIssuerUrl();
  const clientId =
    process.env.DESKTOP_OIDC_CLIENT_ID?.trim() ?? "zgwerk-desktop";
  if (!issuer) {
    return null;
  }
  const redirectPath =
    process.env.DESKTOP_OAUTH_REDIRECT_PATH?.trim() || "/callback";
  return {
    issuer,
    authorizationEndpoint: `${issuer}/protocol/openid-connect/auth`,
    tokenEndpoint: `${issuer}/protocol/openid-connect/token`,
    clientId,
    redirectPath,
  };
}
