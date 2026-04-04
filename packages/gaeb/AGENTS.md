# AGENTS.md — packages/gaeb

**Read this when:** you change GAEB XML parsing/serialization or the compiled `dist/` output for `@repo/gaeb`.

## Purpose

**`@repo/gaeb`** is a **Node-only** library (**`fast-xml-parser`**): **`parseGaebString`**, **`serializeDaXml`**, format detection, and types for GAEB DA XML. Consumed by **`apps/api`** ([`src/routes/gaeb.ts`](../../apps/api/src/routes/gaeb.ts)).

## Commands

From the repository root:

```sh
pnpm exec turbo run build --filter=@repo/gaeb
pnpm exec turbo run lint --filter=@repo/gaeb
pnpm exec turbo run check-types --filter=@repo/gaeb
pnpm exec turbo run test --filter=@repo/gaeb
```

## Monorepo

Repo-wide rules & skills: **[`../../AGENTS.md`](../../AGENTS.md)** · **[`../../.agents/README.md`](../../.agents/README.md)**.
