import type { GaebDetectedFormat } from "./types.js";

const XML_HEAD = /^\s*</;

export function detectGaebFormat(content: string): GaebDetectedFormat {
  const trimmed = content.trimStart();
  if (!trimmed) return "unknown";
  if (XML_HEAD.test(trimmed)) {
    if (
      /xmlns\s*=\s*["'][^"']*gaeb[^"']*["']/i.test(trimmed) ||
      /<GAEB[\s>]/i.test(trimmed)
    ) {
      return "da_xml";
    }
    if (/<Award|<BoQ|<Itemlist|<Item[\s>]/i.test(trimmed)) {
      return "da_xml";
    }
    return "unknown";
  }
  if (/^\s*\u00D6\s/m.test(content) || /^\d{6}\s/m.test(content)) {
    return "x83_hint";
  }
  return "unknown";
}
