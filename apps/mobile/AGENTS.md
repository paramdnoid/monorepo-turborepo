# AGENTS.md — apps/mobile

**Read this when:** du die Expo-App, Metro oder mobile-spezifische Konfiguration änderst.

## Zweck

**Expo SDK 54** (React Native). Workspace-Name **`mobile`**.

**Workspace packages:** nutzt u. a. **`@repo/brand`** (generierte Assets via Root-`pnpm generate:icons`); kein `@repo/ui` (React Native, eigene UI).

## Befehle

Von **`apps/mobile`**:

```sh
pnpm start
pnpm run ios
pnpm run android
```

Vom Repo-Root (nach `pnpm install`):

```sh
pnpm --filter mobile start
pnpm exec turbo run lint --filter=mobile
pnpm exec turbo run check-types --filter=mobile
```

(`mobile` definiert kein `dev`-Script; Root-`pnpm dev` startet weiterhin `web`, `api`, `desktop`.)

## Pfade

| Pfad                                     | Rolle                                      |
| ---------------------------------------- | ------------------------------------------ |
| [`App.tsx`](App.tsx)                     | App-Einstieg                               |
| [`eslint.config.mjs`](eslint.config.mjs) | `@repo/eslint-config/react-native`         |
| [`app.json`](app.json)                   | Expo-Konfiguration                         |
| [`turbo.json`](turbo.json)               | `extends` Root, Tag **`app`** (Boundaries) |
| [`.npmrc`](.npmrc)                       | `node-linker=hoisted` (pnpm/Metro)         |

## Monorepo

Apps-Übersicht: [`../AGENTS.md`](../AGENTS.md) · Repo-weit & Skills: [`../../AGENTS.md`](../../AGENTS.md) · [`../../.agents/README.md`](../../.agents/README.md).
