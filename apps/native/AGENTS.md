# AGENTS.md — apps/native

React Native application (Community CLI template). **Package name:** `native` (Turbo: `--filter=native`). **Native project / bundle id:** `nativeapp` — the CLI reserves the name `native` for new projects, so Android/iOS and `app.json` still use `nativeapp`.

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
- **WebView mode (default):** [`src/config/features.ts`](./src/config/features.ts) sets `USE_WEBVIEW = true`. The app loads the **Next.js** dev server (port **3000**) inside [`react-native-webview`](https://github.com/react-native-webview/react-native-webview) — **identical DOM and `@repo/ui`** to the browser. Requires `pnpm dev` at the repo root (or only the `web` app on :3000). URL logic: [`src/config/web-app-url.ts`](./src/config/web-app-url.ts) (`localhost` on iOS Simulator, `10.0.2.2` on Android Emulator; set `WEB_APP_HOST_OVERRIDE` for a physical device).
- **Native UI mode:** set `USE_WEBVIEW` to `false`. Then **NativeWind v5** + [`components/ui/`](./components/ui/) + shared [`theme-tokens.css`](../packages/ui/src/styles/theme-tokens.css) — offline-capable, not the same source as `@repo/ui`.
- **Animation:** `react-native-reanimated` + `react-native-worklets` (required by Reanimated 4 / NativeWind).
- **TypeScript:** `@react-native/typescript-config` + [`nativewind-env.d.ts`](./nativewind-env.d.ts); `pnpm check-types` runs `tsc --noEmit`.
- **ESLint:** `@react-native/eslint-config` (`.eslintrc.js`); config files like `babel.config.js` / `metro.config.js` are ignored by ESLint (NativeWind Babel would otherwise confuse the parser).
- **Node:** same engine as the repo root (`package.json` `engines`) — **≥ 22.11**

## Native projects

- **iOS:** After dependency changes, run `bundle install` and `bundle exec pod install` under `ios/`. Open **`nativeapp.xcworkspace`** in Xcode (not the `.xcodeproj` alone).
- **Android:** Gradle under `android/`; JDK and Android SDK as required by RN docs.

CI does **not** compile iOS/Android binaries; it runs `pnpm lint`, `pnpm check-types`, and `pnpm build` (Next.js apps only). Local simulator/device builds stay on developer machines.

## Monorepo context

Shared **copy and URLs** for the Turborepo starter screen live in [`@repo/turborepo-starter`](../../packages/turborepo-starter) — imported by **both** [`apps/web/app/page.tsx`](../web/app/page.tsx) and this app’s [`App.tsx`](./App.tsx). **Design tokens** live in `@repo/ui` styles ([`packages/ui/src/styles/theme-tokens.css`](../packages/ui/src/styles/theme-tokens.css)). Next apps load tokens via [`globals.css`](../packages/ui/src/styles/globals.css). Repo-wide commands and stack: **[`../../AGENTS.md`](../../AGENTS.md)**.
