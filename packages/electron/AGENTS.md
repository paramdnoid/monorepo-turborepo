# AGENTS.md — packages/electron

**Read this when:** du gemeinsame Electron-IPC-Kanäle, Renderer-Typen (`DesktopApi`) oder Konventionen für Main/Preload änderst.

## Zweck

[`@repo/electron`](./package.json) enthält **IPC-Kanalnamen** (`IPC_CHANNELS`) und **TypeScript-Typen** (`DesktopApi`, `IpcInvokeChannel`) für die Desktop-App. Single Source of Truth für Main (`ipcMain`), Preload (`ipcRenderer.invoke`) und optionale Renderer-Typisierung.

## Consumers

| App       | Usage                                      |
| --------- | ------------------------------------------ |
| `desktop` | [`apps/desktop`](../../apps/desktop) importiert `@repo/electron` |

## Tasks

```sh
pnpm exec turbo run build --filter=@repo/electron
pnpm exec turbo run lint --filter=@repo/electron
pnpm exec turbo run check-types --filter=@repo/electron
```

`apps/desktop` baut dieses Paket vor `dev`/`start`, damit `dist/` für Runtime-Imports vorhanden ist.

## Monorepo

Root: **[`../../AGENTS.md`](../../AGENTS.md)**.
