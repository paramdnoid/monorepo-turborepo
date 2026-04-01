# web (apps/web)

Primäre Next.js-App (Port **3000**) für Produkt-Landing, Onboarding und rechtliche Seiten.

## Stack

- Next.js 16 (App Router)
- React 19
- Tailwind CSS 4
- Shared Packages: `@repo/ui`, `@repo/fonts`, `@repo/brand`

## Wichtige Pfade

- `app/page.tsx` – Landingpage
- `app/onboarding/page.tsx` – Onboarding-Flow
- `app/legal/*` – Impressum, AGB, Datenschutz
- `app/api/onboarding/*` – Onboarding-Backend-Routen
- `content/*` – Produkttexte, Features, FAQs, Gewerke

## Befehle

Vom Repo-Root:

```bash
pnpm exec turbo run dev --filter=web
pnpm exec turbo run lint --filter=web
pnpm exec turbo run check-types --filter=web
pnpm exec turbo run build --filter=web
```

Im Verzeichnis `apps/web`:

```bash
pnpm dev
pnpm lint
pnpm check-types
pnpm build
```

## Umgebung

- **`apps/web/.env.example`** — alle Variablen mit Kurzkommentaren.
- **`apps/web/.env.local.example`** — lokales Dev-Setup (Postgres + Keycloak auf Port 8080, Client `zgwerk-cli`): nach `.env.local` kopieren und anpassen.

Lokal Keycloak: `docker compose -f ../../docker-compose.keycloak.yml up -d`, dann `pnpm keycloak:bootstrap` (Repo-Root). Siehe `apps/web/AGENTS.md`.

Weitere wichtige Variablen: `NEXT_PUBLIC_SITE_URL`, Stripe (`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, Preis-IDs), Keycloak/OIDC für Onboarding und `/login`.

## Hinweise

- Für vollständigen Kontext siehe `apps/web/AGENTS.md`.
- Monorepo-weite Informationen stehen im Root-`README.md` und `AGENTS.md`.
