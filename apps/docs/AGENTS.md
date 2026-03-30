# AGENTS.md — apps/docs

**Read this when:** you change the documentation Next.js site (routes, layout, env, or homepage).

**Purpose:** Secondary Next.js site on port **3001** — same stack as `web`, different Turbo package (`docs`).

## Key paths

| Path                                 | Role                                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| [`app/layout.tsx`](app/layout.tsx)   | Root layout: Geist from `@repo/fonts/geist`, `@repo/ui` providers                                     |
| [`app/page.tsx`](app/page.tsx)       | Home route — rendert Dokumentation basierend auf `apps/web/content` (`@web/*`-Alias)                  |
| [`app/globals.css`](app/globals.css) | Imports shared styles from `@repo/ui`                                                                   |
| [`.env.example`](.env.example)       | Document env vars; copy to `.env.local` for overrides                                                   |

## Dependencies (workspace)

- `@repo/ui` — components and global CSS
- `@repo/fonts` — shared Geist Sans / Geist Mono (`@repo/fonts/geist`) for `next/font` CSS variables
- `@repo/turborepo-starter` — legacy starter copy/URLs (Dependency vorhanden, aber zentrale Inhaltsquelle ist aktuell `@web/content/*`)

**Copy consistency:** Dokumentationsinhalte (`FAQ`, Feature-/Gewerke-Texte, Branding) werden in `docs` bewusst aus `apps/web/content` wiederverwendet, damit Website und Doku nicht auseinanderlaufen.

## Commands

From repo root (Turbo package name is **`docs`**):

```sh
pnpm exec turbo dev --filter=docs
pnpm exec turbo build --filter=docs
pnpm exec turbo lint --filter=docs
pnpm exec turbo check-types --filter=docs
```

From this directory: `pnpm dev`, `pnpm build`, etc.

Shared Next.js structure and conventions: **[`../AGENTS.md`](../AGENTS.md)**.

Monorepo-wide commands and stack: **[`../../AGENTS.md`](../../AGENTS.md)**.
