# AGENTS.md — apps/web

**Read this when:** you change the primary Next.js product (routes, layout, env, landing, onboarding, or legal).

**Purpose:** Main user-facing web app — product landing, onboarding (Keycloak/Stripe APIs), legal pages, `@repo/ui`, port **3000**.

## Key paths

| Path | Role |
| ---- | ---- |
| [`app/layout.tsx`](app/layout.tsx) | Root layout: Geist, `<Providers>` (`@repo/ui/providers`), `LocaleProvider`, `generateMetadata` |
| [`app/page.tsx`](app/page.tsx) | Landing: marketing sections, JSON-LD, `@repo/brand`, `getUiText` / `getServerLocale` |
| [`app/onboarding/`](app/onboarding/) | Onboarding wizard (server page + client components) |
| [`app/legal/`](app/legal/) | Imprint, privacy, terms (`layout` + `SiteFooter` / `LegalHeader`) |
| [`app/api/onboarding/`](app/api/onboarding/) | `register`, `complete-billing` route handlers |
| [`content/`](content/) | `ui-text`, `faqs`, `features`, `steps`, `trades` (copy and data) |
| [`components/marketing/`](components/marketing/) | Landing sections, header, footer, FAQ dialog |
| [`components/onboarding/`](components/onboarding/) | Onboarding UI + app-local `ToggleGroup` (premium variant) |
| [`lib/i18n/`](lib/i18n/), [`lib/auth/`](lib/auth/), [`lib/trades/`](lib/trades/) | Locale, session cookie/JWT, trade ids |
| [`app/globals.css`](app/globals.css) | Imports `@repo/ui` globals + product utilities (panels, hero, legal scrollbar) |
| [`.env.example`](.env.example) | Stripe, Keycloak/OIDC — copy to `.env.local` |

## Dependencies (workspace)

- `@repo/ui`, `@repo/fonts`, `@repo/brand`, `@repo/turborepo-starter` (not required on the homepage; docs/native still use it)
- Direct: `zod`, Stripe packages, `lucide-react`, `framer-motion`, `radix-ui`, `next-themes`, `class-variance-authority`, `server-only`

## Commands

From repo root (Turbo package name is **`web`**):

```sh
pnpm exec turbo dev --filter=web
pnpm exec turbo build --filter=web
pnpm exec turbo lint --filter=web
pnpm exec turbo check-types --filter=web
```

Shared Next.js structure: **[`../AGENTS.md`](../AGENTS.md)**. Monorepo-wide: **[`../../AGENTS.md`](../../AGENTS.md)**.
