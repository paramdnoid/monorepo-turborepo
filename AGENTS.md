# AGENTS.md

This file provides context for AI coding agents working in this repository. **Start here**, then open app- or package-local `AGENTS.md` only for path-specific detail.

## Agent- und Skill-Setup

| Was                                                          | Wo                                                    |
| ------------------------------------------------------------ | ----------------------------------------------------- |
| **Repo-Regeln** (Stack, Turbo, CI, Env, Web-UI-Richtlinien)  | Diese Datei                                           |
| **Skill-Index** (Turborepo-Skill, Lockfile, Lesereihenfolge) | [`.agents/README.md`](.agents/README.md)              |
| **Paket-/App-Kontext**                                       | jeweiliges `AGENTS.md` unter `apps/` oder `packages/` |

**Lesereihenfolge:** zuerst diese Datei → bei Bedarf `.agents/README.md` → dann das `AGENTS.md` des bearbeiteten Ordners.

## Documentation language

Root and most `packages/*/AGENTS.md` files are **English** for consistency with stack tooling. Some **`apps/*/AGENTS.md`** files use **German** where they were written for the same team — prefer **one language per file** when adding new sections; gradual alignment to English is fine.

## Project Overview

Turborepo monorepo containing one Next.js application, one HTTP API (`apps/api`), one Electron desktop app (`apps/desktop`), an Expo mobile app (`apps/mobile`), and shared internal packages under `packages/` (including integration libraries **DATEV export**, **GAEB**, **BMEcat**, **DATANORM** consumed by `api`). Root package name: `zgwerkrepo`. Uses pnpm workspaces for dependency management and Turborepo for orchestrating builds and tasks across packages.

**Bootstrap:** clone the repo, then run `pnpm install` once at the repository root to install all workspace dependencies.

**Runtime:** Node.js **≥ 22.11** (use this version for all local work and CI).

## Turbo and pnpm workspace package names

Turborepo **`--filter`** values must match each package’s **`name`** in its `package.json`, not the folder path (e.g. use `--filter=web`, not `--filter=apps/web`).

| `name` (filter)           | Path                         | Role                                                      |
| ------------------------- | ---------------------------- | --------------------------------------------------------- |
| `zgwerkrepo`              | `./` (root)                  | Workspace root; scripts orchestrate Turbo                 |
| `web`                     | `apps/web`                   | Primary Next.js app                                       |
| `api`                     | `apps/api`                   | Hono HTTP API (PostgreSQL / Drizzle)                      |
| `desktop`                 | `apps/desktop`               | Electron desktop app (TypeScript)                         |
| `mobile`                  | `apps/mobile`                | Expo / React Native app                                   |
| `@repo/api-contracts`     | `packages/api-contracts`     | Shared Zod schemas & types (trades, sync batches)         |
| `@repo/db`                | `packages/db`                | Drizzle schema & PostgreSQL client                        |
| `@repo/ui`                | `packages/ui`                | Shared UI library                                         |
| `@repo/fonts`             | `packages/fonts`             | Shared Geist fonts (`next/font/local`) for Next apps      |
| `@repo/brand`             | `packages/brand`             | Shared app logo / favicon asset (PNG)                     |
| `@repo/eslint-config`     | `packages/eslint-config`     | Shared ESLint flat configs                                |
| `@repo/typescript-config` | `packages/typescript-config` | Shared `tsconfig` bases                                   |
| `@repo/tailwind-config`   | `packages/tailwind-config`   | Shared Tailwind v4 styles + PostCSS for apps / `@repo/ui` |
| `@repo/playwright-web`    | `packages/playwright-web`    | Playwright E2E against `web` (depends on `web` workspace) |
| `@repo/electron`          | `packages/electron`          | Shared IPC channels & desktop API types for `desktop`     |
| `@repo/datev-export`      | `packages/datev-export`      | DATEV CSV/bookings export (Node lib; used by `api`)       |
| `@repo/gaeb`              | `packages/gaeb`              | GAEB XML parse/serialize (used by `api`)                  |
| `@repo/bmecat`            | `packages/bmecat`            | BMEcat XML catalog parsing (used by `api`)                |
| `@repo/datanorm`          | `packages/datanorm`          | DATANORM text/ZIP parsing (used by `api`)                 |

