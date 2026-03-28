# AGENTS.md — apps/docs

Documentation Next.js application.

## Overview

- **Framework:** Next.js 16.2 with App Router (`app/` directory)
- **Dev server:** `pnpm dev` → runs on port 3001
- **Build:** `pnpm build` → outputs to `.next/`

## Structure

```
app/
  layout.tsx    → Root layout (fonts, global styles)
  page.tsx      → Homepage
  globals.css   → Global CSS
  page.module.css → Page-scoped CSS modules
  fonts/        → Local font files (Geist Sans, Geist Mono)
public/         → Static assets (SVGs, icons)
```

## Dependencies

- `@repo/ui` — shared React components (imported as `@repo/ui/<component>`)
- `next`, `react`, `react-dom`

## Configuration

- **ESLint:** uses `@repo/eslint-config/next-js` (flat config in `eslint.config.js`)
- **TypeScript:** extends `@repo/typescript-config/nextjs.json`
- **Next.js config:** `next.config.js` (ESM, currently empty/default)

## Conventions

- Use CSS Modules (`*.module.css`) for component-scoped styles.
- Import shared UI components from `@repo/ui/<name>` (e.g., `@repo/ui/button`).
- Static assets go in `public/`.
- Local fonts are loaded via `next/font/local` in the root layout.
