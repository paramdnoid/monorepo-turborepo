import { XMLParser } from "fast-xml-parser";

import type {
  GaebNormalizedNode,
  GaebParseIssue,
  GaebParseResult,
} from "./types.js";
import { detectGaebFormat } from "./detect-format.js";

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function textOf(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) {
    if (v.length === 0) return null;
    if (v.length === 1) return textOf(v[0]);
    const parts = v.map((x) => textOf(x)).filter(Boolean);
    return parts.length ? parts.join(" ") : null;
  }
  const o = asRecord(v);
  if (o && "#text" in o) return textOf(o["#text"]);
  return null;
}

function localName(key: string): string {
  const i = key.indexOf(":");
  return i === -1 ? key : key.slice(i + 1);
}

function collectItems(node: unknown, into: Record<string, unknown>[]): void {
  if (node === undefined || node === null) return;
  if (Array.isArray(node)) {
    for (const el of node) collectItems(el, into);
    return;
  }
  const rec = asRecord(node);
  if (!rec) return;
  for (const [key, val] of Object.entries(rec)) {
    if (localName(key) === "Item") {
      if (Array.isArray(val)) {
        for (const el of val) {
          const r = asRecord(el);
          if (r) into.push(r);
        }
      } else if (val !== null && typeof val === "object") {
        into.push(val as Record<string, unknown>);
      }
    } else {
      collectItems(val, into);
    }
  }
}

function mapItemRow(
  raw: Record<string, unknown>,
  sortIndex: number,
): GaebNormalizedNode {
  const get = (k: string): unknown => {
    if (k in raw) return raw[k];
    const hit = Object.keys(raw).find((x) => localName(x) === k);
    return hit ? raw[hit] : undefined;
  };
  const outline = textOf(get("RNoPart") ?? get("LineNo") ?? get("Position"));
  const shortText = textOf(
    get("OutlineText") ?? get("Descript") ?? get("ShortText"),
  );
  const longText = textOf(get("DetailTxt") ?? get("LongText"));
  const qty = textOf(get("Qty") ?? get("Quantity"));
  const unit = textOf(get("QU") ?? get("Unit"));
  return {
    sortIndex,
    nodeType: "item",
    outlineNumber: outline,
    shortText,
    longText,
    quantity: qty,
    unit,
  };
}

export function parseGaebString(content: string): GaebParseResult {
  const warnings: GaebParseIssue[] = [];
  const errors: GaebParseIssue[] = [];
  const fmt = detectGaebFormat(content);

  if (fmt === "unknown") {
    errors.push({
      code: "FORMAT_UNKNOWN",
      message: "File is not recognized as GAEB DA XML or supported text hint.",
    });
    return { format: fmt, nodes: [], errors, warnings };
  }

  if (fmt === "x83_hint") {
    errors.push({
      code: "X83_NOT_SUPPORTED",
      message:
        "X83-style content was detected but is not supported in this MVP; please use GAEB DA XML.",
    });
    return { format: fmt, nodes: [], errors, warnings };
  }

  let parsed: unknown;
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      trimValues: true,
    });
    parsed = parser.parse(content);
  } catch (e) {
    errors.push({
      code: "XML_PARSE",
      message: e instanceof Error ? e.message : "XML parse failed",
    });
    return { format: "da_xml", nodes: [], errors, warnings };
  }

  const items: Record<string, unknown>[] = [];
  collectItems(parsed, items);

  if (items.length === 0) {
    warnings.push({
      code: "NO_ITEMS",
      message:
        "No <Item> elements found — empty LV or structure outside supported subset.",
    });
  }

  const nodes: GaebNormalizedNode[] = items.map((row, i) => mapItemRow(row, i));

  return { format: "da_xml", nodes, errors, warnings };
}
