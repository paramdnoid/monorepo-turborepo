# AGENTS.md — apps/desktop

**Read this when:** du die Electron-Desktop-App (Main/Preload, Build) änderst.

## Zweck

Minimale **Electron**-App mit **TypeScript** (ESM): Main-Prozess in `src/main.ts`, Preload in `src/preload.ts`, statisches UI in `static/index.html`.

## Befehle

```sh
pnpm exec turbo run dev --filter=desktop
pnpm exec turbo run build --filter=desktop
pnpm exec turbo run lint --filter=desktop
pnpm exec turbo run check-types --filter=desktop
```

`dev` kompiliert einmal, startet dann `tsc --watch` und Electron.

## Pfade

| Pfad                 | Rolle                                      |
| -------------------- | ------------------------------------------ |
| `src/main.ts`        | Fenster, `ipcMain`, App-Lifecycle          |
| `src/preload.ts`     | `contextBridge` → `window.desktop`         |
| `static/index.html`  | Renderer (ohne Bundler)                    |
| `dist/`              | Ausgabe von `tsc` (`main.js`, `preload.js`) |

## Monorepo

Root: **[`../../AGENTS.md`](../../AGENTS.md)**.