**Examples:**

```sh
pnpm exec turbo run dev --filter=web
pnpm exec turbo run build --filter=web
pnpm exec turbo run lint --filter=@repo/ui
pnpm exec turbo run check-types --filter=@repo/ui
```

**Turborepo conventions:** In `package.json` scripts, CI, and docs, prefer **`turbo run <task>`** (not the `turbo <task>` shorthand). Task implementations live in **each package’s `package.json`**; shared task shape is declared in root [`turbo.json`](turbo.json). Per-package overrides use **`turbo.json` next to that package** with `"extends": ["//"]`. The only root-only Turbo task here is **`lint:design-guardrails`** (design guardrails script; registered under the workspace root). For pull requests, CI uses **`turbo run … --affected`** so only changed packages and dependents run.

## Navigation für Agents

| Thema                                              | `AGENTS.md`                                                                                                                  |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Skill-Index, Lesereihenfolge Skills                | [`.agents/README.md`](.agents/README.md)                                                                                     |
| App-Auswahl (`web` / `api` / `desktop` / `mobile`) | [`apps/AGENTS.md`](apps/AGENTS.md)                                                                                           |
| Primary Next.js (Port 3000), Landing, `/web`       | [`apps/web/AGENTS.md`](apps/web/AGENTS.md)                                                                                   |
| Hono-API                                           | [`apps/api/AGENTS.md`](apps/api/AGENTS.md)                                                                                   |
| Electron                                           | [`apps/desktop/AGENTS.md`](apps/desktop/AGENTS.md)                                                                           |
| Expo                                               | [`apps/mobile/AGENTS.md`](apps/mobile/AGENTS.md)                                                                             |
| IPC / Desktop-Typen (`@repo/electron`)             | [`packages/electron/AGENTS.md`](packages/electron/AGENTS.md)                                                                 |
| UI-Bibliothek (`@repo/ui`)                         | [`packages/ui/AGENTS.md`](packages/ui/AGENTS.md)                                                                             |
| Geist-Fonts                                        | [`packages/fonts/AGENTS.md`](packages/fonts/AGENTS.md)                                                                       |
| Logo / Branding                                    | [`packages/brand/AGENTS.md`](packages/brand/AGENTS.md)                                                                       |
| Zod-Verträge                                       | [`packages/api-contracts/AGENTS.md`](packages/api-contracts/AGENTS.md)                                                       |
| Drizzle / DB                                       | [`packages/db/AGENTS.md`](packages/db/AGENTS.md)                                                                             |
| ESLint-Configs                                     | [`packages/eslint-config/AGENTS.md`](packages/eslint-config/AGENTS.md)                                                       |
| `tsconfig`-Basen                                   | [`packages/typescript-config/AGENTS.md`](packages/typescript-config/AGENTS.md)                                               |
| Tailwind / PostCSS                                 | [`packages/tailwind-config/AGENTS.md`](packages/tailwind-config/AGENTS.md)                                                   |
| Playwright E2E                                     | [`packages/playwright-web/AGENTS.md`](packages/playwright-web/AGENTS.md)                                                     |
| DATEV-Export (`@repo/datev-export`)                | [`packages/datev-export/AGENTS.md`](packages/datev-export/AGENTS.md)                                                         |
| GAEB (`@repo/gaeb`)                                | [`packages/gaeb/AGENTS.md`](packages/gaeb/AGENTS.md)                                                                         |
| BMEcat (`@repo/bmecat`)                            | [`packages/bmecat/AGENTS.md`](packages/bmecat/AGENTS.md)                                                                     |
| DATANORM (`@repo/datanorm`)                        | [`packages/datanorm/AGENTS.md`](packages/datanorm/AGENTS.md)                                                                 |
| **Web/Desktop-UI** (A11y, UX)                      | Abschnitt **Web Interface Guidelines** unten; Umsetzung in `web` / [`packages/ui`](packages/ui/AGENTS.md) / Desktop-Renderer |

