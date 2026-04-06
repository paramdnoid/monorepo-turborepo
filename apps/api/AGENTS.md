# AGENTS.md — apps/api

**Read this when:** du die HTTP-API, Health-Checks, Datenbankanbindung oder Sync-Endpunkte änderst.

## Zweck

Backend-Dienst (**Hono**) für Mandantenfachlogik, Offline-Sync und Integrationen. Läuft getrennt von Next.js (`web`).

**Roadmap „Fundament absichern“** (Keycloak E2E, Mandanten-Lebenszyklus, Observability): [`FOUNDATION.md`](./FOUNDATION.md).

**Keycloak E2E (Token → `/v1/me` → `/v1/sync`, Org, CI):** [`KEYCLOAK-E2E-RUNBOOK.md`](./KEYCLOAK-E2E-RUNBOOK.md).

## Befehle

```sh
pnpm exec turbo run dev --filter=api
pnpm exec turbo run build --filter=api
pnpm exec turbo run lint --filter=api
pnpm exec turbo run check-types --filter=api
pnpm --filter api run e2e:keycloak   # ACCESS_TOKEN=… (echtes Keycloak-Token)
pnpm --filter api run verify:runbook-prereqs   # API läuft? /health + /ready (ohne Token)
pnpm --filter api run runbook:phase1           # Prächeck; mit ACCESS_TOKEN=… auch e2e:keycloak
pnpm --filter api run check:auth-env         # Issuer/JWKS prüfen (nach AUTH_* in Repo-Root .env.local)
```

`dev` baut zuerst `@repo/api-contracts` und `@repo/db` (`^build`).

## Pfade

| Pfad                                                                                                         | Rolle                                                                        |
| ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| [`src/server.ts`](./src/server.ts)                                                                           | Einstieg, lädt Repo-Root `.env` und `.env.local`, dann HTTP-Server           |
| [`src/app.ts`](./src/app.ts)                                                                                 | Routen, `createApp()` (optional Test-Injection)                              |
| [`src/env.ts`](./src/env.ts)                                                                                 | Zod-Umgebungsvariablen                                                       |
| [`src/auth/verify-token.ts`](./src/auth/verify-token.ts)                                                     | Keycloak JWKS + `tenant_id`-Claim                                            |
| [`src/auth/middleware.ts`](./src/auth/middleware.ts)                                                         | `Authorization: Bearer`                                                      |
| [`src/auth/org-middleware.ts`](./src/auth/org-middleware.ts)                                                 | Mandantenzeile in `organizations`                                            |
| [`src/middleware/request-context.ts`](./src/middleware/request-context.ts)                                   | `X-Request-Id` + JSON-Access-Log (`tenantId` nach erfolgreicher JWT-Prüfung) |
| [`KEYCLOAK-E2E-RUNBOOK.md`](./KEYCLOAK-E2E-RUNBOOK.md)                                                       | Durchgängiger Ablauf Keycloak + Org + curl / `e2e:keycloak` + CI-Hinweis     |
| [`scripts/runbook-phase1.sh`](./scripts/runbook-phase1.sh)                                                   | Prächeck + optional E2E (`runbook:phase1`)                                   |
| [`scripts/check-auth-env.mts`](./scripts/check-auth-env.mts)                                                 | Issuer + optional JWKS (`check:auth-env`)                                    |
| [`http/keycloak-e2e.http`](./http/keycloak-e2e.http)                                                         | Beispiel-Requests (Bearer nach Web-Onboarding / Runbook)                     |
| [`src/routes/*.ts`](./src/routes/)                                                                           | Domain-Routen (siehe unten); **`app.ts`** mountet alles unter `/v1`          |
| [`src/routes/me.ts`](./src/routes/me.ts)                                                                     | `GET /v1/me`                                                                 |
| [`src/routes/sync.ts`](./src/routes/sync.ts)                                                                 | `POST /v1/sync`                                                              |
| [`src/routes/customers.ts`](./src/routes/customers.ts)                                                       | Kunden + Adressen                                                            |
| [`src/routes/employees.ts`](./src/routes/employees.ts)                                                       | Personal, Skills, Anhänge, Urlaub/Krank, Activity                            |
| [`src/routes/scheduling.ts`](./src/routes/scheduling.ts)                                                     | Einsatzplanung / ICS                                                         |
| [`src/routes/sales.ts`](./src/routes/sales.ts)                                                               | Angebote + Rechnungen                                                        |
| [`src/routes/organization.ts`](./src/routes/organization.ts)                                                 | Mandant + Logo                                                               |
| [`src/routes/projects.ts`](./src/routes/projects.ts) + [`project-assets.ts`](./src/routes/project-assets.ts) | Projekte + Assets                                                            |
| [`src/routes/gaeb.ts`](./src/routes/gaeb.ts)                                                                 | GAEB-Imports (`@repo/gaeb`)                                                  |
| [`src/routes/catalog.ts`](./src/routes/catalog.ts)                                                           | Katalog-Imports (`@repo/bmecat`, `@repo/datanorm`)                           |
| [`src/routes/datev.ts`](./src/routes/datev.ts)                                                               | DATEV-Einstellungen + Export (`@repo/datev-export`)                          |
| [`src/routes/employee-activity-log.ts`](./src/routes/employee-activity-log.ts)                               | Aktivitätsprotokoll Mitarbeitende                                            |
| [`src/db.ts`](./src/db.ts)                                                                                   | Lazy `DATABASE_URL` → Pool                                                   |
| [`/.env.example`](../../.env.example) (Repo-Root)                                                            | DB, Port, OIDC/Keycloak (gemeinsam mit `web` / `desktop`)                    |

