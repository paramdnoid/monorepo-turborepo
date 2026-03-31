/**
 * Verteilt `assets/logo.png` (Kanon) nach Web, Expo und Favicon-Größen.
 * Überschreibt NICHT `assets/logo.png` — dieses File ist die Quelle.
 *
 * Web (Next.js App Router): `apps/web/app/favicon.ico`, `icon.png`, `apple-icon.png`
 * (Dateikonventionen, siehe https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons )
 *
 * Electron (Vite-Renderer): `apps/desktop/src/renderer/public/favicon.ico`
 *
 * Aufruf: pnpm --filter @repo/brand run generate:icons
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const require = createRequire(import.meta.url);
/** @type {typeof import("png2icons")} */
const png2icons = require("png2icons");

const scriptDir = dirname(fileURLToPath(import.meta.url));
const brandRoot = join(scriptDir, "..");
const repoRoot = join(brandRoot, "..", "..");
const logoPath = join(brandRoot, "assets", "logo.png");

const logoBuf = await readFile(logoPath);

/** Einheitliche App-Icon-Größe (Expo / Metadata). */
async function writePng1024(dest) {
  await sharp(logoBuf)
    .resize(1024, 1024, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(dest);
}

const webPublic = join(repoRoot, "apps", "web", "public");
await mkdir(webPublic, { recursive: true });
await writePng1024(join(webPublic, "logo.png"));

const webApp = join(repoRoot, "apps", "web", "app");
await mkdir(webApp, { recursive: true });

const normalized1024 = await sharp(logoBuf)
  .resize(1024, 1024, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toBuffer();

const faviconIco = png2icons.createICO(normalized1024, png2icons.BICUBIC, 0, true, true);
if (!faviconIco) {
  throw new Error("png2icons.createICO failed for favicon");
}
await writeFile(join(webApp, "favicon.ico"), faviconIco);

const desktopRendererPublic = join(
  repoRoot,
  "apps",
  "desktop",
  "src",
  "renderer",
  "public",
);
await mkdir(desktopRendererPublic, { recursive: true });
await writeFile(join(desktopRendererPublic, "favicon.ico"), faviconIco);

await sharp(logoBuf)
  .resize(512, 512, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toFile(join(webApp, "icon.png"));

await sharp(logoBuf)
  .resize(180, 180, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toFile(join(webApp, "apple-icon.png"));

const mobileAssets = join(repoRoot, "apps", "mobile", "assets");
await mkdir(mobileAssets, { recursive: true });
await writePng1024(join(mobileAssets, "icon.png"));
await writePng1024(join(mobileAssets, "adaptive-icon.png"));

const logo900 = await sharp(logoBuf)
  .resize(900, 900, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toBuffer();

await sharp({
  create: {
    width: 2048,
    height: 2048,
    channels: 4,
    background: { r: 255, g: 255, b: 255, alpha: 1 },
  },
})
  .composite([{ input: logo900, gravity: "center" }])
  .png()
  .toFile(join(mobileAssets, "splash-icon.png"));

await sharp(logoBuf)
  .resize(48, 48, {
    fit: "contain",
    background: { r: 255, g: 255, b: 255, alpha: 0 },
  })
  .png()
  .toFile(join(mobileAssets, "favicon.png"));

console.log(
  "OK: web app/favicon.ico, icon.png, apple-icon.png; public/logo.png; desktop src/renderer/public/favicon.ico; mobile assets (from assets/logo.png)",
);