## Monorepo Structure

```
apps/
  web/                 → Next.js application (primary web app, port 3000)
  api/                 → Hono HTTP API (default port 4000)
  desktop/             → Electron desktop application (TypeScript)
  mobile/              → Expo / React Native application
packages/
  api-contracts/     → Shared Zod types & API contracts (@repo/api-contracts)
  db/                  → Drizzle schema & PostgreSQL client (@repo/db)
  ui/                  → Shared React component library (@repo/ui)
  fonts/               → Shared Geist font files and `next/font/local` exports (@repo/fonts)
  brand/               → Shared app logo PNG (@repo/brand; web)
  eslint-config/       → Shared ESLint configurations (@repo/eslint-config)
  typescript-config/   → Shared TypeScript configurations (@repo/typescript-config)
  tailwind-config/     → Shared Tailwind v4 + PostCSS (@repo/tailwind-config)
  playwright-web/      → Playwright E2E package targeting web (@repo/playwright-web)
  electron/            → Shared IPC channels & desktop API types (@repo/electron; desktop)
  datev-export/        → DATEV bookings CSV export (@repo/datev-export; api)
  gaeb/                → GAEB XML (@repo/gaeb; api)
  bmecat/              → BMEcat XML (@repo/bmecat; api)
  datanorm/            → DATANORM (@repo/datanorm; api)
```

## Tech Stack

- **Runtime:** Node.js ≥ 22.11
- **Package Manager:** pnpm 9 (use `pnpm`, not npm or yarn)
- **Monorepo Tool:** Turborepo 2.9.x (see root `package.json`)
- **Web:** Next.js 16.2 (App Router), React 19.2, Tailwind CSS 4.2
- **Language:** TypeScript 5.9.x (strict mode, strictNullChecks enabled) in shared packages and Next apps
- **Linting:** ESLint v9 (flat config) in apps/packages that define `lint`; Konfiguration **`eslint.config.mjs`** pro Paket, gemeinsame Regeln in `@repo/eslint-config` (`base`, `next-js`, `react-internal`, `react-native`)
- **Formatting:** Prettier (root); see **Commands** below for the exact `format` script

## Commands

Run from the repository root:

| Task               | Command                   | Filtered example                                                            |
| ------------------ | ------------------------- | --------------------------------------------------------------------------- |
| Build all          | `pnpm build`              | `pnpm exec turbo run build --filter=web`                                    |
| Dev all            | `pnpm dev`                | `pnpm exec turbo run dev --filter=web` (see note below)                     |
| Lint all           | `pnpm lint`               | `pnpm exec turbo run lint --filter=web`                                     |
| Type-check all     | `pnpm check-types`        | `pnpm exec turbo run check-types --filter=web`                              |
| Test               | `pnpm test`               | `pnpm exec turbo run test --filter=web` (see **Tests and CI**)              |
| Format             | `pnpm format`             | —                                                                           |
| Keycloak bootstrap | `pnpm keycloak:bootstrap` | — (local Keycloak realm/client setup; see `scripts/keycloak-bootstrap.mjs`) |

**Format script (verbatim):**

```sh
prettier --write "**/*.{ts,tsx,md}"
```

(Defined in root [`package.json`](package.json).)

**`pnpm dev`:** runs `turbo run dev` for **every** workspace package that defines a `dev` script — **`web`**, **`api`**, and **`desktop`** — which starts many parallel processes. For everyday work, prefer **`pnpm exec turbo run dev --filter=<name>`** for a single app.

`pnpm lint` also runs the root Turbo task `lint:design-guardrails` ([`scripts/check-design-guardrails.mjs`](scripts/check-design-guardrails.mjs)) after workspace linting.

## Local verification (aligned with CI)

Before pushing, from the repo root:

```sh
pnpm install
pnpm lint
pnpm check-types
pnpm build
```

