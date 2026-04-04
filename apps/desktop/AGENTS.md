# AGENTS.md — apps/desktop

**Read this when:** du die Electron-Desktop-App (Main/Preload, Build) änderst.

## Zweck

**Electron**-App mit **TypeScript** (ESM): Main in `src/main.ts`, Preload in `src/preload.ts`, **Renderer** mit **Vite + React** und **shadcn/Radix-Nova**-Komponenten aus `@repo/ui` (u. a. Sidebar-Layout).

## Befehle

Vom **Repository-Root** (empfohlen — Turbo führt `^build` aus, u. a. **`@repo/electron`**):

```sh
pnpm exec turbo run dev --filter=desktop
pnpm exec turbo run build --filter=desktop
pnpm exec turbo run lint --filter=desktop
pnpm exec turbo run check-types --filter=desktop
```

**Turborepo:** In [`turbo.json`](turbo.json) ist für `desktop` **`dev` → `dependsOn: ["^build"]`** gesetzt. Ein `turbo run dev --filter=desktop` baut damit zuerst die Workspace-Abhängigkeiten (inkl. `@repo/electron`), danach läuft das `dev`-Script: einmal **`tsc`** (Main/Preload), dann **Vite** auf Port **5173**, **`tsc --watch`**, **`wait-on`**, Electron mit `DESKTOP_RENDERER_URL=http://localhost:5173`. **Produktion:** `vite build` → `dist/renderer/`, Main/Preload → `dist/*.js`.

**Nur innerhalb `apps/desktop`:** `pnpm dev` / `pnpm build` rufen **kein** Turbo-`^build` auf — **`@repo/electron`** ist dann ggf. nicht gebaut. Entweder Root-Befehle wie oben oder zuerst `pnpm exec turbo run build --filter=@repo/electron`. Die Scripts **`start`**, **`dist`** und **`dist:dir`** rufen weiterhin explizit **`@repo/electron`** auf, falls du ohne Turbo-Pipeline arbeitest.

## Pfade

| Pfad                              | Rolle                                                                                                                                                                                                              |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/main.ts`                     | Fenster, `loadURL` (Dev) / `loadFile` (Build), `ipcMain`                                                                                                                                                           |
| `src/preload.ts`                  | `contextBridge` → `window.desktop`                                                                                                                                                                                 |
| `src/renderer/`                   | React-Einstieg, `globals.css`, **DesktopLayout** (Sidebar)                                                                                                                                                         |
| `vite.config.ts`                  | Vite (Root `src/renderer`, Alias `@` → `src/renderer`)                                                                                                                                                             |
| `components.json`                 | shadcn-CLI-Aliases (wie `web`)                                                                                                                                                                                     |
| `dist/main.js`, `dist/preload.js` | Ausgabe `tsc`                                                                                                                                                                                                      |
| `dist/renderer/`                  | Ausgabe `vite build` (`index.html`, Assets)                                                                                                                                                                        |
| [`resources/`](./resources/)      | Electron-Builder-Assets: **`icon.icns`** (macOS), **`icon.ico`** (Windows), **`icon.png`** (Linux) — aus `@repo/brand/logo.png` via [`scripts/generate-electron-icons.mjs`](./scripts/generate-electron-icons.mjs) |

**Icons aktualisieren:** `pnpm generate:electron-icons` (Root) oder `pnpm --filter desktop run generate:electron-icons`. **`pnpm run dist`** / **`dist:dir`** rufen die Generierung automatisch vor dem Packen auf.

## Distribution (macOS): „beschädigt“ / Gatekeeper / Start-Crash

**Electron** ist auf **37.x** gepinnt (`package.json` / `build.electronVersion`) — **Electron 34** konnte unter **macOS 26** beim Start in `ElectronMain`/V8 mit `EXC_BREAKPOINT` abstürzen; ein höheres Chromium/V8 hilft hier.

Unter **macOS** setzt `main.ts` **kein** Fenster-/Dock-Icon aus der **PNG** (`@repo/brand/logo`) — nur **Windows/Linux** nutzen diese Datei; das Bundle-Icon kommt von **`resources/icon.icns`** (electron-builder). Sonst kann Chromiums **rust_png**-Pfad beim Start noch abstürzen (Stack wie in [electron/electron#49522](https://github.com/electron/electron/issues/49522)).

Öffentliche **Pre-Releases** ohne Apple **Developer ID** nutzen unter `build.mac` zusätzlich **`identity: null`** (electron-builder-Workaround, s. [electron/electron#49522](https://github.com/electron/electron/issues/49522)). Downloads sind dann **nicht** von Apple verifiziert.

- **Symptom:** Nach dem Download meldet macOS, die **.app** sei **beschädigt** — oft **kein** kaputter Build, sondern **Gatekeeper** + Quarantäne.
- **Nutzer:** App aus dem DMG nach **Programme** ziehen, dann **Rechtsklick → Öffnen** (beim ersten Mal), oder im Terminal:  
  `xattr -cr "/Applications/ZunftGewerk - Software für Handwerksbetriebe.app"`
- **Produktion:** **Code Signing** + **Notarisierung** (GitHub Secrets `CSC_*`, `APPLE_*`), dann `identity: null` entfernen und Release erneut bauen — siehe Kommentar in [`.github/workflows/desktop-release.yml`](../../.github/workflows/desktop-release.yml).

## Renderer-UI

**Vite-Renderer** nutzt `@repo/ui` — [**Web Interface Guidelines**](../../AGENTS.md#web-interface-guidelines) (Root).

## Monorepo

**IPC / Typen:** [`../../packages/electron/AGENTS.md`](../../packages/electron/AGENTS.md) · Repo-weit & Skills: [`../../AGENTS.md`](../../AGENTS.md) · [`../../.agents/README.md`](../../.agents/README.md).
