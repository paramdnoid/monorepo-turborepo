# AGENTS.md

This file provides context for AI coding agents working in this repository.

## Project Overview

Turborepo monorepo containing two Next.js applications and three shared internal packages. Root package name: `my-turborepo`. Uses pnpm workspaces for dependency management and Turborepo for orchestrating builds and tasks across packages.

**Bootstrap:** clone the repo, then run `pnpm install` once at the repository root to install all workspace dependencies.

## Where to Look Next

More specific agent context lives next to the code:

| Location                | Purpose                                   |
| ----------------------- | ----------------------------------------- |
| `apps/AGENTS.md`        | Shared Next.js app rules (`web` + `docs`) |
| `apps/web/AGENTS.md`    | Primary web app stub (port 3000)          |
| `apps/docs/AGENTS.md`   | Documentation site stub (port 3001)       |
| `packages/ui/AGENTS.md` | Shared `@repo/ui` component library       |

## Monorepo Structure

```
apps/
  web/                 → Next.js application (primary web app, port 3000)
  docs/                → Next.js application (documentation site, port 3001)
packages/
  ui/                  → Shared React component library (@repo/ui)
  eslint-config/       → Shared ESLint configurations (@repo/eslint-config)
  typescript-config/   → Shared TypeScript configurations (@repo/typescript-config)
```

## Tech Stack

- **Runtime:** Node.js >=18
- **Package Manager:** pnpm 9 (use `pnpm`, not npm or yarn)
- **Monorepo Tool:** Turborepo 2.8.x
- **Framework:** Next.js 16.2 (App Router)
- **UI:** React 19.2
- **Styling:** Tailwind CSS 4.2 (apps and `@repo/ui`; PostCSS via `@tailwindcss/postcss` in apps)
- **Language:** TypeScript 5.9.2 (strict mode, strictNullChecks enabled)
- **Linting:** ESLint v9 (flat config)
- **Formatting:** Prettier

## Commands

Run from the repository root:

| Task           | Command            | Filtered Example                            |
| -------------- | ------------------ | ------------------------------------------- |
| Build all      | `pnpm build`       | `pnpm exec turbo build --filter=web`        |
| Dev all        | `pnpm dev`         | `pnpm exec turbo dev --filter=web`          |
| Lint all       | `pnpm lint`        | `pnpm exec turbo lint --filter=@repo/ui`    |
| Type-check all | `pnpm check-types` | `pnpm exec turbo check-types --filter=docs` |
| Format         | `pnpm format`      | —                                           |

## `@repo/ui` and builds

`@repo/ui` is consumed **from source** via `package.json` `exports` (no `build` script in that package). App builds (`pnpm build` / `turbo build`) compile Next.js apps; upstream `^build` in Turbo is harmless for packages that do not define a `build` task.

## Environment variables

Never commit secrets. Use `.env.example` (committed) for placeholder names only; keep real values in `.env.local` or your host’s secret store (see root and app `.gitignore` for `.env*` patterns). Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser — set them only when that is intentional.

## Tests and CI

There is **no** root test script yet. When you add one, wire it through `turbo.json` and document it here. **CI** (e.g. GitHub Actions) should run the same quality gates as local development: `pnpm lint`, `pnpm check-types`, and `pnpm build`.

## Code Conventions

- **ESM modules** — Next.js apps and `@repo/eslint-config` set `"type": "module"`; `@repo/ui` and `@repo/typescript-config` omit it (still consumed as ESM by the toolchain). Check `package.json` when adding packages.
- **ESLint v9 flat config** — shared configs live in `@repo/eslint-config` with exports for `base`, `next-js`, and `react-internal`.
- **TypeScript strict mode** — `strict: true` and `strictNullChecks: true` are enabled in all packages.
- **React JSX transform** — do not import React for JSX; the automatic JSX transform is configured.
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
