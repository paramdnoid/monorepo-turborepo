import { unzipSync } from "fflate";

import { parseDatanormText } from "./parse-text.js";
import type { DatanormParseResult } from "./types.js";

function decodeDatanormBytes(u8: Uint8Array): string {
  try {
    return new TextDecoder("windows-1252", { fatal: false }).decode(u8);
  } catch {
    return new TextDecoder("utf-8", { fatal: false }).decode(u8);
  }
}

/**
 * Entpackt ggf. ZIP (ein oder mehrere Textdateien) und verarbeitet den zusammengefügten Text.
 * Kein ZIP: wird als einzelner DATANORM-Text interpretiert.
 */
export function parseDatanormBuffer(buffer: Uint8Array): DatanormParseResult {
  let combined: string;
  try {
    const entries = unzipSync(buffer);
    const chunks: string[] = [];
    const names = Object.keys(entries).sort();
    for (const name of names) {
      if (name.endsWith("/") || name.includes("__MACOSX")) continue;
      const u8 = entries[name];
      if (!u8?.length) continue;
      chunks.push(decodeDatanormBytes(u8));
    }
    combined =
      chunks.length > 0
        ? chunks.join("\n")
        : decodeDatanormBytes(buffer);
  } catch {
    combined = decodeDatanormBytes(buffer);
  }

  return parseDatanormText(combined);
}
