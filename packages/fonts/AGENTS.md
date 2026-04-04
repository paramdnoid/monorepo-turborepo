# AGENTS.md — packages/fonts

**Read this when:** you change shared Geist font files or `next/font/local` wiring for the Next.js apps.

## Purpose

[`@repo/fonts`](./package.json) holds **Geist Sans** and **Geist Mono** (variable `.woff` files) and exports ready-to-use `next/font/local` instances from [`src/geist.ts`](./src/geist.ts) (`geistSans`, `geistMono` with CSS variables `--font-geist-sans` and `--font-geist-mono`). Those variables are consumed by [`packages/ui/src/styles/theme-tokens.css`](../ui/src/styles/theme-tokens.css) and Tailwind in `web`.

## Consumers

| App   | Usage                                                                                  |
| ----- | -------------------------------------------------------------------------------------- |
| `web` | [`apps/web/app/layout.tsx`](../../apps/web/app/layout.tsx) imports `@repo/fonts/geist` |

## Package details

- **Export:** `@repo/fonts/geist` → `./src/geist.ts`
- **Font binaries:** [`src/fonts/`](./src/fonts/) (`GeistVF.woff`, `GeistMonoVF.woff`)
- **`peerDependencies`:** `next` (matches the Next.js version in the apps)
- **Tasks:** no `lint` / `check-types` / `build` scripts — validation runs via dependent Next apps.

## Monorepo

Repo-weit & Skills: **[`../../AGENTS.md`](../../AGENTS.md)** · **[`../../.agents/README.md`](../../.agents/README.md)**.
