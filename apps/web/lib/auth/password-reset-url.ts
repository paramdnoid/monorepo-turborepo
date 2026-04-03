import "server-only";

/**
 * Keycloak „Passwort vergessen“ (reset-credentials) oder explizite URL aus ENV.
 */
export function getPasswordResetUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_AUTH_PASSWORD_RESET_URL?.trim();
  if (explicit) {
    return explicit;
  }

  const base = (
    process.env.NEXT_PUBLIC_AUTH_KEYCLOAK_BASE_URL?.trim() ||
    process.env.AUTH_KEYCLOAK_BASE_URL?.trim() ||
    process.env.KEYCLOAK_BASE_URL?.trim() ||
    "http://127.0.0.1:8080"
  ).replace(/\/+$/, "");
  const realm =
    process.env.NEXT_PUBLIC_AUTH_KEYCLOAK_REALM?.trim() ||
    process.env.AUTH_KEYCLOAK_REALM?.trim() ||
    process.env.KEYCLOAK_REALM?.trim() ||
    "zgwerk";
  const clientId =
    process.env.NEXT_PUBLIC_AUTH_OIDC_CLIENT_ID?.trim() ||
    process.env.AUTH_OIDC_CLIENT_ID?.trim() ||
    "zgwerk-cli";

  return `${base}/realms/${encodeURIComponent(realm)}/login-actions/reset-credentials?client_id=${encodeURIComponent(clientId)}`;
}
