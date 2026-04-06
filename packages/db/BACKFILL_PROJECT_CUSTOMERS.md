# Backfill `projects.customer_id`

Dieses Runbook fuellt `projects.customer_id` fuer Legacy-Projekte, die bisher nur `customer_label` als Freitext haben.

## Matching-Regel (safe)

Ein Projekt wird **nur** dann verknuepft, wenn genau **ein** Kundenstammsatz passt:

- gleicher `tenant_id`
- `trim(lower(projects.customer_label)) == trim(lower(customers.display_name))`

Mehrdeutige Matches (mehrere Kunden mit gleichem normalisiertem Namen) werden **nicht** automatisch geschrieben.

## Kommandos

Vom Repo-Root:

```sh
# Dry-Run (Default, keine Writes)
pnpm --filter @repo/db run db:backfill-project-customers

# Dry-Run fuer einen Mandanten
pnpm --filter @repo/db run db:backfill-project-customers -- --tenant=<tenant_id>

# Anwenden (schreibt in DB)
pnpm --filter @repo/db run db:backfill-project-customers -- --apply

# Anwenden fuer einen Mandanten
pnpm --filter @repo/db run db:backfill-project-customers -- --apply --tenant=<tenant_id>
```

## Ergebnis

Das Script gibt aus:

- Anzahl Kandidaten
- Anzahl eindeutiger Matches
- Anzahl mehrdeutiger Matches
- Anzahl ohne Match
- Liste der ersten mehrdeutigen Projekte (zur manuellen Nachpflege)

Bei `--apply` werden nur die eindeutigen Matches geschrieben und `updated_at` aktualisiert.
