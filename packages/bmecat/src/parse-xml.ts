import { XMLParser } from "fast-xml-parser";

import type {
  BmecatArticleLine,
  BmecatParseIssue,
  BmecatParseResult,
} from "./types.js";

function asArray<T>(x: T | T[] | undefined): T[] {
  if (x == null) return [];
  return Array.isArray(x) ? x : [x];
}

function textOf(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number") return String(v);
  if (typeof v === "object" && "#text" in (v as object)) {
    const t = (v as { "#text"?: unknown })["#text"];
    return textOf(t);
  }
  return null;
}

function extractProducts(root: unknown): unknown[] {
  if (root == null || typeof root !== "object") return [];
  const o = root as Record<string, unknown>;

  const direct = asArray(
    o.PRODUCT ?? o.PRODUCTS ?? o.ARTICLE ?? o.CATALOG_ITEM,
  );
  if (direct.length) return direct;

  const tnc = o.T_NEW_CATALOG;
  if (tnc && typeof tnc === "object") {
    const t = tnc as Record<string, unknown>;
    return asArray(t.PRODUCT ?? t.ARTICLE ?? t.CATALOG_ITEM);
  }
  const tub = o.T_UPDATE_PRODUCTS;
  if (tub && typeof tub === "object") {
    const t = tub as Record<string, unknown>;
    return asArray(t.PRODUCT ?? t.ARTICLE);
  }
  return [];
}

/**
 * MVP BMEcat 2005-ähnliches XML (IDS-/Grosshaendler-Katalog als Datei).
 * Liest PRODUCT/ARTICLE mit SUPPLIER_PID/SUPPLIER_AID, Kurzbeschreibung und PRICE_AMOUNT.
 */
export function parseBmecatXml(xml: string): BmecatParseResult {
  const errors: BmecatParseIssue[] = [];
  const warnings: BmecatParseIssue[] = [];

  const parser = new XMLParser({
    ignoreAttributes: false,
    trimValues: true,
    parseTagValue: false,
  });

  let parsed: unknown;
  try {
    parsed = parser.parse(xml);
  } catch (e) {
    errors.push({
      code: "XML_PARSE",
      message: e instanceof Error ? e.message : "XML Parserfehler",
    });
    return { articles: [], errors, warnings };
  }

  const root =
    parsed != null && typeof parsed === "object"
      ? ((parsed as Record<string, unknown>).BMECAT ??
          (parsed as Record<string, unknown>).BMEcat ??
          (parsed as Record<string, unknown>).bmecat ??
          parsed)
      : parsed;

  const products = extractProducts(root);
  if (products.length === 0) {
    errors.push({
      code: "NO_PRODUCTS",
      message:
        "Keine PRODUCT-/ARTICLE-Knoten gefunden (erwartet unter BMECAT/T_NEW_CATALOG oder flach).",
    });
    return { articles: [], errors, warnings };
  }

  const articles: BmecatArticleLine[] = [];

  for (const raw of products) {
    if (raw == null || typeof raw !== "object") continue;
    const p = raw as Record<string, unknown>;
    const supplierSku =
      textOf(p.SUPPLIER_PID) ??
      textOf(p.SUPPLIER_AID) ??
      textOf(p.supplier_pid) ??
      textOf(p.SUPPLIER_ALT_PID);
    if (!supplierSku) {
      warnings.push({
        code: "SKIP_NO_SKU",
        message: "PRODUCT ohne SUPPLIER_PID/SUPPLIER_AID — uebersprungen",
      });
      continue;
    }

    const name =
      textOf(p.DESCRIPTION_SHORT) ??
      textOf(p.DESCRIPTION_LONG) ??
      textOf(p.short_description);

    let priceVal: string | null = null;
    let currency = "EUR";
    let unit: string | null = null;

    const priceBlock = p.PRICE_DETAILS ?? p.price_details;
    if (priceBlock && typeof priceBlock === "object") {
      const pb = priceBlock as Record<string, unknown>;
      const qty = asArray(pb.ARTICLE_PRICE ?? pb.article_price);
      const first = qty[0];
      if (first && typeof first === "object") {
        const pr = first as Record<string, unknown>;
        priceVal =
          textOf(pr.PRICE_AMOUNT) ??
          textOf(pr.price_amount) ??
          textOf(pr.PRICE);
        const cur = textOf(pr.PRICE_CURRENCY);
        if (cur) currency = cur;
        const qf = textOf(pr.QUANTITY_MIN);
        if (qf) unit = qf;
      }
    }

    if (priceVal == null) {
      warnings.push({
        code: "MISSING_PRICE",
        message: `Artikel ${supplierSku}: kein PRICE_AMOUNT in PRICE_DETAILS`,
      });
      continue;
    }

    const ean =
      textOf(p.EAN) ?? textOf(p.INTERNATIONAL_PID) ?? textOf(p.GTIN);

    articles.push({
      supplierSku,
      name: name ?? null,
      unit,
      price: priceVal.replace(",", "."),
      currency,
      ean: ean ?? null,
      groupKey: null,
    });
  }

  if (articles.length === 0 && errors.length === 0) {
    errors.push({
      code: "NO_ARTICLES",
      message: "Keine gueltigen Artikel mit Preis extrahiert.",
    });
  }

  articles.sort((a, b) => a.supplierSku.localeCompare(b.supplierSku));

  return { articles, errors, warnings };
}
