# AGENTS.md — apps/web

**Read this when:** you change the primary Next.js product (routes, layout, env, or homepage content).

**Purpose:** Main user-facing web app — Turborepo starter UI, `@repo/ui`, port **3000**.

## Key paths

| Path                                 | Role                                                            |
| ------------------------------------ | --------------------------------------------------------------- |
| [`app/layout.tsx`](app/layout.tsx)   | Root layout: Geist from `@repo/fonts/geist`, `<Providers>` from `@repo/ui/providers` |
| [`app/page.tsx`](app/page.tsx)       | Home route — imports shared copy from `@repo/turborepo-starter` |
| [`app/globals.css`](app/globals.css) | Imports shared styles from `@repo/ui`                           |
| [`.env.example`](.env.example)       | Document env vars; copy to `.env.local` for overrides           |

## Dependencies (workspace)

- `@repo/ui` — components and global CSS
- `@repo/fonts` — shared Geist Sans / Geist Mono (`@repo/fonts/geist`) for `next/font` CSS variables
- `@repo/turborepo-starter` — shared starter strings and URLs for the home page (single source of truth)

## Commands

From repo root (Turbo package name is **`web`**):

```sh
pnpm exec turbo dev --filter=web
pnpm exec turbo build --filter=web
pnpm exec turbo lint --filter=web
pnpm exec turbo check-types --filter=web
```

From this directory: `pnpm dev`, `pnpm build`, etc. (same scripts).

Shared Next.js structure and conventions: **[`../AGENTS.md`](../AGENTS.md)**.

Monorepo-wide commands and stack: **[`../../AGENTS.md`](../../AGENTS.md)**.
