# AGENTS.md — packages/db

**Read this when:** du Drizzle-Schema, Migrationen oder den PostgreSQL-Client änderst.

## Zweck

**Drizzle ORM** + **`pg`** — gemeinsames Schema für `apps/api` und spätere Worker. Migrationen liegen unter [`drizzle/`](./drizzle/).

## Befehle

```sh
pnpm exec turbo run build --filter=@repo/db
pnpm exec turbo run check-types --filter=@repo/db
# Migration erzeugen (DATABASE_URL kann Dummy sein für reine Schema-Änderungen):
pnpm --filter @repo/db exec drizzle-kit generate
# Migration anwenden:
pnpm --filter @repo/db exec drizzle-kit migrate

# Optional: Mandant manuell anlegen (meist nicht nötig — `apps/api` smoke:http provisioniert selbst)
pnpm --filter @repo/db run db:seed

# Programmatisch: `provisionOrganizationIfAbsent` aus [`src/provision.ts`](./src/provision.ts) (u. a. von `web` nach Registrierung) — idempotent nach `tenant_id`
```

## Monorepo

Root: **[`../../AGENTS.md`](../../AGENTS.md)**.
