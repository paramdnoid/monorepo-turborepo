import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/** Absoluter Pfad zu `assets/logo.png` (z. B. nodemailer-Anhang, kein Next-Image-Import). */
export function getBrandLogoPngPath(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "assets", "logo.png");
}
