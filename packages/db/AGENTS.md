# AGENTS.md — packages/db

**Read this when:** du Drizzle-Schema, Migrationen oder den PostgreSQL-Client änderst.

## Zweck

**Drizzle ORM** + **`pg`** — gemeinsames Schema für `apps/api` und spätere Worker. Migrationen liegen unter [`drizzle/`](./drizzle/).

**Sales / Rechnungen:** Tabelle `sales_invoice_payments` speichert Teilzahlungen je Rechnung (`invoice_id` → `sales_invoices`, Cascade). Aggregierte Zahlungslogik (Saldo, Status/`paidAt`) liegt in **`apps/api`** (`syncInvoicePaymentState` / Rechnungsdetail-Payload), nicht in DB-Triggern.

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

# Optional: Legacy-Projekte sicher an Kunden matchen (Dry-Run default)
pnpm --filter @repo/db run db:backfill-project-customers

# Programmatisch: `provisionOrganizationIfAbsent` aus [`src/provision.ts`](./src/provision.ts) (u. a. von `web` nach Registrierung) — idempotent nach `tenant_id`
```

## Monorepo

Repo-weit & Skills: **[`../../AGENTS.md`](../../AGENTS.md)** · **[`../../.agents/README.md`](../../.agents/README.md)**.
