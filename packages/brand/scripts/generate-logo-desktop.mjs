/**
 * Erzeugt ein quadratisches PNG (1024×1024) mit dem Logo zentriert und
 * korrektem Seitenverhältnis — für Electron-Dock, Fenster-Icon und .icns-Build.
 */
import { Jimp } from "jimp";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const src = join(root, "assets/logo.png");
const out = join(root, "assets/logo-desktop.png");

const TARGET = 1024;

const image = await Jimp.read(src);
image.background = 0x00000000;
image.contain({ w: TARGET, h: TARGET });
await image.write(out);

console.log(`Wrote ${out} (${TARGET}×${TARGET}, contain)`);
