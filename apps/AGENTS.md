# AGENTS.md — apps

Context for applications under `apps/`: **Next.js** sites (`web`, `docs`) and the **React Native** app (`native`).

## Apps at a glance

| Package  | Stack        | Role                        | Port / notes          | Turbo filter      |
| -------- | ------------ | --------------------------- | --------------------- | ----------------- |
| `web`    | Next.js 16.2 | Primary web application     | 3000                  | `--filter=web`    |
| `docs`   | Next.js 16.2 | Documentation site          | 3001                  | `--filter=docs`   |
| `native` | RN + NativeWind | Mobile app (`nativeapp` id) | Metro (no fixed port) | `--filter=native` |

## Next.js (`web`, `docs`)

Shared rules for both Next apps: same stack and conventions; only ports and package names differ.

- **Framework:** Next.js 16.2 with App Router (`app/` directory)
- **Build:** `pnpm build` → outputs to `.next/`
- **Type-check:** `pnpm check-types` runs `next typegen` then `tsc --noEmit`

**Structure (typical):**

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

**Dependencies:** `@repo/ui`, `next`, `react`, `react-dom`, Tailwind v4 (`tailwindcss`, `@tailwindcss/postcss`).

**Configuration:** ESLint `@repo/eslint-config/next-js`; TypeScript extends `@repo/typescript-config/nextjs.json`; Next.js ESM config.

**Conventions:** Prefer Tailwind aligned with `@repo/ui`; wrap with `<Providers>` from `@repo/ui/providers`; import shared UI from `@repo/ui/<name>`; app-specific UI stays in the app, shared primitives in `packages/ui`.

Per-app notes: **[`web/AGENTS.md`](web/AGENTS.md)**, **[`docs/AGENTS.md`](docs/AGENTS.md)**.

## React Native (`native`)

**Tailwind / shadcn parity:** NativeWind + shared `theme-tokens.css` from `@repo/ui` styles; local `components/ui` (not `@repo/ui` imports). See **[`native/AGENTS.md`](native/AGENTS.md)** for Metro, iOS/Android, CocoaPods, and the `nativeapp` naming.

## Monorepo context

Repo-wide commands and stack: **[`../AGENTS.md`](../AGENTS.md)**.
