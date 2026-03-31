# AGENTS.md — packages/brand

**Read this when:** you change the shared app logo or favicon source.

## Purpose

[`@repo/brand`](./package.json) holds **one** raster logo (`assets/logo.png`) for **web** (Next.js metadata + UI), **desktop** (Electron window / builder icons), and aligned static copies (e.g. `apps/web/public/logo.png`).

## Consumers

| App / area | Usage                                                                                        |
| ---------- | -------------------------------------------------------------------------------------------- |
| `web`      | `import brandLogo from "@repo/brand/logo"` — `layout.tsx` `metadata.icons`, homepage `Image` |
| `desktop`  | `require.resolve("@repo/brand/logo")` — window icon; `package.json` → electron-builder `icon` paths to `assets/logo.png` |

## Tasks

No `lint` / `check-types` / `build` — validation runs via dependent apps.

## Monorepo context

Navigation: **[`../../AGENTS.md`](../../AGENTS.md)**.
