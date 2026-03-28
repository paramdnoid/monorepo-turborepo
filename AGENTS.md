# AGENTS.md

This file provides context for AI coding agents working in this repository.

## Project Overview

Turborepo monorepo containing two Next.js applications, one React Native application, and three shared internal packages. Root package name: `my-turborepo`. Uses pnpm workspaces for dependency management and Turborepo for orchestrating builds and tasks across packages.

**Bootstrap:** clone the repo, then run `pnpm install` once at the repository root to install all workspace dependencies.

**Runtime:** Node.js **≥ 22.11** (required by React Native tooling in `apps/native`; use this version for all local work and CI).

## Where to Look Next

More specific agent context lives next to the code:

| Location                | Purpose                                           |
| ----------------------- | ------------------------------------------------- |
| `apps/AGENTS.md`        | All apps: Next.js (`web`, `docs`) + RN (`native`) |
| `apps/web/AGENTS.md`    | Primary web app (port 3000)                       |
| `apps/docs/AGENTS.md`   | Documentation site (port 3001)                    |
| `apps/native/AGENTS.md` | React Native mobile app                           |
| `packages/ui/AGENTS.md` | Shared `@repo/ui` component library               |

## Monorepo Structure

```
apps/
  web/                 → Next.js application (primary web app, port 3000)
  docs/                → Next.js application (documentation site, port 3001)
  native/              → React Native application (bundle id / project: nativeapp)
packages/
  ui/                  → Shared React component library (@repo/ui)
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
- **Formatting:** Prettier

## Commands

Run from the repository root:

| Task           | Command            | Filtered Example                            |
| -------------- | ------------------ | ------------------------------------------- |
| Build all      | `pnpm build`       | `pnpm exec turbo build --filter=web`        |
| Dev all        | `pnpm dev`         | `pnpm exec turbo dev --filter=web` (runs all apps with a `dev` script: `web`, `docs`, `native` / Metro) |
| Lint all       | `pnpm lint`        | `pnpm exec turbo lint --filter=native`      |
| Type-check all | `pnpm check-types` | `pnpm exec turbo check-types --filter=docs` |
| Format         | `pnpm format`      | —                                           |

## `@repo/ui` and builds

`@repo/ui` is consumed **from source** via `package.json` `exports` (no `build` script in that package). App builds (`pnpm build` / `turbo build`) compile Next.js apps; upstream `^build` in Turbo is harmless for packages that do not define a `build` task. `apps/native` has no `build` script; mobile binaries are built locally with Xcode / Android tooling.

**React Native:** By default `apps/native` embeds the **Next.js** app in a **WebView** (same `@repo/ui` + Tailwind as the browser) when `USE_WEBVIEW` is true in `apps/native/src/config/features.ts`. With `USE_WEBVIEW` false, it uses **NativeWind** + `apps/native/components/ui` and shared theme tokens from `packages/ui/src/styles/theme-tokens.css`.

## Environment variables

Never commit secrets. Use `.env.example` (committed) for placeholder names only; keep real values in `.env.local` or your host’s secret store (see root and app `.gitignore` for `.env*` patterns). Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser — set them only when that is intentional.

## Tests and CI

There is **no** root test script yet. When you add one, wire it through `turbo.json` and document it here.

**CI** (GitHub Actions on `main` and pull requests): installs dependencies with pnpm, runs **`pnpm lint`**, **`pnpm check-types`**, and **`pnpm build`** on Node 22. This matches Next.js and shared packages; it does **not** run iOS/Android native compilation for `apps/native`. Run simulator/device builds locally when needed.

## Code Conventions

- **ESM modules** — Next.js apps and `@repo/eslint-config` set `"type": "module"`; `@repo/ui` and `@repo/typescript-config` omit it (still consumed as ESM by the toolchain). Check `package.json` when adding packages.
- **ESLint v9 flat config** — shared configs live in `@repo/eslint-config` with exports for `base`, `next-js`, and `react-internal`.
- **TypeScript strict mode** — `strict: true` and `strictNullChecks: true` are enabled in packages and Next apps as configured.
- **React JSX transform** — do not import React for JSX where the automatic JSX transform is configured.
- **Prettier** — the root `format` script covers `.ts`, `.tsx`, and `.md`; other extensions are not included unless you extend the script.

## Dependency Rules

- Internal packages are referenced using the workspace protocol: `"@repo/ui": "workspace:*"`.
- Never duplicate shared types or components across apps — extract to a shared package instead.
- When adding a new shared package, register it in `pnpm-workspace.yaml` under `packages/`.

## Turbo Pipeline

- `build` depends on `^build` (upstream packages must build first). Outputs: `.next/**` (excluding cache).
- `lint` and `check-types` depend on their upstream counterparts (`^lint`, `^check-types`).
- `dev` is persistent and not cached.
- Use `--filter=<package>` to scope tasks to specific packages.
