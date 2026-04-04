# AGENTS.md — packages/bmecat

**Read this when:** you change BMEcat XML extraction or the compiled `dist/` output for `@repo/bmecat`.

## Purpose

**`@repo/bmecat`** is a **Node-only** library (**`fast-xml-parser`**): **`parseBmecatXml`** and related types for supplier catalog imports. Consumed by **`apps/api`** ([`src/routes/catalog.ts`](../../apps/api/src/routes/catalog.ts)).

## Commands

From the repository root:

```sh
pnpm exec turbo run build --filter=@repo/bmecat
pnpm exec turbo run lint --filter=@repo/bmecat
pnpm exec turbo run check-types --filter=@repo/bmecat
pnpm exec turbo run test --filter=@repo/bmecat
```

## Monorepo

Repo-wide rules & skills: **[`../../AGENTS.md`](../../AGENTS.md)** · **[`../../.agents/README.md`](../../.agents/README.md)**.
