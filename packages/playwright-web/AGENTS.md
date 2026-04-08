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

**Local runs:** the **`web`** app (and usually **`api`** if tests hit BFF → API) must match what the tests expect — start e.g. `pnpm exec turbo run dev --filter=web` (and `--filter=api` if needed) or use your team’s E2E env from [`.env.example`](../../.env.example).

**Katalog / Ressourcenmanagement:** [`e2e/catalog-resource-management.spec.ts`](./e2e/catalog-resource-management.spec.ts) nutzt ein Test-JWT-Cookie plus **gemockte** `/api/web/catalog/*`-Antworten (kein laufendes `api`, keine Keycloak-Anmeldung). Vollständiger Backend-Pfad bleibt über `pnpm --filter api run smoke:http` abgedeckt.

## CI

GitHub Actions runs **`pnpm exec turbo run e2e`** (on PRs with **`--affected`** when the plan includes this task). See root **[`../../AGENTS.md`](../../AGENTS.md)** (**Tests and CI** / **Local verification**).

## Monorepo

App under test: [`apps/web/AGENTS.md`](../../apps/web/AGENTS.md) · Repo-weit & Skills: [`../../AGENTS.md`](../../AGENTS.md) · [`../../.agents/README.md`](../../.agents/README.md).
