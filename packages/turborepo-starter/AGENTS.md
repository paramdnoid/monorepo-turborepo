# AGENTS.md — packages/turborepo-starter

**Read this when:** you change shared marketing copy, URLs, or alert strings for the Turborepo starter screen used on web and native.

## Purpose

[`@repo/turborepo-starter`](./package.json) exports constants from [`src/content.ts`](./src/content.ts) (titles, links, deploy URLs, step text, `alertMessage`). **Single source of truth** for that copy — prefer editing here instead of duplicating strings in apps.

- Use `deployHrefWeb` for the `web` starter and `deployHrefDocs` for the `docs` starter.
- Keep shared fields (`title`, `description`, `docsHref`, `templatesHref`, `turborepoSiteHref`, `alertMessage`) centralized here.

## Consumers

| App      | Usage                                                                                                                         |
| -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `web`    | [`apps/web/app/page.tsx`](../../apps/web/app/page.tsx) imports from `@repo/turborepo-starter`                                 |
| `docs`   | [`apps/docs/app/page.tsx`](../../apps/docs/app/page.tsx) imports from `@repo/turborepo-starter` (docs-specific deploy target) |
| `native` | [`apps/native/src/NativeTurborepoApp.tsx`](../../apps/native/src/NativeTurborepoApp.tsx) (native shell UI)                    |

## Tasks

- **Turbo:** this package has no `lint` / `check-types` / `build` scripts; validation runs via dependent apps.
- **Dependency:** add with `"@repo/turborepo-starter": "workspace:^"` (or `workspace:*`).

## Monorepo context

Repo-wide commands and navigation: **[`../../AGENTS.md`](../../AGENTS.md)**.
