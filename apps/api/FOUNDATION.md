# Fundament absichern — Umsetzungsplan

Dieses Dokument bündelt drei Arbeitspakete, damit API + Auth + Mandant + Betrieb reproduzierbar und produktionsnah sind.

---

## 1. Keycloak / OIDC end-to-end verdrahten

**Ziel:** Ein **echtes** Access-Token (nicht Mock) validiert die API; `/v1/me` und `/v1/sync` sind mit diesem Token testbar.

**Schritt-für-Schritt (lokal):** [**`KEYCLOAK-E2E-RUNBOOK.md`**](./KEYCLOAK-E2E-RUNBOOK.md) — Token → `/v1/me` → `/v1/sync`, Mandant, CI-Hinweis.

### Voraussetzungen

- Keycloak-Realm (z. B. `zgwerk`) und Client(s) wie im Web-Onboarding genutzt.
- **Protokoll-Mapper (Abgleich mit [`verify-token.ts`](./src/auth/verify-token.ts)):**
  1. User-Attribut `tenant_id` in Keycloak gesetzt (wie beim Onboarding).
  2. Mapper-Typ **User Attribute** → Claim-Name = Wert von **`AUTH_TENANT_CLAIM`** (Standard **`tenant_id`**), Token-Claim-Typ **String**, in **Access-Token** einschließen.
  3. Optional: gleicher Claim-Name im ID-Token, falls Clients ihn dort erwarten — die API liest nur das **Access-Token**.
- API-Umgebung: `AUTH_OIDC_ISSUER` **oder** `AUTH_KEYCLOAK_BASE_URL` + `AUTH_KEYCLOAK_REALM`; optional `AUTH_OIDC_AUDIENCE` wenn der Token eine feste Audience hat.

### Umsetzungsschritte

| #   | Aufgabe                                                                                                          | Ergebnis                                      |
| --- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 1.1 | Keycloak-Mapper dokumentieren / abgleichen mit [`verify-token.ts`](./src/auth/verify-token.ts)                   | Claim landet im Access-Token                  |
| 1.2 | Token beschaffen (Password-Grant lokal, oder Client-Credentials nur für Tests, oder Login-Flow wie spätere Apps) | Reproduzierbarer Befehl/Skript                |
| 1.3 | `curl` / HTTP-Datei: `GET /v1/me`, `POST /v1/sync` mit `Authorization: Bearer`                                   | 200/4xx erwartbar, kein `auth_not_configured` |
| 1.4 | **`pnpm --filter api run e2e:keycloak`** (`ACCESS_TOKEN`, optional `API_BASE`)                                   | GET `/v1/me` + POST `/v1/sync`                |

**HTTP-Beispiele:** [`http/keycloak-e2e.http`](./http/keycloak-e2e.http) · **Runbook:** [`KEYCLOAK-E2E-RUNBOOK.md`](./KEYCLOAK-E2E-RUNBOOK.md)

### Akzeptanzkriterien

- [ ] Mit gültigem Token: `GET /v1/me` liefert `sub`, `tenantId`, `organization`, wenn Mandant existiert (Paket 2).
- [ ] Mit ungültigem/abgelaufenem Token: 401 `invalid_token` (oder klarer Fehlercode).
- [ ] Ohne Issuer-Konfiguration: 503 `auth_not_configured` (bestehendes Verhalten) bleibt definiert.

---

## 2. Mandanten-Lebenszyklus (`organizations`)

**Ziel:** Kein „grüner“ User mit gültigem Token stößt dauerhaft auf **`tenant_not_provisioned`**, ohne dass klar ist, wann die Zeile entsteht.

### Entscheidung (Source of truth)

**Option A — nach erfolgreicher Web-Registrierung:** `apps/web` ruft serverseitig `provisionOrganizationIfAbsent` auf ([`provision-organization.ts`](../../web/lib/provision-organization.ts)), sobald Keycloak `tenant_id` + Nutzerattribute gesetzt hat. **Idempotenz:** gleiche `tenant_id` → höchstens eine Zeile; wiederholter Aufruf ist unkritisch.

**Option B/C** (Lazy beim ersten `/v1/me` / async Worker): aktuell nicht umgesetzt; bei Bedarf ergänzen.

### Weitere Optionen (nicht umgesetzt)

| Option | Kurzbeschreibung                                         |
| ------ | -------------------------------------------------------- |
| **B**  | Lazy-Upsert beim ersten `/v1/me` (nur mit klarer Policy) |
| **C**  | Asynchron über Queue/Worker                              |

**Stand Code (A):** [`register/route.ts`](../../web/app/api/onboarding/register/route.ts) ruft [`tryProvisionOrganizationAfterSignup`](../../web/lib/provision-organization.ts) auf (`@repo/db` / `provisionOrganizationIfAbsent`). Ohne `DATABASE_URL` in `web` wird übersprungen.

### Umsetzungsschritte

