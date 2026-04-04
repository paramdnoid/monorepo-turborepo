# AGENTS.md — packages/electron

**Read this when:** du gemeinsame Electron-IPC-Kanäle, Renderer-Typen (`DesktopApi`) oder Konventionen für Main/Preload änderst.

## Zweck

[`@repo/electron`](./package.json) enthält **IPC-Kanalnamen** (`IPC_CHANNELS`) und **TypeScript-Typen** (`DesktopApi`, `IpcInvokeChannel`) für die Desktop-App. Single Source of Truth für Main (`ipcMain`), Preload (`ipcRenderer.invoke`) und optionale Renderer-Typisierung.

## Consumers

| App       | Usage                                                            |
| --------- | ---------------------------------------------------------------- |
| `desktop` | [`apps/desktop`](../../apps/desktop) importiert `@repo/electron` |

## Tasks

```sh
pnpm exec turbo run build --filter=@repo/electron
pnpm exec turbo run lint --filter=@repo/electron
pnpm exec turbo run check-types --filter=@repo/electron
```

`apps/desktop` bezieht dieses Paket als Workspace-Abhängigkeit. **`turbo run dev`** / **`turbo run build --filter=desktop`** führen zuerst **`^build`** aus (u. a. dieses Paket). **`pnpm start`** / **`pnpm dist`** im Desktop-App-Ordner ohne Turbo rufen **`@repo/electron`** weiterhin explizit; siehe [`apps/desktop/AGENTS.md`](../../apps/desktop/AGENTS.md).

## Monorepo

Repo-weit & Skills: **[`../../AGENTS.md`](../../AGENTS.md)** · **[`../../.agents/README.md`](../../.agents/README.md)**.
