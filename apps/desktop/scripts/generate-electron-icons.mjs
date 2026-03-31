/**
 * Erzeugt professionelle Electron-Icons aus `packages/brand/assets/logo.png`:
 * - macOS: `resources/icon.icns` (16–1024 inkl. @2x)
 * - Windows: `resources/icon.ico` (EXE-tauglich, png2icons „forWinExe“)
 * - Linux: `resources/icon.png` (1024²)
 *
 * Aufruf: pnpm --filter desktop run generate:electron-icons
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
const desktopRoot = join(scriptDir, "..");
const brandLogo = join(desktopRoot, "..", "..", "packages", "brand", "assets", "logo.png");
const outDir = join(desktopRoot, "resources");

await mkdir(outDir, { recursive: true });

const raw = await readFile(brandLogo);
const normalized = await sharp(raw)
  .resize(1024, 1024, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toBuffer();

await writeFile(join(outDir, "icon.png"), normalized);

const icns = png2icons.createICNS(normalized, png2icons.BICUBIC, 0);
if (!icns) {
  throw new Error("png2icons.createICNS returned null");
}
await writeFile(join(outDir, "icon.icns"), icns);

const ico = png2icons.createICO(normalized, png2icons.BICUBIC, 0, true, true);
if (!ico) {
  throw new Error("png2icons.createICO returned null");
}
await writeFile(join(outDir, "icon.ico"), ico);

console.log("Electron icons: resources/icon.icns, icon.ico, icon.png (from @repo/brand logo.png)");
