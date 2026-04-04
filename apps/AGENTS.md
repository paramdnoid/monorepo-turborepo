# AGENTS.md — apps

**Read this when:** you work under `apps/` and need to know which application to edit.

Context for applications under `apps/`: **Next.js** (`web`), the **Hono** API (`api`), **Electron** (`desktop`), and **Expo** (`mobile`).

## Apps at a glance

| Package   | Stack          | Role                       | Port / notes          | Turbo `--filter` |
| --------- | -------------- | -------------------------- | --------------------- | ---------------- |
| `web`     | Next.js 16.2   | Primary web application    | 3000                  | `web`            |
| `api`     | Hono + Drizzle | Backend HTTP API           | 4000 (default `PORT`) | `api`            |
| `desktop` | Electron + TS  | Desktop shell (IPC)        | — (native window)     | `desktop`        |
| `mobile`  | Expo + RN      | Mobile app (iOS / Android) | Expo / Metro          | `mobile`         |

Use **`pnpm exec turbo run <task> --filter=<name>`** with the filter column value (see root [`AGENTS.md`](../AGENTS.md) for the full workspace name table). In scripts and CI, always **`turbo run`**, not the `turbo <task>` shorthand.

**Root `pnpm dev`:** runs `turbo run dev` for **all** apps that define `dev` — `web`, `api`, and `desktop` — in parallel. Prefer a single filter for everyday work; details in root [`AGENTS.md`](../AGENTS.md) (**Commands**). For **`desktop`**, `turbo run dev` runs upstream **`^build`** (including `@repo/electron`) before the app dev server — see [`desktop/AGENTS.md`](desktop/AGENTS.md).

## Choosing an app

| Goal                                       | Where to work                                            |
| ------------------------------------------ | -------------------------------------------------------- |
| User-facing product / main Next experience | **`web`** — [`web/AGENTS.md`](web/AGENTS.md)             |
| Backend API, Health, DB, Sync-Endpunkte    | **`api`** — [`api/AGENTS.md`](api/AGENTS.md)             |
| Desktop-Fenster, Main/Preload, lokale IPC  | **`desktop`** — [`desktop/AGENTS.md`](desktop/AGENTS.md) |
| iOS / Android (Expo)                       | **`mobile`** — [`mobile/AGENTS.md`](mobile/AGENTS.md)    |

## Next.js (`web`)

- **Framework:** Next.js 16.2 with App Router (`app/` directory)
- **Build:** from the repo root, `pnpm exec turbo run build --filter=web`, or root `pnpm build` to run `build` across the workspace; from inside `apps/web`, `pnpm build` runs `next build` and outputs to `.next/`.
- **Type-check:** from the repo root, `pnpm exec turbo run check-types --filter=web`; from the app directory, `pnpm check-types` runs `next typegen` then `tsc --noEmit`.

**Structure (typical):**

```
app/
  layout.tsx      → Root layout: Geist via `@repo/fonts/geist`, `<Providers>` from @repo/ui, children
  page.tsx        → Homepage / entry route
  globals.css     → Imports shared tokens/styles from @repo/ui (see below)
public/           → Static assets (favicon, SVGs, etc.)
```

Shared Geist Sans / Geist Mono (`.woff` + `next/font/local`) live in **[`packages/fonts`](../packages/fonts)** — import `geistSans` and `geistMono` from `@repo/fonts/geist` in `layout.tsx`; do not add per-app `app/fonts/` copies.

`app/globals.css` pulls in design tokens and base styles via:

`@import "@repo/ui/styles/globals.css";`

**Dependencies:** `@repo/ui`, `@repo/fonts`, `next`, `react`, `react-dom`, Tailwind v4 (`tailwindcss`, `@tailwindcss/postcss`). Product copy lives under **`apps/web/content`**.

**Configuration:** ESLint `@repo/eslint-config/next-js`; TypeScript extends `@repo/typescript-config/nextjs.json`; Next.js ESM config.

**Conventions:** Prefer Tailwind aligned with `@repo/ui`; wrap with `<Providers>` from `@repo/ui/providers`; import shared UI from `@repo/ui/<name>`; app-specific UI stays in the app, shared primitives in `packages/ui`.

Per-app notes: **[`web/AGENTS.md`](web/AGENTS.md)**.

## Monorepo

Repo-weite Regeln: **[`../AGENTS.md`](../AGENTS.md)** · Agent-/Skill-Index: **[`../.agents/README.md`](../.agents/README.md)** (u. a. **Web Interface Guidelines** im Root).
