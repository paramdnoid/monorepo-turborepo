# Runbook: Token → `/v1/me` → `/v1/sync` (echtes Keycloak + provisionierte Org)

Dieses Dokument ist der **durchgängige Referenzablauf** für Entwicklung und manuelle Abnahme. **CI** führt diesen Pfad **nicht** aus (kein Keycloak im Standard-Workflow, keine Secrets-Pflicht) — siehe [CI und Keycloak](#ci-und-keycloak).

### Entwicklung zuerst lokal abschließen (ohne Produktion)

Sinnvolle Reihenfolge: **alles auf dem eigenen Rechner** (Postgres, ggf. Keycloak in Docker, `apps/api` + `apps/web` mit `.env.local`) **vollständig durchtesten** — erst danach Hosting, Domain ([zunftgewerk.de](https://zunftgewerk.de/)) und produktive Secrets.

**Checkliste „Dev fertig“ (Minimal)**

1. Postgres + Migrationen; `pnpm --filter api run verify:runbook-prereqs` → `/health` und `/ready` **200**
2. Keycloak **lokal** ([§1b](#1b-lokales-keycloak-docker--einmalig-einrichten)) oder Dev-Instanz — `AUTH_KEYCLOAK_BASE_URL` / Realm gesetzt (kein Platzhalter, sobald du Tokens testen willst)
3. `pnpm --filter api run check:auth-env` (ohne `--skip-network`, sobald Keycloak erreichbar) → Well-known/JWKS **OK**
4. **`apps/web`** dieselbe **`DATABASE_URL`** in `.env.local` wie die API → **`/onboarding`** einmal durchlaufen → Mandant liegt in **`organizations`** (wie in Produktion)
5. **JWT für API-Tests:** Wert des Cookies **`zgwerk_access_token`** in den DevTools kopieren → als `ACCESS_TOKEN` exportieren (oder optional curl, [§4](#4-access-token-beschaffen))
6. `ACCESS_TOKEN="…" pnpm --filter api run runbook:phase1` → `/v1/me` und `/v1/sync` **200**

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
3. Web **`/onboarding`** mit gleicher `DATABASE_URL` → Zeile in **`organizations`** (gleiche **`tenant_id`** wie im JWT)
4. **Access-Token:** Cookie **`zgwerk_access_token`** (nach Registrierung) oder optional curl [§4](#4-access-token-beschaffen)
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

Nach dem Container-Start **Realm `zgwerk`**, Client **`zgwerk-cli`** und Mapper **`tenant_id`** anlegen (Nutzer **nicht** — Registrierung über **Web-Onboarding** oder manuell in Keycloak):

```sh
# Repo-Root (Keycloak muss laufen)
pnpm keycloak:bootstrap
```

Details und Umgebungsvariablen: [`scripts/keycloak-bootstrap.mjs`](../../scripts/keycloak-bootstrap.mjs). Anschließend `check:auth-env` und Web-Onboarding — JWT wie in [JWT nach Registrierung](#jwt-nach-registrierung-ohne-extra-user).

### Keycloak-Oberfläche (manuell, falls du nicht skripten willst)

1. **http://localhost:8080** → **Administration Console** anmelden.
2. **Realm anlegen:** Realm `zgwerk` (Name exakt so, passend zu `AUTH_KEYCLOAK_REALM`).
3. **Client** (Realm `zgwerk`): **Clients** → **Create client**
   - **Client ID:** z. B. `zgwerk-cli`
   - **Client authentication:** **Off** (public)
   - **Valid redirect URIs:** `http://localhost:3000/*` (Web-Dev)
   - Unter **Capability config:** **Direct access grants** aktivieren (für Password-Grant / Skript — nur lokal).
4. **Mapper `tenant_id`:** Client `zgwerk-cli` → **Client scopes** → **Dedicated scope** für diesen Client → **Add mapper** → **User Attribute**
   - **User Attribute:** `tenant_id`
   - **Token claim name:** `tenant_id`
   - **Claim JSON type:** String
   - **Add to access token:** An
5. **Nutzer:** über **Web-Onboarding** (`apps/web`) oder in Keycloak **Users** → User anlegen → **Credentials** → Tab **Attributes** → **`tenant_id`** wie im Token / in der DB (siehe §3).

### JWT nach Registrierung (ohne Extra-User)

Nach erfolgreichem **`/onboarding`** liegt das Access-Token im **httpOnly-Cookie** **`zgwerk_access_token`**.

1. Web-App und API laufen (`pnpm exec turbo run dev --filter=web` bzw. `--filter=api`).
2. Registrierung abschließen — gleiche Datenbank wie bei der API (`DATABASE_URL`).
3. **Entwicklertools** → **Anwendung** / **Speicher** → **Cookies** → **`zgwerk_access_token`** kopieren.
4. Im Terminal: `export ACCESS_TOKEN='<eingefügter_Wert>'` und z. B. `pnpm --filter api run e2e:keycloak` oder die Requests aus [§5](#5-api-aufrufen).

Es ist **kein** separates `.env`-Paar für einen Test-User nötig — du nutzt genau den Account aus der Registrierung.

Optional (nur lokal, ohne Browser): Password-Grant per curl — [§4](#4-access-token-beschaffen).

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

Ohne `SEED_TENANT_ID` nutzt das Seed-Skript **`local-dev-tenant`** — der Token muss dieselbe `tenant_id` im Claim haben (oder `SEED_TENANT_ID` auf den Claim setzen).

---

## 4. Access-Token beschaffen

**Standard:** JWT aus dem Cookie **`zgwerk_access_token`** nach **`/onboarding`** (siehe [oben](#jwt-nach-registrierung-ohne-extra-user)).

**Alternativ (nur lokal, curl):** Password-Grant mit **denselben** Zugangsdaten wie nach der Registrierung — kein separater Test-Account nötig. Realm und Client anpassen:

```sh
export KEYCLOAK_BASE='https://<host>'
export REALM='zgwerk'
export CLIENT_ID='<public-client-id>'
export USER='<ihre-registrierungs-email>'
export PASS='<ihr-passwort>'

curl -sS -X POST "$KEYCLOAK_BASE/realms/$REALM/protocol/openid-connect/token" \
  -d grant_type=password \
  -d client_id="$CLIENT_ID" \
  -d username="$USER" \
  -d password="$PASS" \
| jq -r .access_token
```

Password-Grant ist oft nur in **Development** erlaubt. In der Web-App läuft derselbe Flow über den Login bzw. die Registrierung (Authorization-Code bzw. Password-Grant je nach Client — siehe Keycloak-Client `zgwerk-cli`).

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
| JWT nach Onboarding          | Cookie `zgwerk_access_token` in DevTools — [§1b](#jwt-nach-registrierung-ohne-extra-user)                    |
| JWT-Verifikation             | [`src/auth/verify-token.ts`](./src/auth/verify-token.ts)                                                   |
| Web-Provision nach Sign-up   | [`../web/lib/provision-organization.ts`](../web/lib/provision-organization.ts)                             |
| Seed-Skript                  | [`../../packages/db/scripts/seed-organization.ts`](../../packages/db/scripts/seed-organization.ts)         |
