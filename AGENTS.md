# AGENTS.md

This file provides context for AI coding agents working in this repository. **Start here**, then follow links to app- or package-local `AGENTS.md` files for task-specific detail.

## Project Overview

Turborepo monorepo containing two Next.js applications, one React Native application, and five shared internal packages under `packages/`. Root package name: `my-turborepo`. Uses pnpm workspaces for dependency management and Turborepo for orchestrating builds and tasks across packages.

**Bootstrap:** clone the repo, then run `pnpm install` once at the repository root to install all workspace dependencies.

**Runtime:** Node.js **≥ 22.11** (required for React Native tooling in `apps/native`; use this version for all local work and CI).

## Turbo and pnpm workspace package names

Turborepo **`--filter`** values must match each package’s **`name`** in its `package.json`, not the folder path (e.g. use `--filter=web`, not `--filter=apps/web`).

| `name` (filter)           | Path                         | Role                                      |
| ------------------------- | ---------------------------- | ----------------------------------------- |
| `my-turborepo`            | `./` (root)                  | Workspace root; scripts orchestrate Turbo |
| `web`                     | `apps/web`                   | Primary Next.js app                       |
| `docs`                    | `apps/docs`                  | Documentation Next.js app                 |
| `native`                  | `apps/native`                | React Native app                          |
| `@repo/ui`                | `packages/ui`                | Shared UI library                         |
| `@repo/fonts`             | `packages/fonts`             | Shared Geist fonts (`next/font/local`) for Next apps |
| `@repo/turborepo-starter` | `packages/turborepo-starter` | Shared starter copy / URLs                |
| `@repo/eslint-config`     | `packages/eslint-config`     | Shared ESLint flat configs                |
| `@repo/typescript-config` | `packages/typescript-config` | Shared `tsconfig` bases                   |

**Examples:**

```sh
pnpm exec turbo dev --filter=web
pnpm exec turbo build --filter=docs
pnpm exec turbo lint --filter=@repo/ui
pnpm exec turbo check-types --filter=native
```

## Agent navigation (what to open for which task)

| If you are…                                     | Read                                                                           |
| ----------------------------------------------- | ------------------------------------------------------------------------------ |
| Choosing or comparing apps                      | [`apps/AGENTS.md`](apps/AGENTS.md)                                             |
| Primary product / marketing site (Next)         | [`apps/web/AGENTS.md`](apps/web/AGENTS.md)                                     |
| Docs site (Next)                                | [`apps/docs/AGENTS.md`](apps/docs/AGENTS.md)                                   |
| Mobile: WebView, Metro, iOS/Android, NativeWind | [`apps/native/AGENTS.md`](apps/native/AGENTS.md)                               |
| Shared React components, tokens, `globals.css`  | [`packages/ui/AGENTS.md`](packages/ui/AGENTS.md)                               |
| Shared local fonts (Geist) for Next.js layouts   | [`packages/fonts/AGENTS.md`](packages/fonts/AGENTS.md)                         |
| Starter screen copy and URLs (web + native)     | [`packages/turborepo-starter/AGENTS.md`](packages/turborepo-starter/AGENTS.md) |
| ESLint rules shared across Next + UI            | [`packages/eslint-config/AGENTS.md`](packages/eslint-config/AGENTS.md)         |
| `tsconfig` bases for Next and libraries         | [`packages/typescript-config/AGENTS.md`](packages/typescript-config/AGENTS.md) |

## Where to Look Next

More specific agent context lives next to the code:

| Location                                                                       | Purpose                                             |
| ------------------------------------------------------------------------------ | --------------------------------------------------- |
| [`apps/AGENTS.md`](apps/AGENTS.md)                                             | All apps: Next.js (`web`, `docs`) + RN (`native`)   |
| [`apps/web/AGENTS.md`](apps/web/AGENTS.md)                                     | Primary web app (port 3000)                         |
| [`apps/docs/AGENTS.md`](apps/docs/AGENTS.md)                                   | Documentation site (port 3001)                      |
| [`apps/native/AGENTS.md`](apps/native/AGENTS.md)                               | React Native mobile app                             |
| [`packages/ui/AGENTS.md`](packages/ui/AGENTS.md)                               | Shared `@repo/ui` component library                 |
| [`packages/fonts/AGENTS.md`](packages/fonts/AGENTS.md)                         | Shared Geist typography (`@repo/fonts`) for `web` / `docs` |
| [`packages/turborepo-starter/AGENTS.md`](packages/turborepo-starter/AGENTS.md) | Shared starter copy (`@repo/turborepo-starter`)     |
| [`packages/eslint-config/AGENTS.md`](packages/eslint-config/AGENTS.md)         | Shared ESLint configs (`@repo/eslint-config`)       |
| [`packages/typescript-config/AGENTS.md`](packages/typescript-config/AGENTS.md) | Shared TypeScript bases (`@repo/typescript-config`) |

## Monorepo Structure

```
apps/
  web/                 → Next.js application (primary web app, port 3000)
  docs/                → Next.js application (documentation site, port 3001)
  native/              → React Native application (bundle id / project: nativeapp)
packages/
  ui/                  → Shared React component library (@repo/ui)
  fonts/               → Shared Geist font files and `next/font/local` exports (@repo/fonts)
  turborepo-starter/   → Shared starter copy and URLs (@repo/turborepo-starter; web + native)
  eslint-config/       → Shared ESLint configurations (@repo/eslint-config)
  typescript-config/   → Shared TypeScript configurations (@repo/typescript-config)
```

## Tech Stack

