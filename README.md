# my-turborepo

Monorepo mit [Turborepo](https://turborepo.dev), zwei [Next.js](https://nextjs.org/) Apps, einer [React Native](https://reactnative.dev/) App und mehreren internen Shared-Packages.

## Apps und Packages (Kurzüberblick)

### Apps

- `apps/web` (`web`) – primäre Produkt-/Marketingseite auf Port **3000**
- `apps/docs` (`docs`) – Dokumentationsseite auf Port **3001**
- `apps/native` (`native`) – React-Native App (WebView-first, optional NativeWind-UI)

### Shared Packages

- `@repo/ui` – gemeinsame UI-Komponenten + globale Styles
- `@repo/fonts` – Geist-Fonts für Next.js
- `@repo/brand` – zentrales Brand-Logo
- `@repo/turborepo-starter` – shared Starter-Copy/URLs
- `@repo/eslint-config` – ESLint Flat Configs
- `@repo/typescript-config` – `tsconfig`-Basen
- `@repo/tailwind-config` – Tailwind/PostCSS Shared Config
- `@repo/playwright-web` – Playwright-E2E für `web`

## Voraussetzungen

- Node.js **>= 22.11.0**
- pnpm **9**

## Setup

Vom Repo-Root:

```sh
pnpm install
```

## Wichtige Root-Skripte

| Script             | Beschreibung                                                                    |
| ------------------ | ------------------------------------------------------------------------------- |
| `pnpm dev`         | Startet alle `dev`-Tasks via Turborepo                                         |
| `pnpm build`       | Baut alle Build-Targets                                                         |
| `pnpm lint`        | Lint über Workspace + Design-Guardrails                                         |
| `pnpm check-types` | Type-Checks über Workspace                                                      |
| `pnpm test`        | Führt verfügbare Test-Tasks aus (aktuell v. a. `apps/native`)                  |
| `pnpm e2e`         | Führt E2E-Tests aus (Playwright-Package, falls betroffen/konfiguriert)         |
| `pnpm format`      | Formatiert TypeScript/Markdown und RN-Konfig-Dateien gemäß Root-Prettier-Setup |

## Gefilterte Turbo-Beispiele

```sh
pnpm exec turbo dev --filter=web
pnpm exec turbo dev --filter=docs
pnpm exec turbo dev --filter=native

pnpm exec turbo lint --filter=@repo/ui
pnpm exec turbo check-types --filter=web
pnpm exec turbo build --filter=docs
```

## Architekturhinweise

- Next.js Apps (`web`, `docs`) nutzen `@repo/ui`, `@repo/fonts` und `@repo/brand`.
- `apps/docs` nutzt für Produktinhalte gezielt Module aus `apps/web/content` (`@web/...`-Alias).
- `apps/native` läuft standardmäßig als WebView auf die `web`-App; Native-UI ist per Feature-Flag möglich.

## Umgebungsvariablen

- Beispielwerte liegen unter `apps/web/.env.example`.
- Keine Secrets committen; lokale Werte in `.env.local` bzw. Secret-Store halten.

## CI

Siehe [`.github/workflows/ci.yml`](./.github/workflows/ci.yml):

- `lint`, `check-types`, `build` (bei PRs über `--affected`)
- separater Design-Guardrail-Check
- bedingte Playwright-E2E-Ausführung

## Weitere Orientierung

- Agent-/Repo-Konventionen: [`AGENTS.md`](./AGENTS.md)
- App-spezifische Hinweise:
  - [`apps/web/AGENTS.md`](./apps/web/AGENTS.md)
  - [`apps/docs/AGENTS.md`](./apps/docs/AGENTS.md)
  - [`apps/native/AGENTS.md`](./apps/native/AGENTS.md)
