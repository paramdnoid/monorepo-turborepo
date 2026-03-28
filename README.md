# my-turborepo

A [Turborepo](https://turborepo.dev) monorepo with two [Next.js](https://nextjs.org/) apps ([App Router](https://nextjs.org/docs/app)), a [React Native](https://reactnative.dev/) app, four shared internal packages under `packages/` (UI, starter copy, ESLint and TypeScript configs).

**Coding agents and conventions:** see [`AGENTS.md`](./AGENTS.md) for commands, stack details, and package-specific notes (`apps/AGENTS.md`, `packages/ui/AGENTS.md`, etc.).

## Requirements

- [Node.js](https://nodejs.org/) 22.11 or newer (required for the React Native app; see root `package.json` `engines`)
- [pnpm](https://pnpm.io/) 9 (see `packageManager` in [`package.json`](./package.json))

## Setup

From the repository root:

```sh
pnpm install
```

## Scripts (root)

| Script             | Description                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| `pnpm dev`         | Run all `dev` tasks via Turborepo                                                                   |
| `pnpm build`       | Build all packages and apps                                                                         |
| `pnpm lint`        | Lint across the workspace + design guardrails (`check-design-guardrails.mjs`)                       |
| `pnpm check-types` | Type-check across the workspace                                                                     |
| `pnpm format`      | Format `*.ts`, `*.tsx`, `*.md` (repo-wide) and `apps/native` `*.js` / `*.mjs` configs with Prettier |

Scoped runs (examples):

```sh
pnpm exec turbo dev --filter=web
pnpm exec turbo build --filter=docs
```

## What’s inside

| Path                         | Description                                                                   |
| ---------------------------- | ----------------------------------------------------------------------------- |
| `apps/web`                   | Primary Next.js app (port **3000**)                                           |
| `apps/docs`                  | Documentation Next.js app (port **3001**)                                     |
| `packages/ui`                | Shared React components and styles (`@repo/ui`)                               |
| `packages/turborepo-starter` | Shared starter copy and URLs (`@repo/turborepo-starter`; web + docs + native) |
| `packages/eslint-config`     | Shared ESLint flat configs (`@repo/eslint-config`)                            |
| `packages/typescript-config` | Shared `tsconfig` bases (`@repo/typescript-config`)                           |

**Stack:** Next.js 16, React 19, TypeScript 5.9, Tailwind CSS 4, ESLint 9, Turborepo 2.8.

## Environment variables

See `.env.example` under each app (`apps/web`, `apps/docs`). Copy to `.env.local` for local overrides; never commit secrets.

## CI

GitHub Actions runs `pnpm lint`, `pnpm check-types`, and `pnpm build` on pushes and pull requests to `main` (see [`.github/workflows/ci.yml`](./.github/workflows/ci.yml)).

## Learn more

- [Turborepo documentation](https://turborepo.dev/docs)
- [pnpm workspaces](https://pnpm.io/workspaces)
