# AGENTS.md — packages/datev-export

**Read this when:** you change DATEV bookkeeping CSV export or the compiled `dist/` output for `@repo/datev-export`.

## Purpose

**`@repo/datev-export`** is a **Node-only** library: builds **`buildDatevBookingsCsv`** and related types for DATEV-compatible CSV export. Consumed by **`apps/api`** ([`src/routes/datev.ts`](../../apps/api/src/routes/datev.ts)).

## Commands

From the repository root:

```sh
pnpm exec turbo run build --filter=@repo/datev-export
pnpm exec turbo run lint --filter=@repo/datev-export
pnpm exec turbo run check-types --filter=@repo/datev-export
pnpm exec turbo run test --filter=@repo/datev-export
```

## Monorepo

Repo-wide rules & skills: **[`../../AGENTS.md`](../../AGENTS.md)** · **[`../../.agents/README.md`](../../.agents/README.md)**.
