# AGENTS.md — packages/typescript-config

**Read this when:** you change compiler options for Next apps or shared libraries, or add a new TypeScript project in the repo.

## Purpose

Shared **`tsconfig` JSON bases** (no `package.json` `exports`; consumers reference files by package path).

| File                                         | Role                                                                      |
| -------------------------------------------- | ------------------------------------------------------------------------- |
| [`base.json`](./base.json)                   | Strict shared defaults (`strict`, `target`, `moduleResolution`, etc.)     |
| [`nextjs.json`](./nextjs.json)               | Extends `base.json` — Next.js App Router (`next` plugin, `jsx: preserve`) |
| [`react-library.json`](./react-library.json) | Extends `base.json` — React libraries (`jsx: react-jsx`)                  |
| [`node-library.json`](./node-library.json)   | Extends `base.json` — Node-only libs (`lib: ES2022`, kein DOM)            |

## Who extends what

| Consumer                                                                               | Extends              |
| -------------------------------------------------------------------------------------- | -------------------- |
| [`apps/web/tsconfig.json`](../../apps/web/tsconfig.json)                               | `nextjs.json`        |
| [`apps/api/tsconfig.json`](../../apps/api/tsconfig.json)                               | `node-library.json`  |
| [`apps/desktop/tsconfig.json`](../../apps/desktop/tsconfig.json)                       | `node-library.json`  |
| [`apps/desktop/tsconfig.renderer.json`](../../apps/desktop/tsconfig.renderer.json)     | `react-library.json` |
| [`apps/desktop/tsconfig.preload.json`](../../apps/desktop/tsconfig.preload.json)       | `node-library.json`  |
| [`packages/ui/tsconfig.json`](../../packages/ui/tsconfig.json)                         | `react-library.json` |
| [`packages/electron/tsconfig.json`](../../packages/electron/tsconfig.json)             | `node-library.json`  |
| [`packages/db/tsconfig.json`](../../packages/db/tsconfig.json)                         | `node-library.json`  |
| [`packages/api-contracts/tsconfig.json`](../../packages/api-contracts/tsconfig.json)   | `node-library.json`  |
| [`packages/playwright-web/tsconfig.json`](../../packages/playwright-web/tsconfig.json) | `base.json`          |
| [`packages/datev-export/tsconfig.json`](../../packages/datev-export/tsconfig.json)     | `node-library.json`  |
| [`packages/gaeb/tsconfig.json`](../../packages/gaeb/tsconfig.json)                     | `node-library.json`  |
| [`packages/bmecat/tsconfig.json`](../../packages/bmecat/tsconfig.json)                 | `node-library.json`  |
| [`packages/datanorm/tsconfig.json`](../../packages/datanorm/tsconfig.json)             | `node-library.json`  |

(Alle Pfade relativ zu `@repo/typescript-config` via `extends`-Name in der jeweiligen `tsconfig.json`.)

## Tasks

Type-check is run from consumers, e.g.:

```sh
pnpm exec turbo run check-types --filter=web
pnpm exec turbo run check-types --filter=@repo/ui
```

## Monorepo

Repo-weit & Skills: **[`../../AGENTS.md`](../../AGENTS.md)** · **[`../../.agents/README.md`](../../.agents/README.md)**.
