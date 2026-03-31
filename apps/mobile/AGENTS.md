# AGENTS.md — apps/mobile

**Read this when:** du die Expo-App, Metro oder mobile-spezifische Konfiguration änderst.

## Zweck

**Expo SDK 54** (React Native). Workspace-Name **`mobile`**.

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
```

(`mobile` definiert kein `dev`-Script; Root-`pnpm dev` startet weiterhin `web`, `api`, `desktop`.)

## Pfade

| Pfad           | Rolle                          |
| -------------- | ------------------------------ |
| [`App.tsx`](App.tsx) | App-Einstieg                   |
| [`app.json`](app.json) | Expo-Konfiguration             |
| [`.npmrc`](.npmrc) | `node-linker=hoisted` (pnpm/Metro) |

## Monorepo

Root: **[`../../AGENTS.md`](../../AGENTS.md)**. Apps-Übersicht: **[`../AGENTS.md`](../AGENTS.md)**.