[`ci.yml`](.github/workflows/ci.yml) uses `pnpm install --frozen-lockfile`, then **`turbo run lint lint:design-guardrails check-types build`** (on pull requests with `--affected`), then **conditionally** `turbo run e2e` (PRs: `--affected`) after installing Playwright Chromium when that plan includes `@repo/playwright-web#e2e`. Root **`pnpm lint`** runs **`turbo run lint lint:design-guardrails`** (Workspace-Lint plus Root-Task `//#lint:design-guardrails`). Es startet **kein** E2E — dafür **`pnpm e2e`**.

## `@repo/ui` and builds

`@repo/ui` is consumed **from source** via `package.json` `exports` (no `build` script in that package). App builds (`pnpm build` / `turbo run build`) compile Next.js apps; upstream `^build` in Turbo is harmless for packages that do not define a `build` task.

Some asset/config-only packages (`@repo/fonts`, `@repo/brand`, `@repo/tailwind-config`) define no `lint` / `check-types` / `build` scripts; Turbo skips them for those tasks and validation happens through dependent apps or packages.

**Product copy:** `web` uses [`apps/web/content`](apps/web/content).

## Environment variables

Never commit secrets. Use `.env.example` (committed) for placeholder names only; keep real values in `.env.local` or your host’s secret store (see root and app `.gitignore` for `.env*` patterns). Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser — set them only when that is intentional.

**Where apps load env (runtime):** the repo uses a **single root** for local files — **`web`** loads via `nextEnv.loadEnvConfig` pointed at the repo root ([`apps/web/next.config.js`](apps/web/next.config.js)); **`api`** loads **`/.env`** then **`/.env.local`** from the repo root ([`apps/api/src/server.ts`](apps/api/src/server.ts)); **`desktop`** (Vite) uses `envDir` = repo root ([`apps/desktop/vite.config.ts`](apps/desktop/vite.config.ts)). Details and copy-paste examples: root [`.env.example`](.env.example).

**Turbo cache vs runtime:** root [`turbo.json`](turbo.json) keeps **`globalEnv`** minimal (essentially `NODE_ENV`). Package-specific task hashes use each package’s `turbo.json` **`env`** entries (and, for `web`/`api` **`build`**, the extra **`inputs`** entry **`$TURBO_ROOT$/.env.example`**). Listing a name under `env` affects **cache keys only**; Turbo does not inject values — the process still reads the shell and the files above. When you add or rename variables that affect build output, update the corresponding package `turbo.json` `env` list (and `.env.example` when it is a build input).

## Tests and CI

Root script **`pnpm test`** runs `turbo run test` (see [`turbo.json`](turbo.json)); packages without a `test` script are skipped.

Packages that define **`test`:**

- **`web`**, **`api`**, **`@repo/db`**, **`@repo/api-contracts`** — Node’s test runner via **`tsx --test`** (see each package’s `package.json` script)

**CI** ([`.github/workflows/ci.yml`](.github/workflows/ci.yml) on `main` and pull requests): installs with `pnpm install --frozen-lockfile` on Node 22, then runs **`turbo run lint lint:design-guardrails check-types build`** (pull requests: **`--affected`**), then **Playwright E2E** when the dry-run plan includes `@repo/playwright-web#e2e` (pull requests: **`e2e --affected`**). It does **not** run **`pnpm test`** by default. Run unit tests locally when needed.

## Code Conventions

- **ESM modules** — Next.js apps and `@repo/eslint-config` set `"type": "module"`; `@repo/ui` and `@repo/typescript-config` omit it (still consumed as ESM by the toolchain). Check `package.json` when adding packages.
- **ESLint v9 flat config** — shared configs live in `@repo/eslint-config` with exports for `base`, `next-js`, `react-internal`, and `react-native`; apps use **`eslint.config.mjs`** at the package root.
- **TypeScript strict mode** — `strict: true` and `strictNullChecks: true` are enabled in packages and Next apps as configured.
- **React JSX transform** — do not import React for JSX where the automatic JSX transform is configured.
- **Prettier** — use the root `format` script.

