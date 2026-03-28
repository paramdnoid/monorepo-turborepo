# AGENTS.md — packages/typescript-config

**Read this when:** you change compiler options for Next apps or shared libraries, or add a new TypeScript project in the repo.

## Purpose

Shared **`tsconfig` JSON bases** (no `package.json` `exports`; consumers reference files by package path).

| File                                         | Role                                                                      |
| -------------------------------------------- | ------------------------------------------------------------------------- |
| [`base.json`](./base.json)                   | Strict shared defaults (`strict`, `target`, `moduleResolution`, etc.)     |
| [`nextjs.json`](./nextjs.json)               | Extends `base.json` — Next.js App Router (`next` plugin, `jsx: preserve`) |
| [`react-library.json`](./react-library.json) | Extends `base.json` — React libraries (`jsx: react-jsx`)                  |

## Who extends what

| Consumer                                                       | Extends                                      |
| -------------------------------------------------------------- | -------------------------------------------- |
| [`apps/web/tsconfig.json`](../../apps/web/tsconfig.json)       | `@repo/typescript-config/nextjs.json`        |
| [`apps/docs/tsconfig.json`](../../apps/docs/tsconfig.json)     | `@repo/typescript-config/nextjs.json`        |
| [`packages/ui/tsconfig.json`](../../packages/ui/tsconfig.json) | `@repo/typescript-config/react-library.json` |

**React Native** uses `@react-native/typescript-config` — see [`apps/native/AGENTS.md`](../../apps/native/AGENTS.md).

## Tasks

Type-check is run from consumers, e.g.:

```sh
pnpm exec turbo check-types --filter=web
pnpm exec turbo check-types --filter=@repo/ui
```

## Monorepo context

Repo-wide commands: **[`../../AGENTS.md`](../../AGENTS.md)**.
