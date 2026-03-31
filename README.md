# zgwerkrepo

Monorepo mit [Turborepo](https://turborepo.dev), einer [Next.js](https://nextjs.org/) App und mehreren internen Shared-Packages.

## Apps und Packages (Kurzüberblick)

### Apps

- `apps/web` (`web`) – primäre Produkt-/Marketingseite auf Port **3000**
- `apps/mobile` (`mobile`) – Expo / React Native (Metro, Gerät oder Simulator)

### Shared Packages

- `@repo/ui` – gemeinsame UI-Komponenten + globale Styles
- `@repo/fonts` – Geist-Fonts für Next.js
- `@repo/brand` – zentrales Brand-Logo
- `@repo/eslint-config` – ESLint Flat Configs
- `@repo/typescript-config` – `tsconfig`-Basen
- `@repo/tailwind-config` – Tailwind/PostCSS Shared Config
- `@repo/playwright-web` – Playwright-E2E für `web`

## Repository-Layout

| Pfad | Rolle |
| ---- | ----- |
| `apps/` | Apps (`web`, `api`, `desktop`, `mobile`) |
| `packages/` | Interne Packages (`@repo/*`) |
| `scripts/` | Root-Hilfsskripte (z. B. Design-Guardrails, Keycloak-Bootstrap) |
| `.agents/skills-lock.json` | optional: Skill-Install-Metadaten (Cursor/Codex) |
| `turbo.json` / `pnpm-workspace.yaml` | Turborepo und pnpm-Workspaces |
| `prettier.config.mjs` | Prettier (wird von `pnpm format` genutzt) |

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
| `pnpm test`        | Führt verfügbare Test-Tasks aus (siehe `package.json` in `web`, `api`, …)        |
| `pnpm e2e`         | Führt E2E-Tests aus (Playwright-Package, falls betroffen/konfiguriert)         |
| `pnpm format`      | Formatiert TypeScript/Markdown gemäß Root-Prettier-Setup                        |

## Gefilterte Turbo-Beispiele

```sh
pnpm exec turbo run dev --filter=web

pnpm exec turbo run lint --filter=@repo/ui
pnpm exec turbo run check-types --filter=web
pnpm exec turbo run build --filter=web
```

## Architekturhinweise

- Die Next.js App (`web`) nutzt `@repo/ui`, `@repo/fonts` und `@repo/brand`.
- Produktinhalte liegen unter `apps/web/content`.

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
- App-spezifische Hinweise: [`apps/web/AGENTS.md`](./apps/web/AGENTS.md)
