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
  /** Authorization-Code-Tausch (Keycloak oder zentraler Web-Login `/api/auth/token`). */
  tokenEndpoint: string;
  /**
   * Refresh gegen Keycloak — Pflicht, wenn `tokenEndpoint` die Web-App ist (nur Code-Tausch),
   * sonst entfällt der Refresh-URL-Override.
   */
  refreshTokenEndpoint?: string;
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

/**
 * Zentraler Login in `apps/web`: Authorization und Code-Tausch über die Web-URL,
 * Refresh weiterhin gegen Keycloak.
 */
function desktopWebBaseUrl(): string | undefined {
  const fromEnv =
    process.env.DESKTOP_WEB_BASE_URL?.trim() ||
    process.env.DESKTOP_WEB_LOGIN_ORIGIN?.trim();
  if (fromEnv) {
    return trimSlash(fromEnv);
  }
  return undefined;
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
  const keycloakAuth = `${issuer}/protocol/openid-connect/auth`;
  const keycloakToken = `${issuer}/protocol/openid-connect/token`;

  const webBase = desktopWebBaseUrl();
  if (webBase) {
    return {
      issuer,
      authorizationEndpoint: `${webBase}/login`,
      tokenEndpoint: `${webBase}/api/auth/token`,
      refreshTokenEndpoint: keycloakToken,
      clientId,
      redirectPath,
    };
  }

  return {
    issuer,
    authorizationEndpoint: keycloakAuth,
    tokenEndpoint: keycloakToken,
    clientId,
    redirectPath,
  };
}