## Dependency Rules

- Internal packages are referenced using the workspace protocol: `"@repo/ui": "workspace:*"`.
- Never duplicate shared types or components across apps — extract to a shared package instead.

### Adding a workspace package

1. Add the package under `packages/<name>/` with a `package.json` (`name` like `@repo/...` or app-style).
2. Register the path in [`pnpm-workspace.yaml`](pnpm-workspace.yaml) if it is not already covered by `packages/*`.
3. Reference it from other packages with `"workspace:*"`.
4. If the package should participate in `lint`, `check-types`, or `build`, add those scripts and confirm [`turbo.json`](turbo.json) tasks behave as expected (dependencies are `^lint`, `^check-types`, `^build` where applicable).
5. Add an **`AGENTS.md`** in the new package and link it from this file’s **Navigation für Agents** table (and from [`.agents/README.md`](.agents/README.md) if you document new skill-related workflows).

## Turbo boundaries (experimental)

[`turbo boundaries`](https://turborepo.dev/docs/reference/boundaries) checks workspace hygiene (no undeclared imports, no reaching outside package roots) and enforces **tag rules** from root [`turbo.json`](turbo.json): packages tagged **`pkg`** must not depend on **`app`**; packages tagged **`app`** must not depend on other **`app`** packages. **`@repo/playwright-web`** uses tag **`e2e`** so it may depend on **`web`**. From the repo root: **`pnpm boundaries`** or **`pnpm exec turbo boundaries`**.

## Turbo Pipeline

- `build` depends on `^build` (upstream packages must build first). Outputs include `.next/**` (excluding cache) and `dist/**` where applicable — see root [`turbo.json`](turbo.json).
- `lint` and `check-types` depend on their upstream counterparts (`^lint`, `^check-types`).
- `dev` is persistent and not cached. **`desktop#dev`** additionally depends on `^build` so workspace dependencies (including **`@repo/electron#build`**) run before the Electron dev script; use **`pnpm exec turbo run dev --filter=desktop`** from the repo root rather than only `pnpm dev` inside `apps/desktop` without Turbo. Details: [`apps/desktop/AGENTS.md`](apps/desktop/AGENTS.md).
- Use `--filter=<package>` to scope tasks to specific packages (see **Turbo and pnpm workspace package names**).

## Turborepo (Kurzreferenz für Agents)

- **Package-Tasks:** Skript-Logik gehört in die **`package.json`** der jeweiligen Workspace-Pakete; das Root-**`package.json`** delegiert nur mit **`pnpm exec turbo run …`** — keine monolithischen Root-Skripte, die mehrere Apps manuell per `&&` ansteuern ([Turborepo: Package tasks](https://turborepo.dev/docs/crafting-your-repository/configuring-tasks)).
- **`turbo run`:** In **Scripts, CI und dokumentierten Befehlen** immer **`turbo run <task>`** verwenden, nicht die Kurzform `turbo <task>` (letztere nur für interaktive Einzeiler).
- **Geänderte Pakete:** Für PRs/lokal oft **`pnpm exec turbo run <task> --affected`** — nur geänderte Pakete und Abhängige.
- **Paket-Overrides:** Zusätzliche Task-Konfiguration pro Paket in **`turbo.json`** neben dem Paket mit **`"extends": ["//"]`** ([Package Configurations](https://turborepo.dev/docs/reference/configuration#package-configurations)).
- **Abhängigkeitsgraph:** Workspace-Pakete in **`package.json`** deklarieren — **`^build`** baut nur Pakete, die als Dependency eingetragen sind.

## Web Interface Guidelines

Für **Benutzeroberflächen** in **`apps/web`**, **`@repo/ui`** und dem **Electron-Renderer** (`apps/desktop`) gelten neben ESLint und **`lint:design-guardrails`** die **[Vercel Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines)** (Accessibility, Fokus, Formulare, Animation, Typografie, Performance, i18n). Die maschinenlesbare Checkliste zum Review: [`command.md`](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md).
