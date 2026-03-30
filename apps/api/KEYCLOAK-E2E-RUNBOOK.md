# Runbook: Token → `/v1/me` → `/v1/sync` (echtes Keycloak + provisionierte Org)

Dieses Dokument ist der **durchgängige Referenzablauf** für Entwicklung und manuelle Abnahme. **CI** führt diesen Pfad **nicht** aus (kein Keycloak im Standard-Workflow, keine Secrets-Pflicht) — siehe [CI und Keycloak](#ci-und-keycloak).

### Entwicklung zuerst lokal abschließen (ohne Produktion)

Sinnvolle Reihenfolge: **alles auf dem eigenen Rechner** (Postgres, ggf. Keycloak in Docker, `apps/api` + `apps/web` mit `.env.local`) **vollständig durchtesten** — erst danach Hosting, Domain ([zunftgewerk.de](https://zunftgewerk.de/)) und produktive Secrets.

**Checkliste „Dev fertig“ (Minimal)**

1. Postgres + Migrationen; `pnpm --filter api run verify:runbook-prereqs` → `/health` und `/ready` **200**
2. Keycloak **lokal** ([§1b](#1b-lokales-keycloak-docker--einmalig-einrichten)) oder Dev-Instanz — `AUTH_KEYCLOAK_BASE_URL` / Realm gesetzt (kein Platzhalter, sobald du Tokens testen willst)
3. `pnpm --filter api run check:auth-env` (ohne `--skip-network`, sobald Keycloak erreichbar) → Well-known/JWKS **OK**
4. Zeile in `organizations` zur Token-`tenant_id` ([§3](#3-mandant-in-organizations-pflicht-für-v1me-und-v1sync))
5. `ACCESS_TOKEN="…" pnpm --filter api run runbook:phase1` → `/v1/me` und `/v1/sync` **200**
6. `apps/web`: dieselbe `DATABASE_URL` in `.env.local` → Registrierungsflow einmal durchklicken → Mandant liegt in der DB

**Produktion** (eigene Subdomain für Keycloak, `NEXT_PUBLIC_SITE_URL`, Hosting-Secrets) ist **ein späterer Schritt** — nicht nötig, um die Entwicklung „zu Ende“ zu bringen.

### Reihenfolge (kurz)

| Schritt | Inhalt                                                                 | Befehl / Ort                                                                                                     |
| ------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **1**   | API + DB (lokal)                                                       | `pnpm --filter api run runbook:phase1` — ohne Token endet es nach `/ready` mit Hinweis                           |
| **1b**  | Issuer / JWKS prüfen                                                   | `pnpm --filter api run check:auth-env` — Keycloak lokal: [§1b](#1b-lokales-keycloak-docker--einmalig-einrichten) |
| **2**   | Keycloak `AUTH_*` in `apps/api/.env.local`                             | §1 / [§1b](#1b-lokales-keycloak-docker--einmalig-einrichten)                                                     |
| **3**   | Zeile in `organizations` (Seed oder Web-Sign-up)                       | §3                                                                                                               |
| **4**   | Token + `e2e:keycloak`                                                 | `ACCESS_TOKEN="…" pnpm --filter api run runbook:phase1` oder §5                                                  |
| **5**   | Web `DATABASE_URL` (lokal in `.env.local`; Staging/Prod erst nach Dev) | [Web-DB](#web-db-stagingprod), `apps/web/AGENTS.md`                                                              |
| **6**   | Fachlogik / Verträge                                                   | `@repo/api-contracts`, Sync-Handler — nach Fundament                                                             |

---

## Kurzüberblick

1. Postgres + Migrationen
2. API mit `DATABASE_URL` und Keycloak-Issuer (`AUTH_*`)
3. Zeile in `organizations` für dieselbe **`tenant_id`**, die später im JWT steht
4. Access-Token von Keycloak holen
5. `GET /v1/me` und `POST /v1/sync` mit `Authorization: Bearer …`

---

## 0. Schnellcheck (ohne Token)

Wenn die API läuft (`pnpm exec turbo run dev --filter=api`):

```sh
pnpm --filter api run verify:runbook-prereqs
# optional: API_BASE=http://127.0.0.1:4000
```

Erwartung: `GET /health` und `GET /ready` mit **HTTP 200**. Schlägt `/ready` fehl → Postgres/Migration/`DATABASE_URL` für `apps/api` prüfen.

**Web:** Für die Mandanten-Provision nach Sign-up muss `apps/web` dieselbe **`DATABASE_URL`** haben — siehe [Web-DB (Staging/Prod)](#web-db-stagingprod).

---

## 1. Datenbank und API

```sh
# Repo-Root
docker compose -f docker-compose.postgres.yml up -d   # oder eigener Postgres

pnpm --filter @repo/db exec drizzle-kit migrate
```

`apps/api/.env.local` (lokal z. B. `cp apps/api/.env.local.example apps/api/.env.local`; fehlende OIDC-Variablen siehe `apps/api/.env.example`):

- `DATABASE_URL` — gleiche Datenbank wie für Web/Seed
- **Eines** von:
  - `AUTH_OIDC_ISSUER=https://<host>/realms/<realm>` (exakt wie `iss` im Token), **oder**
  - `AUTH_KEYCLOAK_BASE_URL` + `AUTH_KEYCLOAK_REALM` (Issuer wird daraus gebaut)
- Optional: `AUTH_OIDC_AUDIENCE`, `AUTH_TENANT_CLAIM` (Default `tenant_id`)

Auth-Konfiguration prüfen (Issuer, optional Well-known/JWKS erreichbar — **ohne** laufende API):

```sh
pnpm --filter api run check:auth-env
# Nur Issuer aus .env prüfen (kein Netzwerk): -- --skip-network
```

API starten:

```sh
pnpm exec turbo run dev --filter=api
```

Checks ohne Token: `GET http://127.0.0.1:4000/health`, `GET …/ready`, `GET …/v1/health/db`.

---

## 1b. Lokales Keycloak (Docker) — einmalig einrichten

Ziel: **laufender Keycloak auf dem Rechner**, damit `check:auth-env` Well-known/JWKS erreicht und du echte Tokens testen kannst — **ohne** Produktions-Domain.

### Container starten

```sh
# Repo-Root
docker compose -f docker-compose.postgres.yml up -d    # Postgres (falls noch nicht)
docker compose -f docker-compose.keycloak.yml up -d
```

Warten, bis **http://localhost:8080** lädt. Admin-Zugang (nur Entwicklung): Benutzer **`admin`**, Passwort **`admin`** (siehe [`docker-compose.keycloak.yml`](../../docker-compose.keycloak.yml)).

### `apps/api/.env.local`

```env
# Gleicher Host wie im JWT-Claim `iss` (Keycloak nutzt oft 127.0.0.1 statt „localhost“).
AUTH_KEYCLOAK_BASE_URL=http://127.0.0.1:8080
AUTH_KEYCLOAK_REALM=zgwerk
```

Dann:

```sh
pnpm --filter api run check:auth-env
```

Erwartung: **Well-known** und **JWKS** mit **OK** (nicht `fetch failed`).

### Automatisch (empfohlen — ohne UI-Klicks)

Nach dem Container-Start **Realm `zgwerk`**, Client **`zunft-dev`**, Mapper **`tenant_id`**, User **`dev`** mit Passwort **`dev`** und Attribut **`tenant_id` = `local-dev-tenant`** anlegen:

```sh
# Repo-Root (Keycloak muss laufen)
pnpm keycloak:bootstrap
```

Details und Umgebungsvariablen: [`scripts/keycloak-bootstrap.mjs`](../../scripts/keycloak-bootstrap.mjs). Anschließend `check:auth-env` und `token:local` wie unten.

### Keycloak-Oberfläche (manuell, falls du nicht skripten willst)

1. **http://localhost:8080** → **Administration Console** anmelden.
2. **Realm anlegen:** Realm `zgwerk` (Name exakt so, passend zu `AUTH_KEYCLOAK_REALM`).
3. **Client** (Realm `zgwerk`): **Clients** → **Create client**
   - **Client ID:** z. B. `zunft-dev`
   - **Client authentication:** **Off** (public)
   - **Valid redirect URIs:** `http://localhost:3000/*` (Web-Dev)
   - Unter **Capability config:** **Direct access grants** aktivieren (für Password-Grant / Skript — nur lokal).
4. **Mapper `tenant_id`:** Client `zunft-dev` → **Client scopes** → **Dedicated scope** für diesen Client → **Add mapper** → **User Attribute**
   - **User Attribute:** `tenant_id`
   - **Token claim name:** `tenant_id`
   - **Claim JSON type:** String
   - **Add to access token:** An
5. **Test-User:** **Users** → User anlegen (z. B. `dev`) → **Credentials** Passwort setzen → Tab **Attributes** → **`tenant_id`** = `local-dev-tenant` (muss zur Seed-Zeile / DB passen, siehe §3).

### Token holen (Skript)

```sh
export KEYCLOAK_BASE_URL=http://127.0.0.1:8080
export KEYCLOAK_REALM=zgwerk
export KEYCLOAK_CLIENT_ID=zunft-dev
export KEYCLOAK_USER=dev
export KEYCLOAK_PASSWORD='<dein-passwort>'
pnpm --filter api run token:local
```

Ausgabe = nur die **Access-Token-Zeichenkette** (für `ACCESS_TOKEN=…` oder `e2e:keycloak`).

---

## 2. Keycloak: Claim `tenant_id` im Access-Token

Siehe Detail in [`FOUNDATION.md`](./FOUNDATION.md) §1 und Implementierung in [`src/auth/verify-token.ts`](./src/auth/verify-token.ts).

**Kurz:** User-Attribut `tenant_id` → Protokoll-Mapper → Claim-Name = `AUTH_TENANT_CLAIM` (Standard `tenant_id`) → **im Access-Token**.

Ohne Issuer in der API: Antwort **503** mit `code: "AUTH_NOT_CONFIGURED"`.

---

## 3. Mandant in `organizations` (Pflicht für `/v1/me` und `/v1/sync`)

Die **`tenant_id` in der DB** muss mit der **`tenant_id` im JWT** übereinstimmen — sonst **403** `TENANT_NOT_PROVISIONED` (mit `detail` in der Antwort).

### Weg A — wie in Produktion (empfohlen zum Testen des echten Flows)

1. In `apps/web/.env.local` (bzw. Host-Env in Staging/Prod) dieselbe **`DATABASE_URL`** setzen wie für die API — siehe [Web-DB](#web-db-stagingprod).
2. Nutzer über das Web-Onboarding registrieren (Keycloak legt `tenant_id` an; `register` provisioniert die Org).

### Weg B — nur API / schnell lokal

Token zuerst holen und **`tenant_id` aus dem Payload lesen** (z. B. [jwt.io](https://jwt.io) oder `jq` auf dekodiertes Payload), dann Seed mit genau dieser ID:

```sh
export DATABASE_URL='postgresql://…'
export SEED_TENANT_ID='<tenant_id_aus_dem_access_token>'
pnpm --filter @repo/db run db:seed
```

Standard-Seed ohne `SEED_TENANT_ID` nutzt **`local-dev-tenant`** — ein Test-Token muss dann dieselbe `tenant_id` im Claim haben.

---

## 4. Access-Token beschaffen

Abhängig von Realm und Client (nur **Beispiel** — Pfade anpassen):

```sh
export KEYCLOAK_BASE='https://<host>'
export REALM='zgwerk'
export CLIENT_ID='<public-client-id>'
export USER='<user>'
export PASS='<password>'

curl -sS -X POST "$KEYCLOAK_BASE/realms/$REALM/protocol/openid-connect/token" \
  -d grant_type=password \
  -d client_id="$CLIENT_ID" \
  -d username="$USER" \
  -d password="$PASS" \
| jq -r .access_token
```

Password-Grant ist oft nur in **Development** erlaubt. Alternativen: Authorization-Code-Flow wie die Web-App, oder ein dedizierter Test-Client mit passender Policy.

Token exportieren:

```sh
export ACCESS_TOKEN='<access_token>'
```

---

## 5. API aufrufen

```sh
export API_BASE='http://127.0.0.1:4000'

curl -sS -H "Authorization: Bearer $ACCESS_TOKEN" "$API_BASE/v1/me"

curl -sS -X POST "$API_BASE/v1/sync" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"550e8400-e29b-41d4-a716-446655440000","mutations":[]}'
```

Oder:

```sh
ACCESS_TOKEN="$ACCESS_TOKEN" pnpm --filter api run e2e:keycloak
# optional: API_BASE=http://127.0.0.1:4000
```

Weitere Beispiele: [`http/keycloak-e2e.http`](./http/keycloak-e2e.http).

---

## 6. Erwartete Ergebnisse

| Schritt                   | Erfolg                                              | Typische Fehler                                                                                       |
| ------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `/v1/me`                  | **200**, JSON mit `sub`, `tenantId`, `organization` | 401 `INVALID_TOKEN`, 403 `TENANT_NOT_PROVISIONED`, 503 `AUTH_NOT_CONFIGURED` / `DATABASE_UNAVAILABLE` |
| `/v1/sync` (leerer Batch) | **200**, `{ "results": [] }`                        | gleiche Auth-Fehler wie oben; 400 `INVALID_BODY` bei kaputtem JSON                                    |

Response-Header **`x-request-id`** korreliert mit den API-Logs.

---

## Web-DB (Staging/Prod)

Ohne **`DATABASE_URL`** im Web wird die Mandanten-Provision **still übersprungen** (`tryProvisionOrganizationAfterSignup`). Lokal ist das unkritisch; **Staging/Prod** müssen die Variable setzen (gleiche DB wie `apps/api`).

- Konfiguration im Hosting (Vercel/…) — nicht im Repo.
- Bei **`NODE_ENV=production`** ohne Variable erscheint eine **Warnung** in den Server-Logs (`[web/db] DATABASE_URL fehlt …`, einmal pro Prozess), damit das nicht unbemerkt bleibt.

Details: [`apps/web/AGENTS.md`](../web/AGENTS.md) (Tabelle + Checkliste).

---

## CI und Keycloak

- **Standard-CI** (`.github/workflows/ci.yml`): `lint`, `check-types`, `build`, Design-Guardrails, optional Playwright — **ohne** Keycloak und **ohne** `e2e:keycloak`.
- **Grund:** stabiler Runner, keine Realm-URL/Clients/Secrets im Repo, kein Flake durch externes IdP.
- **Später möglich:** eigener Workflow mit **GitHub Secrets** (`KEYCLOAK_*`, Test-User), nur auf `workflow_dispatch` oder `main`, plus erreichbare Keycloak-Instanz — erst sinnvoll, wenn Secrets und Stabilität geklärt sind.

Bis dahin: dieses Runbook + lokales **`pnpm --filter api run e2e:keycloak`** als Abnahme.

---

## Verknüpfungen

| Ressource                    | Pfad                                                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Phase-1-Orchestrierung       | [`scripts/runbook-phase1.sh`](./scripts/runbook-phase1.sh) (`pnpm --filter api run runbook:phase1`)        |
| Roadmap / Akzeptanzkriterien | [`FOUNDATION.md`](./FOUNDATION.md)                                                                         |
| Agent-Kontext API            | [`AGENTS.md`](./AGENTS.md)                                                                                 |
| Web / `DATABASE_URL`         | [`../web/AGENTS.md`](../web/AGENTS.md)                                                                     |
| Prächeck (ohne Token)        | [`scripts/verify-runbook-prereqs.sh`](./scripts/verify-runbook-prereqs.sh)                                 |
| Auth-Env prüfen              | [`scripts/check-auth-env.mts`](./scripts/check-auth-env.mts) (`check:auth-env`)                            |
| Lokales Keycloak (Docker)    | [`../../docker-compose.keycloak.yml`](../../docker-compose.keycloak.yml)                                   |
| Keycloak einrichten (API)    | [`../../scripts/keycloak-bootstrap.mjs`](../../scripts/keycloak-bootstrap.mjs) (`pnpm keycloak:bootstrap`) |
| Token (lokal / Password)     | [`scripts/keycloak-local-token.sh`](./scripts/keycloak-local-token.sh) (`token:local`)                     |
| JWT-Verifikation             | [`src/auth/verify-token.ts`](./src/auth/verify-token.ts)                                                   |
| Web-Provision nach Sign-up   | [`../web/lib/provision-organization.ts`](../web/lib/provision-organization.ts)                             |
| Seed-Skript                  | [`../../packages/db/scripts/seed-organization.ts`](../../packages/db/scripts/seed-organization.ts)         |
