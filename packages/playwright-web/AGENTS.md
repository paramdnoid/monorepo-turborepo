# AGENTS.md — packages/playwright-web

**Read this when:** you change Playwright E2E tests, config, or how the package depends on the `web` app.

## Purpose

**`@repo/playwright-web`** runs **Playwright** end-to-end tests against the **`web`** Next.js app. It declares a **`workspace:*`** dependency on **`web`** so the product under test is part of the workspace graph.

## Commands

From the repository root:

```sh
pnpm e2e
pnpm exec turbo run e2e --filter=@repo/playwright-web
```

Interactive UI mode (from this package directory): `pnpm e2e:ui` (see `package.json`).

**Browsers:** install Chromium for local runs with `pnpm --filter @repo/playwright-web exec playwright install chromium` (CI installs with `--with-deps` as needed).

## CI

GitHub Actions runs **`pnpm exec turbo run e2e`** (on PRs with **`--affected`** when the plan includes this task). See root **[`../../AGENTS.md`](../../AGENTS.md)** (**Tests and CI** / **Local verification**).

## Monorepo

Root context: **[`../../AGENTS.md`](../../AGENTS.md)**. Primary app under test: [`apps/web/AGENTS.md`](../../apps/web/AGENTS.md).
