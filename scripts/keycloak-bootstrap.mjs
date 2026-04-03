#!/usr/bin/env node
/**
 * Richtet lokales Keycloak für ZunftGewerk-Dev ein (Realm, Clients, Mapper) — ohne manuelle Klicks.
 * Voraussetzung: docker compose -f docker-compose.keycloak.yml up -d
 *
 *   pnpm keycloak:bootstrap
 *
 * Optional (Umgebungsvariablen):
 *   KEYCLOAK_URL (default http://127.0.0.1:8080)
 *   KEYCLOAK_ADMIN / KEYCLOAK_ADMIN_PASSWORD (default admin / admin)
 *   KEYCLOAK_REALM (default zgwerk)
 *   KEYCLOAK_CLIENT_ID (default zgwerk-cli)
 *   (früher TENANT_ID für Hardcode-Mapper — entfernt; tenant_id kommt aus dem User-Attribut)
 *   DESKTOP_OAUTH_REDIRECT_PORT (default 47823) — Redirect für Client „zgwerk-desktop“
 *
 * User Profile: Realm setzt unmanagedAttributePolicy=ENABLED, damit Custom-Attribute
 * (tenant_id, trade_slug, …) über die Admin-API gespeichert werden — sonst verwirft
 * Keycloak sie bei deklarativem User Profile.
 */
const base = (process.env.KEYCLOAK_URL ?? "http://127.0.0.1:8080").replace(
  /\/$/,
  "",
);
const adminUser = process.env.KEYCLOAK_ADMIN ?? "admin";
const adminPass = process.env.KEYCLOAK_ADMIN_PASSWORD ?? "admin";
const realm = process.env.KEYCLOAK_REALM ?? "zgwerk";
const clientId = process.env.KEYCLOAK_CLIENT_ID ?? "zgwerk-cli";
/** Electron-Desktop: Authorization Code + PKCE (apps/desktop). */
const desktopOauthRedirectPort =
  Number(process.env.DESKTOP_OAUTH_REDIRECT_PORT) || 47823;

