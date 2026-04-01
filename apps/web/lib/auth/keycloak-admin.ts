import "server-only";

type TokenResponse = {
  access_token?: string;
};

const KEYCLOAK_BASE_URL =
  process.env.AUTH_KEYCLOAK_BASE_URL ??
  process.env.KEYCLOAK_BASE_URL ??
  "http://127.0.0.1:8080";
export const KEYCLOAK_REALM = process.env.AUTH_KEYCLOAK_REALM ?? "zgwerk";
const KEYCLOAK_ADMIN_REALM = process.env.AUTH_KEYCLOAK_ADMIN_REALM ?? "master";
const KEYCLOAK_ADMIN_CLIENT_ID =
  process.env.AUTH_KEYCLOAK_ADMIN_CLIENT_ID ?? "admin-cli";
const KEYCLOAK_ADMIN_USERNAME = process.env.AUTH_KEYCLOAK_ADMIN_USERNAME;
const KEYCLOAK_ADMIN_PASSWORD = process.env.AUTH_KEYCLOAK_ADMIN_PASSWORD;
const DEFAULT_LOCAL_ADMIN_USERNAME = "admin";
const DEFAULT_LOCAL_ADMIN_PASSWORD = "admin";

export function normalizeKeycloakBaseUrl(url: string) {
  return url.replace(/\/+$/, "");
}

export async function getKeycloakAdminToken(): Promise<string | null> {
  if (
    process.env.NODE_ENV === "production" &&
    (!KEYCLOAK_ADMIN_USERNAME || !KEYCLOAK_ADMIN_PASSWORD)
  ) {
    return null;
  }

  const adminUsername = KEYCLOAK_ADMIN_USERNAME ?? DEFAULT_LOCAL_ADMIN_USERNAME;
  const adminPassword = KEYCLOAK_ADMIN_PASSWORD ?? DEFAULT_LOCAL_ADMIN_PASSWORD;

  const tokenEndpoint = `${normalizeKeycloakBaseUrl(KEYCLOAK_BASE_URL)}/realms/${encodeURIComponent(KEYCLOAK_ADMIN_REALM)}/protocol/openid-connect/token`;
  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "password",
      client_id: KEYCLOAK_ADMIN_CLIENT_ID,
      username: adminUsername,
      password: adminPassword,
    }).toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const tokenPayload = (await response.json()) as TokenResponse;
  return tokenPayload.access_token ?? null;
}

export async function getKeycloakUserEmail(
  adminToken: string,
  userId: string,
): Promise<string | null> {
  const base = normalizeKeycloakBaseUrl(KEYCLOAK_BASE_URL);
  const userUrl = `${base}/admin/realms/${encodeURIComponent(KEYCLOAK_REALM)}/users/${encodeURIComponent(userId)}`;
  const gr = await fetch(userUrl, {
    headers: { Authorization: `Bearer ${adminToken}` },
    cache: "no-store",
  });
  if (!gr.ok) {
    return null;
  }
  const user = (await gr.json()) as { email?: string };
  const email = user.email?.trim().toLowerCase();
  return email ?? null;
}

/**
 * Setzt `emailVerified` für einen Realm-User (Admin-API).
 */
export async function setKeycloakUserEmailVerified(
  adminToken: string,
  userId: string,
  verified: boolean,
): Promise<boolean> {
  const base = normalizeKeycloakBaseUrl(KEYCLOAK_BASE_URL);
  const userUrl = `${base}/admin/realms/${encodeURIComponent(KEYCLOAK_REALM)}/users/${encodeURIComponent(userId)}`;
  const gr = await fetch(userUrl, {
    headers: { Authorization: `Bearer ${adminToken}` },
    cache: "no-store",
  });
  if (!gr.ok) {
    return false;
  }
  const user = (await gr.json()) as Record<string, unknown>;
  delete user.access;
  user.emailVerified = verified;
  const pr = await fetch(userUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(user),
    cache: "no-store",
  });
  return pr.ok;
}