## Routen

**Quelle der Wahrheit:** alle HTTP-Pfade werden in [`src/app.ts`](./src/app.ts) registriert (`app.route("/v1", v1)`). Die folgende Übersicht ist eine **Domain-Karte**; bei Abweichung gilt **`app.ts`**.

| Bereich                | Öffentlich (ohne JWT)                            | Unter `/v1` (Bearer + Org)                        |
| ---------------------- | ------------------------------------------------ | ------------------------------------------------- |
| Health                 | `GET /health`, `GET /ready`, `GET /v1/health/db` | —                                                 |
| Auth / Mandant         | —                                                | `GET /me`, `PATCH /organization`, Logo, …         |
| Kunden                 | —                                                | `customers`, Adressen                             |
| Personal               | —                                                | `employees` (+ Skills, Urlaub, Krank, Anhänge, …) |
| Planung                | —                                                | `scheduling`                                      |
| Verkauf                | —                                                | `sales` (Angebote, Rechnungen, PDF)               |
| Projekte               | —                                                | `projects`, Projekt-Assets                        |
| GAEB / Katalog / DATEV | —                                                | `gaeb`, `catalog`, `datev`                        |
| Sync                   | —                                                | `POST /sync`                                      |

**Keycloak:** Access-Token muss den Claim `tenant_id` (oder `AUTH_TENANT_CLAIM`) enthalten — per **Protokoll-Mapper** vom User-Attribut `tenant_id` wie beim Onboarding (`register`).

**Migrationen:** [`../../packages/db/drizzle/`](../../packages/db/drizzle/) — `pnpm --filter @repo/db exec drizzle-kit migrate`

## Lokaler End-to-End-Ablauf (Postgres + Seed + Smoke)

1. Postgres starten, z. B. `docker compose -f docker-compose.postgres.yml up -d` (siehe Repo-Root).
2. Repo-Root: `cp .env.example .env.local` (falls noch nicht vorhanden) — **`DATABASE_URL`** ist in `.env.example` für lokale Compose-Postgres vorbefüllt; Smoke ersetzt sie nur, wenn die Variable fehlt/leer ist.
3. `./scripts/local-api-smoke.sh` — führt Migration und **`pnpm --filter api run smoke:http`** aus (Mock-JWT + echte DB, Mandant wird im Smoke angelegt; kein Keycloak).
4. **Echtes Keycloak-Token + provisionierte Org:** siehe **[`KEYCLOAK-E2E-RUNBOOK.md`](./KEYCLOAK-E2E-RUNBOOK.md)** (`e2e:keycloak`, curl, Weg A/B für `organizations`).

## Workspace

- **`@repo/api-contracts`** — Zod/Typen (Gewerke, Sync-Batches)
- **`@repo/db`** — Drizzle-Schema, PostgreSQL-Client
- **`@repo/datev-export`**, **`@repo/gaeb`**, **`@repo/bmecat`**, **`@repo/datanorm`** — siehe [`packages/*/AGENTS.md`](../../packages/datev-export/AGENTS.md) (Nachbarpakete analog)

## Monorepo

Repo-weit & Skills: **[`../../AGENTS.md`](../../AGENTS.md)** · **[`../../.agents/README.md`](../../.agents/README.md)**.
