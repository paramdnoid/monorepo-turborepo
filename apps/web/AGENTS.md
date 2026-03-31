# AGENTS.md — apps/web

**Read this when:** you change the primary Next.js product (routes, layout, env, landing, onboarding, or legal).

**Purpose:** Main user-facing web app — product landing, onboarding (Keycloak/Stripe APIs), legal pages, `@repo/ui`, port **3000**.

## Key paths

| Path | Role |
| ---- | ---- |
| [`app/layout.tsx`](app/layout.tsx) | Root layout: Geist, `<Providers>`, `LocaleProvider`, `generateMetadata` — **Favicons** über [`app/favicon.ico`](app/favicon.ico), [`app/icon.png`](app/icon.png), [`app/apple-icon.png`](app/apple-icon.png) (aus `@repo/brand` via `pnpm generate:icons`) |
| [`app/page.tsx`](app/page.tsx) | Landing: marketing sections, JSON-LD, `getUiText` / `getServerLocale` |
| [`app/onboarding/`](app/onboarding/) | Onboarding wizard (server page + client components) |
| [`app/legal/`](app/legal/) | Imprint, privacy, terms (`layout` + `SiteFooter` / `LegalHeader`) |
| [`app/api/onboarding/`](app/api/onboarding/) | `register`, `complete-billing` route handlers |
| [`lib/db.ts`](lib/db.ts) | Server-only Postgres (`DATABASE_URL`) für `@repo/db` |
| [`lib/provision-organization.ts`](lib/provision-organization.ts) | Nach Sign-up: Zeile in `organizations` (idempotent) |
| [`content/`](content/) | `ui-text`, `faqs`, `features`, `steps`, `trades` (copy and data) |
| [`components/marketing/`](components/marketing/) | Landing sections, header, footer, FAQ dialog |
| [`components/onboarding/`](components/onboarding/) | Onboarding UI + app-local `ToggleGroup` (premium variant) |
| [`lib/i18n/`](lib/i18n/), [`lib/auth/`](lib/auth/), [`lib/trades/`](lib/trades/) | Locale, session cookie/JWT, trade ids |
| [`app/globals.css`](app/globals.css) | Imports `@repo/ui` globals + product utilities (panels, hero, legal scrollbar) |
| [`.env.example`](.env.example) | Stripe, Keycloak/OIDC, **`DATABASE_URL`** (Mandanten-Provision) — copy to `.env.local` |

## Mandanten-Provision und `DATABASE_URL`

Nach erfolgreicher Registrierung legt [`lib/provision-organization.ts`](lib/provision-organization.ts) eine Zeile in `organizations` an (**gleiche Postgres-Instanz** wie `apps/api`). Ohne `DATABASE_URL` wird das **übersprungen** (lokal ok).

**Checkliste Staging/Prod**

- [ ] `DATABASE_URL` im Hosting gesetzt (Vercel/…) — identisch zur API-DB.
- [ ] Migrationen auf dieser DB angewendet (`pnpm --filter @repo/db exec drizzle-kit migrate` in Deploy-Pipeline oder manuell).
- [ ] Logs prüfen: fehlt die Variable bei `NODE_ENV=production`, erscheint eine **Warnung** `[web/db] DATABASE_URL fehlt …` (einmal pro Node-Prozess).

End-to-End mit echtem Keycloak: [`../api/KEYCLOAK-E2E-RUNBOOK.md`](../api/KEYCLOAK-E2E-RUNBOOK.md) (Weg A: Web + DB).

## Dependencies (workspace)

- `@repo/ui`, `@repo/fonts`, `@repo/brand`
- `@repo/db`, `@repo/api-contracts` — serverseitig: Mandanten-Provision nach Registrierung (gleiche DB wie `apps/api`)
- Direct: `zod`, Stripe packages, `lucide-react`, `framer-motion`, `radix-ui`, `next-themes`, `class-variance-authority`, `server-only`

## Commands

From repo root (Turbo package name is **`web`**):

```sh
pnpm exec turbo run dev --filter=web
pnpm exec turbo run build --filter=web
pnpm exec turbo run lint --filter=web
pnpm exec turbo run check-types --filter=web
```

Shared Next.js structure: **[`../AGENTS.md`](../AGENTS.md)**. Monorepo-wide: **[`../../AGENTS.md`](../../AGENTS.md)**.
