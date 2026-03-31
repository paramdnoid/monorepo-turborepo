# AGENTS.md — apps/desktop

**Read this when:** du die Electron-Desktop-App (Main/Preload, Build) änderst.

## Zweck

**Electron**-App mit **TypeScript** (ESM): Main in `src/main.ts`, Preload in `src/preload.ts`, **Renderer** mit **Vite + React** und **shadcn/Radix-Nova**-Komponenten aus `@repo/ui` (u. a. Sidebar-Layout).

## Befehle

```sh
pnpm exec turbo run dev --filter=desktop
pnpm exec turbo run build --filter=desktop
pnpm exec turbo run lint --filter=desktop
pnpm exec turbo run check-types --filter=desktop
```

`dev`: baut `@repo/electron`, kompiliert Main/Preload, startet **Vite** auf Port **5173**, `tsc --watch` und Electron mit `DESKTOP_RENDERER_URL=http://localhost:5173`. Produktion: `vite build` → `dist/renderer/`, Main/Preload → `dist/*.js`.

## Pfade

| Pfad                                      | Rolle                                                        |
| ----------------------------------------- | ------------------------------------------------------------ |
| `src/main.ts`                             | Fenster, `loadURL` (Dev) / `loadFile` (Build), `ipcMain`     |
| `src/preload.ts`                          | `contextBridge` → `window.desktop`                           |
| `src/renderer/`                           | React-Einstieg, `globals.css`, **DesktopLayout** (Sidebar)   |
| `vite.config.ts`                          | Vite (Root `src/renderer`, Alias `@` → `src/renderer`)       |
| `components.json`                         | shadcn-CLI-Aliases (wie `web`/`docs`)                        |
| `dist/main.js`, `dist/preload.js`         | Ausgabe `tsc`                                                |
| `dist/renderer/`                          | Ausgabe `vite build` (`index.html`, Assets)                  |

## Monorepo

Shared IPC-Kanalnamen und `DesktopApi`-Typ: **[`../../packages/electron/AGENTS.md`](../../packages/electron/AGENTS.md)** (`@repo/electron`).

Root: **[`../../AGENTS.md`](../../AGENTS.md)**.
