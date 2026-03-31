# AGENTS.md — packages/eslint-config

**Read this when:** you change ESLint rules, add a new app that needs linting, or debug lint differences between Next apps and `@repo/ui`.

## Purpose

Shared **ESLint v9 flat configs** for the monorepo (`@repo/eslint-config`). Entry points:

| Export                               | File                       | Used by                                                                                        |
| ------------------------------------ | -------------------------- | ---------------------------------------------------------------------------------------------- |
| `@repo/eslint-config/base`           | `base.js`                  | Rarely imported directly; building block                                                       |
| `@repo/eslint-config/next-js`        | `next.js` (`nextJsConfig`) | [`apps/web`](../../apps/web/eslint.config.js) |
| `@repo/eslint-config/react-internal` | `react-internal.js`        | [`packages/ui`](../../packages/ui/eslint.config.mjs)                                           |

`next.js` also wires a local custom plugin from [`design-guardrails-plugin.js`](./design-guardrails-plugin.js) that enforces starter-page content contracts for:

- [`apps/web/app/page.tsx`](../../apps/web/app/page.tsx)

## Tasks

This package has **no** `lint` script; ESLint is validated when you run `pnpm lint` from the repo root (consumers such as `web`, `@repo/ui` load these configs).

## Further reading

- [`README.md`](./README.md) for install/usage snippets.

## Monorepo context

Repo-wide commands: **[`../../AGENTS.md`](../../AGENTS.md)**.
