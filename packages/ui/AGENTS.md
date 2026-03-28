# AGENTS.md — packages/ui

**Read this when:** you add or change shared React components, styles, or `exports` for `@repo/ui`.

Shared React component library (`@repo/ui`).

## Turbo package name

The workspace package name is **`@repo/ui`** (not the folder `ui` alone). From the repo root:

```sh
pnpm exec turbo lint --filter=@repo/ui
pnpm exec turbo check-types --filter=@repo/ui
```

(`build` is only defined for Next apps; this package has no `build` script.)

## Overview

Internal library used by all Next.js apps in this monorepo. React components are consumed **from source** via package `exports` (no separate build step for consumers). Styling uses **Tailwind CSS 4** with shared globals under `src/styles/`.

**Stack highlights:** the [`radix-ui`](https://www.npmjs.com/package/radix-ui) meta-package (bundled primitives), [`@base-ui/react`](https://www.npmjs.com/package/@base-ui/react), `class-variance-authority`, `tailwind-merge`, `next-themes`, `lucide-react`, and other deps listed in `package.json` (do not assume legacy `@radix-ui/react-*` single packages unless you add them).

**Shared theme tokens:** [`src/styles/theme-tokens.css`](./src/styles/theme-tokens.css) holds `:root` / `.dark` CSS variables and the Tailwind v4 `@theme inline` color/radius mappings. [`src/styles/globals.css`](./src/styles/globals.css) imports it, then adds `@source` for Next apps and `@layer base` for `body`. **`apps/native`** imports `theme-tokens.css` from its own `global.css` (NativeWind) so mobile stays visually aligned with web — without using these React components on native.

## Export map

`package.json` exports (simplified):

- **`@repo/ui/<component>`** — each `src/<name>.tsx` file (e.g. `button`, `dialog`, `sidebar`).
- **`@repo/ui/utils`** — `src/utils.ts` (e.g. `cn()` helper).
- **`@repo/ui/use-mobile`** — `src/use-mobile.ts`.
- **`@repo/ui/styles/*`** — CSS under `src/styles/` (e.g. `globals.css` for apps to import).

Example imports:

```ts
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/utils";
import { Providers } from "@repo/ui/providers";
```

## Adding a new component

1. Add `src/my-widget.tsx` with **named exports** (no default export).
2. Add `"use client"` when the file uses hooks, events, or browser-only APIs.
3. Consumers import immediately: `import { MyWidget } from "@repo/ui/my-widget"`.
4. From this package: `pnpm generate:component` (Turbo generator: `turbo gen react-component`).

No barrel `index.ts` is required — `exports` maps `./*` to `./src/*.tsx`.

### New modules that are not `*.tsx`

The `./*` → `./src/*.tsx` mapping only applies to **`.tsx`** files. If you add another `src/*.ts` module (not `utils` or `use-mobile`), add an **explicit** subpath under `package.json` → `exports` (same pattern as `./utils` and `./use-mobile`). CSS uses `./styles/*`.

## Conventions

- **Client vs server:** use `"use client"` only where needed; leave interactive pieces client-side, keep presentational pieces server-compatible when possible.
- **Props:** export explicit prop types/interfaces when consumers might reuse them.
- **Named exports** for components and helpers.
- Prefer existing primitives (`button`, `input`, `field`, etc.) when composing new UI.

## Component inventory

There are **many** primitives under `src/*.tsx` (forms, overlays, navigation, data display, charts, etc.). Treat `src/` and `package.json` → `exports` as the source of truth rather than a hand-maintained list in this file.

Illustrative examples: `accordion`, `alert-dialog`, `button`, `card`, `chart`, `command`, `dialog`, `dropdown-menu`, `input`, `select`, `sidebar`, `sonner`, `table`, `tabs`, `tooltip`, …

## Configuration

- **ESLint:** `@repo/eslint-config/react-internal` (`eslint.config.mjs`)
- **TypeScript:** `@repo/typescript-config/react-library.json` with `strictNullChecks: true`

## Monorepo context

Repo-wide commands, workspace filters, and stack details: **[`../../AGENTS.md`](../../AGENTS.md)**.
