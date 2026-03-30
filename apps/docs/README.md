# docs

Dokumentations- und Hilfeseite (Next.js App Router) für ZunftGewerk auf Port **3001**.

## Zweck

`docs` stellt strukturierte Produktdokumentation, FAQ, Sicherheits- und Tarifinformationen bereit.

Die Seite verwendet:

- gemeinsame UI-Bausteine aus `@repo/ui`
- gemeinsame Brand-/Font-Assets aus `@repo/brand` und `@repo/fonts`
- produktbezogene Inhalte aus `apps/web/content/*` (z. B. `@web/content/ui-text`, `@web/content/faqs`)

## Wichtige Pfade

- `app/layout.tsx` – Root-Layout inkl. Fonts/Providers
- `app/page.tsx` – Einstieg der Dokumentation
- `components/documentation-sections.tsx` – Inhalte/Abschnitte inkl. FAQ JSON-LD
- `components/docs-shell.tsx` – Seitenrahmen mit Header/TOC/Footer
- `content/docs-nav.ts` – TOC-Struktur

## Lokale Entwicklung

Vom Repo-Root:

```sh
pnpm exec turbo dev --filter=docs
```

Alternativ aus diesem Verzeichnis:

```sh
pnpm dev
```

Dann unter `http://localhost:3001` öffnen.

## Qualitätssicherung

Vom Repo-Root:

```sh
pnpm exec turbo lint --filter=docs
pnpm exec turbo check-types --filter=docs
pnpm exec turbo build --filter=docs
```

## Hinweise

- Für produktweite Betriebs-/Stack-Regeln siehe `../../AGENTS.md`.
- Für app-spezifische Agentenhinweise siehe `./AGENTS.md`.
