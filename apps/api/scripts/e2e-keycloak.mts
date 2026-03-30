/**
 * Schnelltest mit **echtem** Access-Token (Keycloak o. ä.):
 *   ACCESS_TOKEN=... pnpm --filter api run e2e:keycloak
 * Optional: API_BASE=http://127.0.0.1:4000
 *
 * Voraussetzung: Mandant in `organizations` für die `tenant_id` aus dem Token
 * (z. B. nach Web-Registrierung mit DATABASE_URL oder `pnpm --filter @repo/db run db:seed`).
 */
const base = (process.env.API_BASE ?? "http://127.0.0.1:4000").replace(
  /\/$/,
  "",
);
const token = process.env.ACCESS_TOKEN;
if (!token) {
  console.error("ACCESS_TOKEN fehlt.");
  process.exit(1);
}

const me = await fetch(`${base}/v1/me`, {
  headers: { Authorization: `Bearer ${token}` },
});
const meBody = await me.text();
const meReqId = me.headers.get("x-request-id");
console.log(
  "GET /v1/me",
  me.status,
  meReqId ? `x-request-id=${meReqId}` : "",
  meBody,
);

const sync = await fetch(`${base}/v1/sync`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    deviceId: "550e8400-e29b-41d4-a716-446655440000",
    mutations: [],
  }),
});
const syncBody = await sync.text();
const syncReqId = sync.headers.get("x-request-id");
console.log(
  "POST /v1/sync",
  sync.status,
  syncReqId ? `x-request-id=${syncReqId}` : "",
  syncBody,
);

if (me.status === 403) {
  try {
    const j = JSON.parse(meBody) as { code?: string };
    if (j.code === "TENANT_NOT_PROVISIONED") {
      console.error(
        "\nHinweis: Kein Mandant in der DB — Registrierung über Web abschließen (DATABASE_URL in web) oder Seed/Provision für diese tenant_id.",
      );
    }
  } catch {
    /* ignore */
  }
}

if (!me.ok || !sync.ok) process.exit(1);