async function waitForKeycloak() {
  const max = 45;
  for (let i = 0; i < max; i++) {
    try {
      const r = await fetch(`${base}/realms/master`);
      if (r.ok) return;
    } catch {
      /* ignore */
    }
    process.stdout.write(i === 0 ? "Warte auf Keycloak …\n" : `.`);
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(
    `Keycloak unter ${base} nicht erreichbar. Container läuft? (docker compose -f docker-compose.keycloak.yml up -d)`,
  );
}

async function getAdminToken() {
  const body = new URLSearchParams({
    grant_type: "password",
    client_id: "admin-cli",
    username: adminUser,
    password: adminPass,
  });
  const r = await fetch(`${base}/realms/master/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const j = await r.json();
  if (!r.ok || !j.access_token) {
    throw new Error(
      `Admin-Token fehlgeschlagen: ${r.status} ${JSON.stringify(j)}`,
    );
  }
  return j.access_token;
}

async function ensureRealm(token) {
  const r = await fetch(`${base}/admin/realms`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      realm,
      enabled: true,
      displayName: "ZunftGewerk Dev",
    }),
  });
  if (r.status === 201) {
    console.log(`Realm „${realm}“ angelegt.`);
    return;
  }
  if (r.status === 409) {
    console.log(`Realm „${realm}“ existiert bereits.`);
    return;
  }
  const t = await r.text();
  throw new Error(`Realm anlegen: ${r.status} ${t}`);
}

/** Lokales HTTP (localhost): ohne „none“ blockiert Keycloak oft den Password-Grant. */
async function ensureRealmSslForLocalHttp(token) {
  const gr = await fetch(`${base}/admin/realms/${encodeURIComponent(realm)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!gr.ok) return;
  const rep = await gr.json();
  if (rep.sslRequired === "none") return;
  rep.sslRequired = "none";
  const ur = await fetch(`${base}/admin/realms/${encodeURIComponent(realm)}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(rep),
  });
  if (!ur.ok) {
    console.warn(
      `Realm sslRequired: PUT fehlgeschlagen (${ur.status}) — ignorieren.`,
    );
    return;
  }
  console.log(`Realm: sslRequired → none (lokales http://).`);
}

/**
 * Ohne diese Policy verwirft Keycloak bei aktivem „User profile“ oft unbekannte Attribute;
 * der tenant_id-Mapper liefert dann nichts → TENANT_CLAIM_MISSING / 403.
 * @see https://www.keycloak.org/docs/latest/server_admin/#_user_profile
 */
async function ensureUserProfileUnmanagedAttributes(token) {
  const url = `${base}/admin/realms/${encodeURIComponent(realm)}/users/profile`;
  const gr = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!gr.ok) {
    console.warn(
      `User profile: GET fehlgeschlagen (${gr.status}) — Custom-Attribute ggf. manuell in der Admin-UI.`,
    );
    return;
  }
  const profile = await gr.json();
  if (profile.unmanagedAttributePolicy === "ENABLED") {
    console.log(`User profile: unmanagedAttributePolicy bereits ENABLED.`);
    return;
  }
  profile.unmanagedAttributePolicy = "ENABLED";
  const pr = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(profile),
  });
  if (!pr.ok) {
    throw new Error(
      `User profile: PUT unmanagedAttributePolicy — ${pr.status} ${await pr.text()}`,
    );
  }
  console.log(
    "User profile: unmanagedAttributePolicy → ENABLED (tenant_id / trade_slug per Admin-API).",
  );
}

/**
 * Realm-Rolle für die API (JWT / Gateway) — wird Onboarding-Nutzern zugewiesen
 * (`apps/web` POST /api/onboarding/register → assignApiUserRole).
 */
async function ensureRealmRole(token, roleName) {
  const check = await fetch(
    `${base}/admin/realms/${encodeURIComponent(realm)}/roles/${encodeURIComponent(roleName)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (check.ok) {
    console.log(`Realm-Rolle „${roleName}“ existiert bereits.`);
    return;
  }
  if (check.status !== 404) {
    throw new Error(`Rolle prüfen: ${check.status} ${await check.text()}`);
  }
  const cr = await fetch(
    `${base}/admin/realms/${encodeURIComponent(realm)}/roles`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: roleName }),
    },
  );
  if (cr.status !== 201) {
    throw new Error(`Rolle anlegen: ${cr.status} ${await cr.text()}`);
  }
  console.log(`Realm-Rolle „${roleName}“ angelegt.`);
}

async function findClientUuid(token, targetClientId) {
  const r = await fetch(
    `${base}/admin/realms/${encodeURIComponent(realm)}/clients?clientId=${encodeURIComponent(targetClientId)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!r.ok) throw new Error(await r.text());
  const arr = await r.json();
  return arr[0]?.id ?? null;
}

/** Früherer Doppel-Client zu „zgwerk-cli“ — bei Bootstrap entfernen. */
async function deleteClientIfExists(token, targetClientId) {
  const uuid = await findClientUuid(token, targetClientId);
  if (!uuid) return;
  const r = await fetch(
    `${base}/admin/realms/${encodeURIComponent(realm)}/clients/${uuid}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
  );
  if (!r.ok && r.status !== 404) {
    throw new Error(`Client löschen: ${r.status} ${await r.text()}`);
  }
  console.log(`Client „${targetClientId}“ entfernt (ersetzt durch „zgwerk-cli“).`);
}

async function ensureClientPasswordGrant(token, clientUuid) {
  const gr = await fetch(
    `${base}/admin/realms/${encodeURIComponent(realm)}/clients/${clientUuid}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!gr.ok) throw new Error(await gr.text());
  const c = await gr.json();
  c.directAccessGrantsEnabled = true;
  c.publicClient = true;
  c.standardFlowEnabled = true;
  c.fullScopeAllowed = true;
  if (c.bearerOnly === true) c.bearerOnly = false;
  const pr = await fetch(
    `${base}/admin/realms/${encodeURIComponent(realm)}/clients/${clientUuid}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(c),
    },
  );
  if (!pr.ok) {
    throw new Error(
      `Client aktualisieren (Password-Grant): ${await pr.text()}`,
    );
  }
  console.log(
    "Client: Direct Access Grants + öffentlicher Client gesetzt (Password-Grant).",
  );
}

/** Öffentlicher Client mit Password-Grant (lokales Web / CLI). */
async function ensureClient(token, targetClientId = clientId) {
  let uuid = await findClientUuid(token, targetClientId);
  if (uuid) {
    console.log(`Client „${targetClientId}“ existiert bereits (interne ID).`);
    await ensureClientPasswordGrant(token, uuid);
    return uuid;
  }
  const r = await fetch(
    `${base}/admin/realms/${encodeURIComponent(realm)}/clients`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientId: targetClientId,
        name:
          targetClientId === "zgwerk-cli"
            ? "ZunftGewerk CLI (Onboarding / Password-Grant)"
            : `ZunftGewerk (${targetClientId})`,
        enabled: true,
        publicClient: true,
        directAccessGrantsEnabled: true,
        standardFlowEnabled: true,
        fullScopeAllowed: true,
        redirectUris: ["http://localhost:3000/*", "http://127.0.0.1:3000/*"],
        webOrigins: ["http://localhost:3000", "http://127.0.0.1:3000"],
      }),
    },
  );
  if (r.status !== 201) {
    throw new Error(`Client anlegen: ${r.status} ${await r.text()}`);
  }
  console.log(`Client „${targetClientId}“ angelegt.`);
  uuid = await findClientUuid(token, targetClientId);
  if (!uuid) throw new Error("Client UUID nicht gefunden nach Anlage.");
  await ensureClientPasswordGrant(token, uuid);
  return uuid;
}

/**
 * Öffentlicher OAuth-Client für Electron (Authorization Code + PKCE).
 * Zusätzlich: Direct Access Grants für POST /api/auth/login (zentrales Web-Login
 * tauscht Passwort gegen Tokens, bevor der Callback-Code ausgestellt wird).
 * Client-ID entspricht Default `DESKTOP_OIDC_CLIENT_ID` in apps/desktop.
 */
async function ensureDesktopOauthClient(token) {
  const targetClientId = "zgwerk-desktop";
  const redirectBase = `http://127.0.0.1:${String(desktopOauthRedirectPort)}`;
  const callbackUri = `${redirectBase}/callback`;

  const mergeRedirectUris = (existing) => {
    const set = new Set([
      ...(existing ?? []),
      callbackUri,
      `${redirectBase}/*`,
      /* Electron wählt ggf. einen freien Port (47823… oder OS); Wildcard erlaubt jeden Port auf 127.0.0.1 */
      "http://127.0.0.1:*",
      "http://127.0.0.1:*/*",
    ]);
    return [...set];
  };

  let uuid = await findClientUuid(token, targetClientId);

  if (uuid) {
    const gr = await fetch(
      `${base}/admin/realms/${encodeURIComponent(realm)}/clients/${uuid}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!gr.ok) throw new Error(await gr.text());
    const c = await gr.json();
    c.redirectUris = mergeRedirectUris(c.redirectUris);
    c.webOrigins = Array.from(
      new Set([...(c.webOrigins ?? []), redirectBase, "+"]),
    );
    c.publicClient = true;
    c.standardFlowEnabled = true;
    c.directAccessGrantsEnabled = true;
    c.attributes = {
      ...c.attributes,
      "pkce.code.challenge.method": "S256",
    };
    const pr = await fetch(
      `${base}/admin/realms/${encodeURIComponent(realm)}/clients/${uuid}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(c),
      },
    );
    if (!pr.ok) {
      throw new Error(`Desktop-Client aktualisieren: ${await pr.text()}`);
    }
    await ensureClientPasswordGrant(token, uuid);
    console.log(
      `Client „${targetClientId}“ aktualisiert (Redirect ${callbackUri}, PKCE + Password-Grant für Web-Login).`,
    );
    return uuid;
  }

  const r = await fetch(
    `${base}/admin/realms/${encodeURIComponent(realm)}/clients`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientId: targetClientId,
        name: "ZunftGewerk Desktop (Electron, PKCE)",
        enabled: true,
        publicClient: true,
        directAccessGrantsEnabled: true,
        standardFlowEnabled: true,
        implicitFlowEnabled: false,
        fullScopeAllowed: true,
        redirectUris: mergeRedirectUris([]),
        webOrigins: [redirectBase, "+"],
        attributes: {
          "pkce.code.challenge.method": "S256",
        },
      }),
    },
  );
  if (r.status !== 201) {
    throw new Error(`Desktop-Client anlegen: ${r.status} ${await r.text()}`);
  }
  console.log(
    `Client „${targetClientId}“ angelegt (Redirect ${callbackUri}, PKCE).`,
  );
  uuid = await findClientUuid(token, targetClientId);
  if (!uuid) throw new Error("Desktop-Client UUID nicht gefunden.");
  await ensureClientPasswordGrant(token, uuid);
  return uuid;
}