| #   | Aufgabe                                                                                                            | Ergebnis                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| 2.1 | Entscheidung A/B/C festhalten (dieses Dokument + Kurz-ADR optional)                                                | Option A festgehalten (siehe §2)                                       |
| 2.2 | Implementierung: z. B. nach `register` Erfolg → Insert `organizations` (Transaktion / Idempotenz nach `tenant_id`) | Kein manueller Seed für echte Nutzer nötig                             |
| 2.3 | Optional: `db:seed` nur bei Bedarf (Smoke provisioniert Mandanten selbst)                                         | Dokumentiert in [`packages/db/AGENTS.md`](../../packages/db/AGENTS.md) |
| 2.4 | Fehlerbild: wenn Keycloak-User ohne Org → 403 + Support-Hinweis / Retry nach Provisionierung                       | Einheitliche JSON-Struktur                                             |

### Akzeptanzkriterien

- [ ] Neuer Nutzer durchläuft Registrierung und hat **ohne manuelles SQL** eine Zeile in `organizations` (wenn Option A; setzt `DATABASE_URL` in `web` voraus).
- [ ] `tenant_id` in DB = `tenant_id` im JWT.
- [x] Dokumentiert: Duplikat / Wiederholung — `provisionOrganizationIfAbsent` ist idempotent nach `tenant_id` ([`packages/db`](../../packages/db/AGENTS.md)); API-403 enthält `detail` bei `TENANT_NOT_PROVISIONED`.

---

## 3. Observability (minimal, API)

**Ziel:** Probleme in Staging/Prod schneller eingrenzen, ohne gleich APM-Vollausstattung.

### Umsetzungsschritte

| #   | Aufgabe                                                                                                                                                             | Ergebnis                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| 3.1 | **Request-ID:** Middleware setzt `X-Request-Id` (eingehend übernehmen oder UUID generieren), in Logs mitschreiben                                                   | Korrelation pro Request          |
| 3.2 | **Strukturierte Logs:** JSON-Zeilen oder einheitliches Prefix (`level`, `msg`, `requestId`, `path`, `tenantId` nur wenn auth)                                       | Lesbar in Log-Aggregatoren       |
| 3.3 | **Fehlercodes:** Bestehende `{ error: string }` um stabile Codes erweitern (`code` + `message`), besonders `/v1/sync` (`invalid_body`, `tenant_not_provisioned`, …) | Clients können gezielt reagieren |
| 3.4 | **Health:** `GET /health`, `GET /v1/health/db`; **`GET /ready`** prüft DB (ohne Auth) — optional später Keycloak-Reachability                                       | Deployments sicher               |

### Akzeptanzkriterien

- [x] Jede Request-Zeile enthält dieselbe Request-ID wie Response-Header (wenn generiert).
- [x] Kritische Fehler (5xx): unbehandelte Exceptions loggen **Stack nur in `NODE_ENV=development`** (sonst nur `msg`); Antwort immer `{ code: "INTERNAL_SERVER_ERROR" }` ohne Stack.
- [x] Sync-Antworten: `results[].status` dokumentiert; siehe Hinweis unten zu `results[].error`.

**Hinweis Sync:** `results[].error` bei `rejected` enthält Validierungs-/Fachfehler (z. B. Zod) — für Clients zum Debuggen gedacht, keine Geheimnisse; trotzdem keine Roh-SQL- oder Stack-Traces in JSON-Antworten.

---

## Reihenfolge & Meilenstein

1. **Paket 2 (Mandant)** und **Paket 1 (Keycloak E2E)** eng zusammen — ohne Org kein sinnvolles `/v1/me`.
2. **Paket 3 (Observability)** parallel oder direkt nach 1+2, damit Integrationstests nicht blind sind.

**Meilenstein „Fundament grün“:** Registrierung → Token mit `tenant_id` → `GET /v1/me` 200 → `POST /v1/sync` 200 mit mindestens einer Mutation; Logs mit Request-ID nachvollziehbar.

### Operative Reihenfolge (nach lokalem Prächeck)

Siehe Tabelle in [`KEYCLOAK-E2E-RUNBOOK.md`](./KEYCLOAK-E2E-RUNBOOK.md) — insbesondere **`pnpm --filter api run runbook:phase1`** (Prächeck; mit `ACCESS_TOKEN` auch E2E).

**Danach (Fachdomäne):** Verträge und Typen in **`@repo/api-contracts`** erweitern, Sync-Routen und DB-Schema in **`apps/api`** / **`@repo/db`** anpassen — erst sinnvoll, wenn Schritt Token → `/v1/me` → `/v1/sync` bei euch grün ist.

---

## Verknüpfungen

- Durchgängiger Keycloak-E2E-Ablauf: [`KEYCLOAK-E2E-RUNBOOK.md`](./KEYCLOAK-E2E-RUNBOOK.md)
- Auth/JWT: [`src/auth/verify-token.ts`](./src/auth/verify-token.ts)
- Mandant: [`src/auth/org-middleware.ts`](./src/auth/org-middleware.ts), Schema [`packages/db/src/schema.ts`](../../packages/db/src/schema.ts)
- Web-Onboarding: [`apps/web/app/api/onboarding/register/`](../../web/app/api/onboarding/register/)
