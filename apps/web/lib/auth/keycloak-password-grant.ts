const OIDC_TOKEN_ENDPOINT =
  process.env.AUTH_OIDC_TOKEN_ENDPOINT ??
  "http://127.0.0.1:8080/realms/zgwerk/protocol/openid-connect/token";

export type KeycloakTokenBundle = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
};

export type KeycloakPasswordGrantInput = {
  username: string;
  password: string;
  clientId: string;
  /**
   * Standard-OIDC-Scopes; `offline_access` für Refresh-Token, sofern der Keycloak-Client das erlaubt.
   */
  scope?: string;
};

export async function requestKeycloakPasswordGrant(
  input: KeycloakPasswordGrantInput,
): Promise<
  | { ok: true; tokens: KeycloakTokenBundle }
  | { ok: false; status: number; bodyText: string }
> {
  const scope =
    input.scope ?? "openid profile email offline_access";
  const params = new URLSearchParams({
    grant_type: "password",
    client_id: input.clientId,
    username: input.username,
    password: input.password,
    scope,
  });

  let tokenResponse: Response;
  try {
    tokenResponse = await fetch(OIDC_TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 503, bodyText: "fetch_failed" };
  }

  const bodyText = await tokenResponse.text();
  if (!tokenResponse.ok) {
    return { ok: false, status: tokenResponse.status, bodyText };
  }

  let json: unknown;
  try {
    json = JSON.parse(bodyText) as unknown;
  } catch {
    return { ok: false, status: 502, bodyText: "invalid_json" };
  }

  const tokens = json as Partial<KeycloakTokenBundle>;
  if (!tokens.access_token || typeof tokens.access_token !== "string") {
    return { ok: false, status: 502, bodyText: "missing_access_token" };
  }

  return {
    ok: true,
    tokens: {
      access_token: tokens.access_token,
      refresh_token:
        typeof tokens.refresh_token === "string"
          ? tokens.refresh_token
          : undefined,
      expires_in:
        typeof tokens.expires_in === "number" ? tokens.expires_in : undefined,
    },
  };
}
