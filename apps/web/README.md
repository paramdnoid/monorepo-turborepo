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
pnpm exec turbo dev --filter=web
pnpm exec turbo lint --filter=web
pnpm exec turbo check-types --filter=web
pnpm exec turbo build --filter=web
```

Im Verzeichnis `apps/web`:

```bash
pnpm dev
pnpm lint
pnpm check-types
pnpm build
```

## Umgebung

Als Vorlage dient `apps/web/.env.example` (keine Secrets committen).
Wichtige Variablen:

- `NEXT_PUBLIC_SITE_URL`
- Stripe-Konfiguration (`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, Preis-IDs)
- Keycloak/OIDC-Konfiguration für Onboarding-Registrierung

## Hinweise

- Für vollständigen Kontext siehe `apps/web/AGENTS.md`.
- Monorepo-weite Informationen stehen im Root-`README.md` und `AGENTS.md`.
