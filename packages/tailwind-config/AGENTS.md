# AGENTS.md — packages/tailwind-config

**Read this when:** you change shared Tailwind v4 styles, PostCSS wiring, or package `exports` for `@repo/tailwind-config`.

## Purpose

**`@repo/tailwind-config`** provides shared **CSS** and **PostCSS** configuration for Next.js apps and `@repo/ui`. It is a **style/config** package: there are **no** `scripts` in `package.json`, so Turbo does not run `lint` / `check-types` / `build` here — validation happens in dependents (`web`, `@repo/ui`, `desktop`, etc.).

## Exports

See [`package.json`](./package.json) `exports`:

- **`@repo/tailwind-config`** — shared stylesheet entry (e.g. `shared-styles.css`).
- **`@repo/tailwind-config/postcss`** — PostCSS config for apps that wire Tailwind v4.

## Consumers

Typically referenced from **`@repo/ui`**, Next apps, and **`apps/desktop`** as a dev/workspace dependency.

## Monorepo

Root context: **[`../../AGENTS.md`](../../AGENTS.md)**. Shared UI tokens and globals: [`packages/ui/AGENTS.md`](../ui/AGENTS.md).
