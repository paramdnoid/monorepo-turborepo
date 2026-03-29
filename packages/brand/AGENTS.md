# AGENTS.md — packages/brand

**Read this when:** you change the shared app logo, favicon source, or native launcher master asset.

## Purpose

[`@repo/brand`](./package.json) holds **one** raster logo (`assets/logo.png`) used by **web**, **docs** (Next.js metadata + UI), and **native** (in-app image + iOS/Android icons generated from the same file).

## Consumers

| App / area    | Usage                                                                                                                                                                                          |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `web`, `docs` | `import brandLogo from "@repo/brand/logo"` — `layout.tsx` `metadata.icons`, homepage `Image`                                                                                                   |
| `native`      | `import brandLogo from "@repo/brand/logo"` — React Native `Image`; **regenerate** `ios/.../AppIcon.appiconset/*.png` and `android/.../mipmap-*/ic_launcher*.png` when the master asset changes |

## Tasks

No `lint` / `check-types` / `build` — validation runs via dependent apps.

## Monorepo context

Navigation: **[`../../AGENTS.md`](../../AGENTS.md)**.
