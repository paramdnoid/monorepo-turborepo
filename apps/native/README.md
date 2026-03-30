# `native` (React Native App)

React-Native-Anwendung (Paketname `native`, Projekt-/Bundle-Name `nativeapp`) im Turborepo-Monorepo.

## Betriebsmodi

Die App hat zwei Modi:

- **WebView-Modus (Standard):**
  - `USE_WEBVIEW = true` in `src/config/features.ts`
  - lädt die Next.js-`web`-App (Port 3000) in einer `react-native-webview`
  - nutzt denselben DOM-/`@repo/ui`-Pfad wie der Browser
- **Native-UI-Modus:**
  - `USE_WEBVIEW = false`
  - rendert NativeWind + lokale `components/ui`
  - gemeinsame Design-Tokens über `global.css` + `packages/ui/src/styles/theme-tokens.css`

## Wichtige Dateien

- `App.tsx` – Umschalten WebView vs Native UI
- `src/WebShell.tsx` – WebView-Container, Origin-Whitelist, Fehler-/Ladezustand
- `src/NativeTurborepoApp.tsx` – Native Starter-UI
- `src/config/features.ts` – Feature-Flags
- `src/config/web-app-url.ts` – URL-Auflösung (`localhost`, `10.0.2.2`, Host-Override)

## Kommandos (vom Repo-Root)

```sh
pnpm exec turbo dev --filter=native
pnpm exec turbo lint --filter=native
pnpm exec turbo check-types --filter=native
pnpm exec turbo test --filter=native
```

Direkt im Ordner `apps/native`:

```sh
pnpm dev
pnpm android
pnpm ios
pnpm test
```

## Mobile Builds

### Android

```sh
cd apps/native
pnpm android
```

### iOS

```sh
cd apps/native/ios
bundle install
bundle exec pod install
cd ..
pnpm ios
```

## Hinweise

- Für **WebView-Modus** muss die `web`-App auf Port 3000 erreichbar sein.
- Auf echten Geräten ggf. `WEB_APP_HOST_OVERRIDE` setzen.
- In Produktion verlangt der WebView-Modus eine gültige `https://`-`WEB_APP_PROD_URL`.
- CI baut keine nativen iOS-/Android-Binaries; lokale Builds bleiben Entwickleraufgabe.