async function ensureTenantIdMapper(token, clientUuid) {
  const listUrl = `${base}/admin/realms/${encodeURIComponent(realm)}/clients/${clientUuid}/protocol-mappers/models`;
  const r = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(await r.text());
  const mappers = await r.json();
  for (const m of mappers) {
    if (m.name === "tenant_id" && m.id) {
      const del = await fetch(`${listUrl}/${m.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!del.ok && del.status !== 404) {
        throw new Error(`Mapper löschen: ${await del.text()}`);
      }
    }
  }
  const cr = await fetch(listUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "tenant_id",
      protocol: "openid-connect",
      protocolMapper: "oidc-usermodel-attribute-mapper",
      config: {
        "user.attribute": "tenant_id",
        "claim.name": "tenant_id",
        "jsonType.label": "String",
        "multivalued": "false",
        "id.token.claim": "false",
        "access.token.claim": "true",
        "userinfo.token.claim": "true",
      },
    }),
  });
  if (!cr.ok) {
    throw new Error(`Mapper anlegen: ${cr.status} ${await cr.text()}`);
  }
  console.log(
    'Protocol-Mapper „tenant_id“: User-Attribut → Access-Token (kein Hardcode; Web-Onboarding setzt tenant_id).',
  );
}

/** Früherer Bootstrap-Testuser — entfernen, falls noch vorhanden. */
async function deleteLegacyTestUserIfExists(token, username) {
  const q = new URLSearchParams({ username, exact: "true" });
  const r = await fetch(
    `${base}/admin/realms/${encodeURIComponent(realm)}/users?${q}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!r.ok) throw new Error(await r.text());
  const users = await r.json();
  const u = users[0];
  if (!u?.id) return;
  const dr = await fetch(
    `${base}/admin/realms/${encodeURIComponent(realm)}/users/${u.id}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
  );
  if (!dr.ok && dr.status !== 404) {
    throw new Error(`User löschen: ${await dr.text()}`);
  }
  console.log(
    `Benutzer „${username}“ entfernt (früherer Test-User; Konten über Web-Onboarding).`,
  );
}

async function main() {
  await waitForKeycloak();
  const token = await getAdminToken();
  await ensureRealm(token);
  await ensureRealmSslForLocalHttp(token);
  await ensureUserProfileUnmanagedAttributes(token);
  await ensureRealmRole(token, "API_USER");
  await deleteClientIfExists(token, "zunft-dev");
  const cliUuid = await ensureClient(token);
  await ensureTenantIdMapper(token, cliUuid);
  const desktopUuid = await ensureDesktopOauthClient(token);
  await ensureTenantIdMapper(token, desktopUuid);
  await deleteLegacyTestUserIfExists(token, "dev");
  console.log("\nFertig. Als Nächstes:");
  console.log(
    "  Web-Onboarding (/onboarding): Konto anlegen — Mandant + JWT wie in Produktion.",
  );
  console.log(
    "  API testen: Cookie „zgwerk_access_token“ in den DevTools kopieren → ACCESS_TOKEN=… (siehe apps/api/KEYCLOAK-E2E-RUNBOOK.md).",
  );
  console.log("  pnpm --filter api run check:auth-env");
  console.log(
    "  Desktop: Client „zgwerk-desktop“, Redirect http://127.0.0.1:" +
      String(desktopOauthRedirectPort) +
      "/callback → pnpm exec turbo run dev --filter=desktop",
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
