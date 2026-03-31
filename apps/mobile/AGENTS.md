# AGENTS.md — apps/mobile

**Read this when:** du die Expo-App, NativeWind, Metro oder mobile-spezifische Abhängigkeiten änderst.

## Zweck

**Expo SDK 54** (React Native) mit **NativeWind v4** (Tailwind 3.x im App-Setup). Workspace-Name **`mobile`** (`pnpm exec turbo run dev --filter=mobile`).

## Befehle

```sh
pnpm exec turbo run dev --filter=mobile
pnpm exec turbo run build --filter=mobile
pnpm exec turbo run lint --filter=mobile
pnpm exec turbo run check-types --filter=mobile
```

`dev` startet zuerst **`^build`** (u. a. `@repo/api-contracts`), dann **Expo / Metro**.

## Pfade

| Pfad                                       | Rolle                                                                         |
| ------------------------------------------ | ----------------------------------------------------------------------------- |
| [`App.tsx`](App.tsx)                       | Einstieg; `import "./global.css"` für NativeWind                              |
| [`global.css`](global.css)                 | Tailwind-`@tailwind`-Einstieg                                                 |
| [`tailwind.config.js`](tailwind.config.js) | NativeWind-Preset, `content`-Globs                                            |
| [`babel.config.js`](babel.config.js)       | `babel-preset-expo`, Preset `nativewind/babel`, Reanimated zuletzt als Plugin |
| [`metro.config.js`](metro.config.js)       | `withNativeWind` aus `nativewind/metro`                                       |
| [`.npmrc`](.npmrc)                         | `node-linker=hoisted` — pnpm/Metro (siehe unten)                              |

## Workspace

- **`@repo/api-contracts`** — Zod/Typen (kein `@repo/ui`; Web-Komponenten sind nicht RN-kompatibel).
- **ESLint:** [`@repo/eslint-config/react-native`](../../packages/eslint-config/react-native.js) (ohne `eslint-plugin-turbo`, damit ESLint außerhalb eines Turbo-Kontexts stabil bleibt).
- **`react-native-css-interop`** ist eine **direkte** Dependency, damit Metro `react-native-css-interop/jsx-runtime` zuverlässig auflöst.

## pnpm / Metro

Unter [`apps/mobile/.npmrc`](.npmrc) ist **`node-linker=hoisted`** gesetzt (von `create-expo-app` übernommen), damit Metro Abhängigkeiten wie erwartet findet. Bei Auflösungsproblemen zusätzlich die [NativeWind-Dokumentation](https://www.nativewind.dev) und die Expo-Doku prüfen.

## Monorepo

Root: **[`../../AGENTS.md`](../../AGENTS.md)**. Apps-Übersicht: **[`../AGENTS.md`](../AGENTS.md)**.
