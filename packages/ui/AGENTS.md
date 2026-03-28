# AGENTS.md — packages/ui

Shared React component library (`@repo/ui`).

## Overview

Internal component library consumed by all Next.js apps in this monorepo. Components are exported directly from source — no build step required.

## Export Pattern

Each `.tsx` file in `src/` is automatically an export via the package.json `exports` field:

```json
{ "./*": "./src/*.tsx" }
```

Consumers import as: `import { Button } from "@repo/ui/button"`.

## Adding a New Component

1. Create a new file in `src/`, e.g., `src/dialog.tsx`.
2. Export the component(s) from that file.
3. Consumers can immediately import it: `import { Dialog } from "@repo/ui/dialog"`.
4. Alternatively, use the Turbo generator: `turbo gen react-component`.

No additional registration or barrel file is needed.

## Conventions

- **Client Components** that use hooks, event handlers, or browser APIs must include the `"use client"` directive at the top of the file.
- **Server Components** (no interactivity) do not need the directive.
- Props interfaces should be explicitly typed and exported when useful for consumers.
- Components should be named exports (not default exports).

## Configuration

- **ESLint:** uses `@repo/eslint-config/react-internal` (flat config in `eslint.config.mjs`)
- **TypeScript:** extends `@repo/typescript-config/react-library.json` with `strictNullChecks: true`

## Existing Components

| Component | File | Notes |
|-----------|------|-------|
| `Button` | `src/button.tsx` | Client component — triggers an alert |
| `Card` | `src/card.tsx` | Server component — renders a linked card |
| `Code` | `src/code.tsx` | Inline code display |
