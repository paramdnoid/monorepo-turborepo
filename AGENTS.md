# AGENTS.md

This file provides context for AI coding agents working in this repository.

## Project Overview

Turborepo monorepo containing two Next.js applications and three shared internal packages. Uses pnpm workspaces for dependency management and Turborepo for orchestrating builds and tasks across packages.

## Monorepo Structure

```
apps/
  web/          → Next.js application (primary web app, port 3000)
  docs/         → Next.js application (documentation site, port 3001)
packages/
  ui/           → Shared React component library (@repo/ui)
  eslint-config/→ Shared ESLint configurations (@repo/eslint-config)
  typescript-config/ → Shared TypeScript configurations (@repo/typescript-config)
```

## Tech Stack

- **Runtime:** Node.js >=18
- **Package Manager:** pnpm 9 (use `pnpm`, not npm or yarn)
- **Monorepo Tool:** Turborepo
- **Framework:** Next.js 16.2 (App Router)
- **UI:** React 19.2
- **Language:** TypeScript 5.9.2 (strict mode, strictNullChecks enabled)
- **Linting:** ESLint v9 (flat config)
- **Formatting:** Prettier

## Commands

Run from the repository root:

| Task | Command | Filtered Example |
|------|---------|-----------------|
| Build all | `pnpm build` | `pnpm exec turbo build --filter=web` |
| Dev all | `pnpm dev` | `pnpm exec turbo dev --filter=web` |
| Lint all | `pnpm lint` | `pnpm exec turbo lint --filter=@repo/ui` |
| Type-check all | `pnpm check-types` | `pnpm exec turbo check-types --filter=docs` |
| Format | `pnpm format` | — |

## Code Conventions

- **ESM modules throughout** — all packages use `"type": "module"`.
- **ESLint v9 flat config** — shared configs live in `@repo/eslint-config` with exports for `base`, `next-js`, and `react-internal`.
- **TypeScript strict mode** — `strict: true` and `strictNullChecks: true` are enabled in all packages.
- **React JSX transform** — do not import React for JSX; the automatic JSX transform is configured.
- **Prettier** — all `.ts`, `.tsx`, and `.md` files are formatted with Prettier.

## Dependency Rules

- Internal packages are referenced using the workspace protocol: `"@repo/ui": "workspace:*"`.
- Never duplicate shared types or components across apps — extract to a shared package instead.
- When adding a new shared package, register it in `pnpm-workspace.yaml` under `packages/`.

## Turbo Pipeline

- `build` depends on `^build` (upstream packages must build first). Outputs: `.next/**` (excluding cache).
- `lint` and `check-types` depend on their upstream counterparts (`^lint`, `^check-types`).
- `dev` is persistent and not cached.
- Use `--filter=<package>` to scope tasks to specific packages.
