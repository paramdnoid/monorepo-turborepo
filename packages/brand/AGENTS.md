# AGENTS.md — packages/brand

**Read this when:** you change the shared app logo or favicon source.

## Purpose

[`@repo/brand`](./package.json) — **Kanal für das Logo:** die Datei **[`assets/logo.png`](./assets/logo.png)** ist die **einzige Quelle** (exakt dieses Raster für Web, Desktop und abgeleitete Mobile-Assets).

**Next.js-Favicons** (App-Router-Dateikonventionen, nicht nur `metadata.icons`): nach `pnpm generate:icons` liegen u. a. [`apps/web/app/favicon.ico`](../../apps/web/app/favicon.ico), [`icon.png`](../../apps/web/app/icon.png), [`apple-icon.png`](../../apps/web/app/apple-icon.png) vor.

Nach dem **Ersetzen** von `assets/logo.png` die Kopien für Web/Expo neu erzeugen:

```sh
pnpm generate:icons
```

(=`turbo run generate:icons --filter=@repo/brand`, siehe [`scripts/generate-icons.mjs`](./scripts/generate-icons.mjs) — **überschreibt nicht** `assets/logo.png`, nur `apps/web/public/logo.png` und `apps/mobile/assets/*`.)

**Desktop (Electron):** nach Logo-Tausch zusätzlich **`pnpm generate:electron-icons`** ausführen (baut `apps/desktop/resources/icon.{icns,ico,png}` aus derselben `logo.png`).

## Consumers

| App / area | Usage                                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| `web`      | `import brandLogo from "@repo/brand/logo"` — `layout.tsx` `metadata.icons`, homepage `Image`                             |
| `desktop`  | `require.resolve("@repo/brand/logo")` — window icon; `package.json` → electron-builder `icon` paths to `assets/logo.png` |

## Tasks

No `lint` / `check-types` / `build` — validation runs through dependent apps.

## Monorepo

Repo-weit & Skills: **[`../../AGENTS.md`](../../AGENTS.md)** · **[`../../.agents/README.md`](../../.agents/README.md)**.
