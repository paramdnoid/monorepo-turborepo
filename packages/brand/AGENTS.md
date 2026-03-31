# AGENTS.md — packages/brand

**Read this when:** you change the shared app logo or favicon source.

## Purpose

[`@repo/brand`](./package.json) holds **one** raster logo (`assets/logo.png`) used by **web** (Next.js metadata + UI).

## Consumers

| App / area | Usage                                                                                        |
| ---------- | -------------------------------------------------------------------------------------------- |
| `web`      | `import brandLogo from "@repo/brand/logo"` — `layout.tsx` `metadata.icons`, homepage `Image` |

## Tasks

No `lint` / `check-types` / `build` — validation runs via dependent apps.

## Monorepo context

Navigation: **[`../../AGENTS.md`](../../AGENTS.md)**.