- **Runtime:** Node.js ≥ 22.11
- **Package Manager:** pnpm 9 (use `pnpm`, not npm or yarn)
- **Monorepo Tool:** Turborepo 2.8.x
- **Web:** Next.js 16.2 (App Router), React 19.2, Tailwind CSS 4.2
- **Mobile:** React Native 0.84.x (see `apps/native`)
- **Language:** TypeScript 5.9.x (strict mode, strictNullChecks enabled) in shared packages and Next apps; `apps/native` uses the RN TypeScript preset
- **Linting:** ESLint v9 (flat config) in Next apps and packages; React Native app uses `@react-native/eslint-config`
- **Formatting:** Prettier (root); see **Commands** below for the exact `format` script

## Commands

Run from the repository root:

| Task           | Command            | Filtered example                                                                                        |
| -------------- | ------------------ | ------------------------------------------------------------------------------------------------------- |
| Build all      | `pnpm build`       | `pnpm exec turbo build --filter=web`                                                                    |
| Dev all        | `pnpm dev`         | `pnpm exec turbo dev --filter=web` (runs all apps with a `dev` script: `web`, `docs`, `native` / Metro) |
| Lint all       | `pnpm lint`        | `pnpm exec turbo lint --filter=native`                                                                  |
| Type-check all | `pnpm check-types` | `pnpm exec turbo check-types --filter=docs`                                                             |
| Format         | `pnpm format`      | —                                                                                                       |

**Format script (verbatim):**

```sh
prettier --write "**/*.{ts,tsx,md}" "apps/native/**/*.{js,mjs}"
```

(Defined in root [`package.json`](package.json).)

`pnpm lint` also runs `lint:design-guardrails` from [`check-design-guardrails.mjs`](check-design-guardrails.mjs) after workspace linting.

## Local verification (same as CI)

Before pushing, from the repo root:

```sh
pnpm install
pnpm lint
pnpm check-types
pnpm build
```

Matches [`.github/workflows/ci.yml`](.github/workflows/ci.yml) (`pnpm install --frozen-lockfile` in CI).

## `@repo/ui` and builds

`@repo/ui` is consumed **from source** via `package.json` `exports` (no `build` script in that package). App builds (`pnpm build` / `turbo build`) compile Next.js apps; upstream `^build` in Turbo is harmless for packages that do not define a `build` task. `apps/native` has no `build` script; mobile binaries are built locally with Xcode / Android tooling.

**React Native:** By default `apps/native` embeds the **Next.js** app in a **WebView** (same `@repo/ui` + Tailwind as the browser) when `USE_WEBVIEW` is true in `apps/native/src/config/features.ts`. With `USE_WEBVIEW` false, it uses **NativeWind** + `apps/native/components/ui` and shared theme tokens from `packages/ui/src/styles/theme-tokens.css`.

**Shared marketing copy:** `web`, `docs`, and `native` starter screens consume shared strings/URLs from [`@repo/turborepo-starter`](packages/turborepo-starter) (see [`packages/turborepo-starter/AGENTS.md`](packages/turborepo-starter/AGENTS.md)). Keep app-specific deploy targets via `deployHrefWeb` / `deployHrefDocs`.

## Environment variables

Never commit secrets. Use `.env.example` (committed) for placeholder names only; keep real values in `.env.local` or your host’s secret store (see root and app `.gitignore` for `.env*` patterns). Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser — set them only when that is intentional.

## Tests and CI

There is **no** root test script yet. When you add one, wire it through `turbo.json` and document it here.

**CI** ([`.github/workflows/ci.yml`](.github/workflows/ci.yml) on `main` and pull requests): installs dependencies with `pnpm install --frozen-lockfile`, runs **`pnpm lint`**, **`pnpm check-types`**, and **`pnpm build`** on Node 22. This matches Next.js and shared packages; it does **not** run iOS/Android native compilation for `apps/native`. Run simulator/device builds locally when needed.

## Code Conventions

- **ESM modules** — Next.js apps and `@repo/eslint-config` set `"type": "module"`; `@repo/ui` and `@repo/typescript-config` omit it (still consumed as ESM by the toolchain). Check `package.json` when adding packages.
- **ESLint v9 flat config** — shared configs live in `@repo/eslint-config` with exports for `base`, `next-js`, and `react-internal`.
- **TypeScript strict mode** — `strict: true` and `strictNullChecks: true` are enabled in packages and Next apps as configured.
- **React JSX transform** — do not import React for JSX where the automatic JSX transform is configured.
- **Prettier** — use the root `format` script; React Native keeps its own [`apps/native/.prettierrc.js`](apps/native/.prettierrc.js). There is no separate `prettier` dependency in `apps/native`.

## Dependency Rules

- Internal packages are referenced using the workspace protocol: `"@repo/ui": "workspace:*"`.
- Never duplicate shared types or components across apps — extract to a shared package instead.

### Adding a workspace package

1. Add the package under `packages/<name>/` with a `package.json` (`name` like `@repo/...` or app-style).
2. Register the path in [`pnpm-workspace.yaml`](pnpm-workspace.yaml) if it is not already covered by `packages/*`.
3. Reference it from other packages with `"workspace:*"` or `workspace:^`.
4. If the package should participate in `lint`, `check-types`, or `build`, add those scripts and confirm [`turbo.json`](turbo.json) tasks behave as expected (dependencies are `^lint`, `^check-types`, `^build` where applicable).
5. Add an **`AGENTS.md`** in the new package and link it from this file’s **Where to Look Next** / **Agent navigation** tables.

## Turbo Pipeline

- `build` depends on `^build` (upstream packages must build first). Outputs: `.next/**` (excluding cache).
- `lint` and `check-types` depend on their upstream counterparts (`^lint`, `^check-types`).
- `dev` is persistent and not cached.
- Use `--filter=<package>` to scope tasks to specific packages (see **Turbo and pnpm workspace package names**).
