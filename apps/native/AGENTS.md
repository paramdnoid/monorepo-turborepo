# AGENTS.md — apps/native

**Read this when:** you change Metro, native navigation, WebView vs NativeWind, iOS/Android projects, or the native shell around the shared starter UI.

React Native application (Community CLI template). **`package.json` `name`:** `native` — use **`pnpm exec turbo <task> --filter=native`**. **Native project / bundle id:** `nativeapp` — the CLI reserves the name `native` for new projects, so Android/iOS and `app.json` still use `nativeapp`.

## Project layout (orientation)

| Path                                                                           | Role                                                                       |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| [`App.tsx`](./App.tsx)                                                         | Root component — switches WebView vs native shell                          |
| [`src/`](./src/)                                                               | WebView shell, native starter UI, config (`features.ts`, `web-app-url.ts`) |
| [`components/`](./components/)                                                 | Native UI (e.g. `components/ui/`, logos)                                   |
| [`android/`](./android/), [`ios/`](./ios/)                                     | Gradle / Xcode projects (`nativeapp`)                                      |
| [`metro.config.js`](./metro.config.js), [`babel.config.js`](./babel.config.js) | Bundler / NativeWind (often ignored by ESLint)                             |

## Commands

From repo root:

| Task       | Command                                       |
| ---------- | --------------------------------------------- |
| Metro      | `pnpm exec turbo dev --filter=native`         |
| Lint       | `pnpm exec turbo lint --filter=native`        |
| Type-check | `pnpm exec turbo check-types --filter=native` |
| Android    | `cd apps/native && pnpm android`              |
| iOS        | `cd apps/native && pnpm ios`                  |

Root `pnpm dev` starts Metro here together with the Next.js `dev` tasks (`dev` and `start` both run `react-native start`). From `apps/native`: `pnpm dev`, `pnpm start`, `pnpm lint`, `pnpm check-types`, etc.

## Stack

- **React Native** 0.84.x, **React** 19.x
- **WebView mode (default):** [`src/config/features.ts`](./src/config/features.ts) sets `USE_WEBVIEW = true`. The app loads the **Next.js** dev server (port **3000**) inside [`react-native-webview`](https://github.com/react-native-webview/react-native-webview) — **identical DOM and `@repo/ui`** to the browser. Requires `pnpm dev` at the repo root (or only the `web` app on :3000). URL logic: [`src/config/web-app-url.ts`](./src/config/web-app-url.ts) (`localhost` on iOS Simulator, `10.0.2.2` on Android Emulator; set `WEB_APP_HOST_OVERRIDE` for a physical device). The WebView shell now enforces a narrow allowed origin (derived from the configured URL) and token-styled loading/error fallbacks.
- **Native UI mode:** set `USE_WEBVIEW` to `false`. Then **NativeWind v5** + [`components/ui/`](./components/ui/) + shared [`theme-tokens.css`](../../packages/ui/src/styles/theme-tokens.css) — offline-capable, not the same source as `@repo/ui`. Theme selection follows system light/dark mode (no hardcoded dark wrapper).
- **Animation:** `react-native-reanimated` + `react-native-worklets` (required by Reanimated 4 / NativeWind).
- **TypeScript:** `@react-native/typescript-config` + [`nativewind-env.d.ts`](./nativewind-env.d.ts); `pnpm check-types` runs `tsc --noEmit`.
- **ESLint:** `@react-native/eslint-config` (`.eslintrc.js`); config files like `babel.config.js` / `metro.config.js` are ignored by ESLint (NativeWind Babel would otherwise confuse the parser).
- **Node:** same engine as the repo root (`package.json` `engines`) — **≥ 22.11**

## Native projects

- **iOS:** After dependency changes, run `bundle install` and `bundle exec pod install` under `ios/`. Open **`nativeapp.xcworkspace`** in Xcode (not the `.xcodeproj` alone).
- **Android:** Gradle under `android/`; JDK and Android SDK as required by RN docs.

CI does **not** compile iOS/Android binaries; it runs `pnpm lint`, `pnpm check-types`, and `pnpm build` (Next.js apps only). Local simulator/device builds stay on developer machines.

## Monorepo context

Shared **copy and URLs** for the Turborepo starter screen live in [`@repo/turborepo-starter`](../../packages/turborepo-starter) — imported by [`apps/web/app/page.tsx`](../web/app/page.tsx) and native shell code (e.g. [`src/NativeTurborepoApp.tsx`](./src/NativeTurborepoApp.tsx)). **Design tokens** live in `@repo/ui` styles ([`theme-tokens.css`](../../packages/ui/src/styles/theme-tokens.css)). Next apps load full globals via [`globals.css`](../../packages/ui/src/styles/globals.css). Repo-wide commands and stack: **[`../../AGENTS.md`](../../AGENTS.md)**.
