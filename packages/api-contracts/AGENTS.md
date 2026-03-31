# AGENTS.md — packages/api-contracts

**Read this when:** you change shared Zod schemas, API contract types, or the compiled `dist/` output for `@repo/api-contracts`.

## Purpose

**`@repo/api-contracts`** holds shared **Zod** schemas and TypeScript types (e.g. trades, sync batches) consumed by **`apps/api`** and **`web`** (and any other workspace package that depends on it). The package **builds to `dist/`** (`tsc`); consumers import from the package root export.

## Commands

From the repository root:

```sh
pnpm exec turbo run build --filter=@repo/api-contracts
pnpm exec turbo run lint --filter=@repo/api-contracts
pnpm exec turbo run check-types --filter=@repo/api-contracts
pnpm exec turbo run test --filter=@repo/api-contracts
```

Tests use Node’s test runner via **`tsx --test`** (see `package.json` → `test`).

## Workspace

- **Consumers:** [`apps/api`](../../apps/api), [`apps/web`](../../apps/web) (and others via `workspace:*`).
- **Database schema** lives in [`@repo/db`](../db/AGENTS.md), not here.

## Monorepo

Root context: **[`../../AGENTS.md`](../../AGENTS.md)**.
