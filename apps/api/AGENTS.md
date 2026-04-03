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

| Pfad                                                                       | Rolle                                                                        |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [`src/server.ts`](./src/server.ts)                                         | Einstieg, lädt Repo-Root `.env` und `.env.local`, dann HTTP-Server           |
| [`src/app.ts`](./src/app.ts)                                               | Routen, `createApp()` (optional Test-Injection)                              |
| [`src/env.ts`](./src/env.ts)                                               | Zod-Umgebungsvariablen                                                       |
| [`src/auth/verify-token.ts`](./src/auth/verify-token.ts)                   | Keycloak JWKS + `tenant_id`-Claim                                            |
| [`src/auth/middleware.ts`](./src/auth/middleware.ts)                       | `Authorization: Bearer`                                                      |
| [`src/auth/org-middleware.ts`](./src/auth/org-middleware.ts)               | Mandantenzeile in `organizations`                                            |
| [`src/middleware/request-context.ts`](./src/middleware/request-context.ts) | `X-Request-Id` + JSON-Access-Log (`tenantId` nach erfolgreicher JWT-Prüfung) |
| [`KEYCLOAK-E2E-RUNBOOK.md`](./KEYCLOAK-E2E-RUNBOOK.md)                     | Durchgängiger Ablauf Keycloak + Org + curl / `e2e:keycloak` + CI-Hinweis     |
| [`scripts/runbook-phase1.sh`](./scripts/runbook-phase1.sh)                 | Prächeck + optional E2E (`runbook:phase1`)                                   |
| [`scripts/check-auth-env.mts`](./scripts/check-auth-env.mts)               | Issuer + optional JWKS (`check:auth-env`)                                    |
| [`http/keycloak-e2e.http`](./http/keycloak-e2e.http)                       | Beispiel-Requests (Bearer nach Web-Onboarding / Runbook)                    |
| [`src/routes/sync.ts`](./src/routes/sync.ts)                               | `POST /v1/sync` (Idempotenz, `project`)                                      |
| [`src/routes/me.ts`](./src/routes/me.ts)                                   | `GET /v1/me`                                                                 |
| [`src/db.ts`](./src/db.ts)                                                 | Lazy `DATABASE_URL` → Pool                                                   |
| [`/.env.example`](../../.env.example) (Repo-Root)                          | DB, Port, OIDC/Keycloak (gemeinsam mit `web` / `desktop`)                    |

## Routen

| Methode | Pfad            | Auth                       |
| ------- | --------------- | -------------------------- |
| GET     | `/health`       | nein                       |
| GET     | `/ready`        | nein (DB-Readiness)        |
| GET     | `/v1/health/db` | nein                       |
| GET     | `/v1/me`        | Bearer JWT + Mandant in DB |
| POST    | `/v1/sync`      | Bearer JWT + Mandant in DB |

**Keycloak:** Access-Token muss den Claim `tenant_id` (oder `AUTH_TENANT_CLAIM`) enthalten — per **Protokoll-Mapper** vom User-Attribut `tenant_id` wie beim Onboarding (`register`).

**Migrationen:** [`../../packages/db/drizzle/`](../../packages/db/drizzle/) — `pnpm --filter @repo/db exec drizzle-kit migrate`

## Lokaler End-to-End-Ablauf (Postgres + Seed + Smoke)

1. Postgres starten, z. B. `docker compose -f docker-compose.postgres.yml up -d` (siehe Repo-Root).
2. Repo-Root: `cp .env.example .env.local` (falls noch nicht vorhanden) und `DATABASE_URL` prüfen.
3. `./scripts/local-api-smoke.sh` — führt Migration und **`pnpm --filter api run smoke:http`** aus (Mock-JWT + echte DB, Mandant wird im Smoke angelegt; kein Keycloak).
4. **Echtes Keycloak-Token + provisionierte Org:** siehe **[`KEYCLOAK-E2E-RUNBOOK.md`](./KEYCLOAK-E2E-RUNBOOK.md)** (`e2e:keycloak`, curl, Weg A/B für `organizations`).

## Workspace

- **`@repo/api-contracts`** — Zod/Typen (Gewerke, Sync-Batches)
- **`@repo/db`** — Drizzle-Schema, PostgreSQL-Client

## Monorepo

Root: **[`../../AGENTS.md`](../../AGENTS.md)**.
