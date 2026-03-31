#!/usr/bin/env node
/**
 * Richtet lokales Keycloak für ZunftGewerk-Dev ein (Realm, Client, Mapper, User) — ohne manuelle Klicks.
 * Voraussetzung: docker compose -f docker-compose.keycloak.yml up -d
 *
 *   pnpm keycloak:bootstrap
 *
 * Optional (Umgebungsvariablen):
 *   KEYCLOAK_URL (default http://127.0.0.1:8080)
 *   KEYCLOAK_ADMIN / KEYCLOAK_ADMIN_PASSWORD (default admin / admin)
 *   KEYCLOAK_REALM (default zgwerk)
 *   KEYCLOAK_CLIENT_ID (default zunft-dev)
 *   DEV_USER / DEV_PASSWORD (default dev / dev)
 *   TENANT_ID (default local-dev-tenant)
 *   DESKTOP_OAUTH_REDIRECT_PORT (default 47823) — Redirect für Client „zgwerk-desktop“
 */
const base = (process.env.KEYCLOAK_URL ?? "http://127.0.0.1:8080").replace(
  /\/$/,
  "",
);
const adminUser = process.env.KEYCLOAK_ADMIN ?? "admin";
const adminPass = process.env.KEYCLOAK_ADMIN_PASSWORD ?? "admin";
const realm = process.env.KEYCLOAK_REALM ?? "zgwerk";
const clientId = process.env.KEYCLOAK_CLIENT_ID ?? "zunft-dev";
const devUser = process.env.DEV_USER ?? "dev";
const devPassword = process.env.DEV_PASSWORD ?? "dev";
const tenantId = process.env.TENANT_ID ?? "local-dev-tenant";

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
            : "ZunftGewerk Dev",
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
      protocolMapper: "oidc-hardcoded-claim-mapper",
      config: {
        "claim.name": "tenant_id",
        "claim.value": tenantId,
        "jsonType.label": "String",
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
    `Protocol-Mapper „tenant_id“ = „${tenantId}“ (Hardcoded-Claim, lokales Dev).`,
  );
}

/**
 * Keycloak verweigert den Password-Grant mit „Account is not fully set up“, wenn
 * Pflichtfelder / requiredActions fehlen — für lokales Dev-Login vervollständigen.
 */
async function finalizeUserForPasswordGrant(token, userId) {
  const gr = await fetch(
    `${base}/admin/realms/${encodeURIComponent(realm)}/users/${userId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!gr.ok) throw new Error(await gr.text());
  const u = await gr.json();
  u.requiredActions = [];
  u.enabled = true;
  u.emailVerified = true;
  u.email = u.email || `${devUser}@local.dev`;
  u.firstName = u.firstName || "Dev";
  u.lastName = u.lastName || "Local";
  u.attributes = { ...u.attributes, tenant_id: [tenantId] };
  const pr = await fetch(
    `${base}/admin/realms/${encodeURIComponent(realm)}/users/${userId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(u),
    },
  );
  if (!pr.ok) {
    throw new Error(`User finalisieren: ${await pr.text()}`);
  }
  console.log(
    "Benutzer: Profil vervollständigt, requiredActions geleert (Password-Grant).",
  );
}

async function ensureUser(token) {
  const q = new URLSearchParams({ username: devUser, exact: "true" });
  const r = await fetch(
    `${base}/admin/realms/${encodeURIComponent(realm)}/users?${q}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!r.ok) throw new Error(await r.text());
  const users = await r.json();

  const userBody = {
    username: devUser,
    enabled: true,
    emailVerified: true,
    email: `${devUser}@local.dev`,
    firstName: "Dev",
    lastName: "Local",
    requiredActions: [],
    attributes: { tenant_id: [tenantId] },
  };

  if (users.length === 0) {
    const cr = await fetch(
      `${base}/admin/realms/${encodeURIComponent(realm)}/users`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userBody),
      },
    );
    if (cr.status !== 201) {
      throw new Error(`User anlegen: ${cr.status} ${await cr.text()}`);
    }
    const loc = cr.headers.get("Location");
    const id = loc?.split("/").pop();
    if (!id) throw new Error("User-ID aus Location-Header fehlt.");
    await setPassword(token, id);
    await finalizeUserForPasswordGrant(token, id);
    console.log(
      `Benutzer „${devUser}“ angelegt (Passwort: aus DEV_PASSWORD), tenant_id=${tenantId}.`,
    );
    return;
  }

  const id = users[0].id;
  const gr = await fetch(
    `${base}/admin/realms/${encodeURIComponent(realm)}/users/${id}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!gr.ok) throw new Error(await gr.text());
  const existing = await gr.json();
  existing.attributes = { ...existing.attributes, tenant_id: [tenantId] };
  existing.requiredActions = [];
  existing.emailVerified = true;
  existing.enabled = true;
  existing.email = existing.email || `${devUser}@local.dev`;
  existing.firstName = existing.firstName || "Dev";
  existing.lastName = existing.lastName || "Local";
  const ur = await fetch(
    `${base}/admin/realms/${encodeURIComponent(realm)}/users/${id}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(existing),
    },
  );
  if (!ur.ok) throw new Error(`User aktualisieren: ${await ur.text()}`);
  await setPassword(token, id);
  await finalizeUserForPasswordGrant(token, id);
  console.log(
    `Benutzer „${devUser}“ aktualisiert (tenant_id=${tenantId}, Passwort gesetzt).`,
  );
}

async function setPassword(token, userId) {
  const r = await fetch(
    `${base}/admin/realms/${encodeURIComponent(realm)}/users/${userId}/reset-password`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "password",
        value: devPassword,
        temporary: false,
      }),
    },
  );
  if (!r.ok) throw new Error(`Passwort setzen: ${await r.text()}`);
}

async function main() {
  await waitForKeycloak();
  const token = await getAdminToken();
  await ensureRealm(token);
  await ensureRealmSslForLocalHttp(token);
  await ensureRealmRole(token, "API_USER");
  const clientUuid = await ensureClient(token);
  await ensureTenantIdMapper(token, clientUuid);
  await ensureClient(token, "zgwerk-cli");
  const desktopUuid = await ensureDesktopOauthClient(token);
  await ensureTenantIdMapper(token, desktopUuid);
  await ensureUser(token);
  console.log("\nFertig. Als Nächstes:");
  console.log("  pnpm --filter api run check:auth-env");
  console.log(
    `  DEV_PASSWORD=${JSON.stringify(devPassword)} pnpm --filter api run token:local`,
  );
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
