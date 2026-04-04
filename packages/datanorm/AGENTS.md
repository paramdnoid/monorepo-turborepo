# AGENTS.md — packages/datanorm

**Read this when:** you change DATANORM text/ZIP parsing or the compiled `dist/` output for `@repo/datanorm`.

## Purpose

**`@repo/datanorm`** is a **Node-only** library (**`fflate`**): **`parseDatanormBuffer`** and related types for article/price imports. Consumed by **`apps/api`** ([`src/routes/catalog.ts`](../../apps/api/src/routes/catalog.ts)).

## Commands

From the repository root:

```sh
pnpm exec turbo run build --filter=@repo/datanorm
pnpm exec turbo run lint --filter=@repo/datanorm
pnpm exec turbo run check-types --filter=@repo/datanorm
pnpm exec turbo run test --filter=@repo/datanorm
```

## Monorepo

Repo-wide rules & skills: **[`../../AGENTS.md`](../../AGENTS.md)** · **[`../../.agents/README.md`](../../.agents/README.md)**.
