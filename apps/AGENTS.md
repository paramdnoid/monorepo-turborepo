# AGENTS.md — apps (shared)

Shared rules for all **Next.js** applications under `apps/` (`web`, `docs`). Same stack and conventions; only ports and package names differ (see table below).

## Apps at a glance

| Package | Role                    | Port | Turbo filter    |
| ------- | ----------------------- | ---- | --------------- |
| `web`   | Primary web application | 3000 | `--filter=web`  |
| `docs`  | Documentation site      | 3001 | `--filter=docs` |

Run from an app directory: `pnpm dev`, `pnpm build`, `pnpm check-types`, etc. From repo root: `pnpm exec turbo dev --filter=web` (or `docs`).

## Overview

- **Framework:** Next.js 16.2 with App Router (`app/` directory)
- **Build:** `pnpm build` → outputs to `.next/`
- **Type-check:** `pnpm check-types` runs `next typegen` then `tsc --noEmit`

## Structure (typical)

```
app/
  layout.tsx      → Root layout: fonts, `<Providers>` from @repo/ui, children
  page.tsx        → Homepage / entry route
  globals.css     → Imports shared tokens/styles from @repo/ui (see below)
  fonts/          → Local font files (Geist Sans, Geist Mono)
public/           → Static assets (favicon, SVGs, etc.)
```

`app/globals.css` pulls in design tokens and base styles via:

`@import "../../../packages/ui/src/styles/globals.css";`

(Adjust relative path if the file layout changes.)

## Dependencies

- `@repo/ui` — shared components, providers, and styles (e.g. `@repo/ui/button`, `@repo/ui/providers`)
- `next`, `react`, `react-dom`
- **Styling:** `tailwindcss`, `@tailwindcss/postcss` (Tailwind v4)

## Configuration

- **ESLint:** `@repo/eslint-config/next-js` (flat config in `eslint.config.js`)
- **TypeScript:** extends `@repo/typescript-config/nextjs.json`
- **Next.js:** `next.config.js` (ESM)

## Conventions

- Prefer Tailwind utility classes aligned with `@repo/ui` patterns; global CSS lives in `globals.css` and the UI package.
- Wrap the app with `<Providers>` from `@repo/ui/providers` in the root layout (theme, tooltips, toasts).
- Import shared UI from subpaths: `@repo/ui/<name>` (e.g. `@repo/ui/button`).
- Static assets go in `public/`.
- Local fonts use `next/font/local` in the root layout.
- App-specific pages and content stay under that app’s `app/`; shared primitives belong in `packages/ui`, not duplicated across apps.

## Monorepo context

Repo-wide commands and stack: **[`../AGENTS.md`](../AGENTS.md)**.
