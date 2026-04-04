import type {
  DatanormArticleLine,
  DatanormParseIssue,
  DatanormParseResult,
} from "./types.js";

/**
 * Parst DATANORM-ähnliche Texte mit W- (Ware) und P- (Preis) Sätzen, Feldtrenner `;`.
 *
 * MVP-Annahme: typischer deutscher Großhandels-Export (DN4/DN5-ähnlich), keine vollständige Normprüfung.
 * Felder: W → [1] Artikelnummer, [4] Kurztext; P → [1] Artikelnummer, [2] Preis, [3] ME optional.
 */
export function parseDatanormText(input: string): DatanormParseResult {
  const errors: DatanormParseIssue[] = [];
  const warnings: DatanormParseIssue[] = [];
  const bySku = new Map<
    string,
    {
      name: string | null;
      unit: string | null;
      price: string | null;
      ean: string | null;
      groupKey: string | null;
    }
  >();

  const lines = input.split(/\r?\n/);
  let wareRows = 0;
  let preisRows = 0;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    const upper = line.toUpperCase();
    if (upper.startsWith("V") && line.includes(";")) {
      continue;
    }

    const parts = line.split(";");
    const tag = parts[0]?.trim().toUpperCase();

    if (tag === "W") {
      wareRows += 1;
      const sku = parts[1]?.trim() ?? "";
      if (!sku) {
        warnings.push({ code: "W_SKIP", message: "W-Satz ohne Artikelnummer" });
        continue;
      }
      const ean = parts[2]?.trim() || null;
      const name = parts[4]?.trim() || null;
      const groupKey = parts[3]?.trim() || null;
      const existing = bySku.get(sku) ?? {
        name: null,
        unit: null,
        price: null,
        ean: null,
        groupKey: null,
      };
      existing.name = name ?? existing.name;
      existing.ean = ean ?? existing.ean;
      existing.groupKey = groupKey ?? existing.groupKey;
      bySku.set(sku, existing);
      continue;
    }

    if (tag === "P") {
      preisRows += 1;
      const sku = parts[1]?.trim() ?? "";
      const priceRaw = parts[2]?.trim().replace(",", ".") ?? "";
      const unit = parts[3]?.trim() || null;
      if (!sku) {
        warnings.push({ code: "P_SKIP", message: "P-Satz ohne Artikelnummer" });
        continue;
      }
      if (!priceRaw) {
        warnings.push({
          code: "P_SKIP",
          message: `P-Satz ohne Preis fuer ${sku}`,
        });
        continue;
      }
      const existing = bySku.get(sku) ?? {
        name: null,
        unit: null,
        price: null,
        ean: null,
        groupKey: null,
      };
      existing.price = priceRaw;
      existing.unit = unit ?? existing.unit;
      bySku.set(sku, existing);
    }
  }

  if (wareRows === 0 && preisRows === 0) {
    errors.push({
      code: "NO_RECORDS",
      message:
        "Keine W- oder P-Saetze gefunden — pruefen Sie Version, Kodierung oder ZIP-Inhalt.",
    });
    return { articles: [], errors, warnings };
  }

  const articles: DatanormArticleLine[] = [];
  for (const [supplierSku, v] of bySku) {
    if (!v.price) {
      warnings.push({
        code: "MISSING_PRICE",
        message: `Artikel ${supplierSku}: Ware ohne Preis (P-Satz)`,
      });
      continue;
    }
    articles.push({
      supplierSku,
      name: v.name,
      unit: v.unit,
      price: v.price,
      currency: "EUR",
      ean: v.ean,
      groupKey: v.groupKey,
    });
  }

  if (articles.length === 0) {
    errors.push({
      code: "NO_ARTICLES",
      message: "Es wurden keine vollstaendigen Artikel (Ware + Preis) ermittelt.",
    });
  }

  articles.sort((a, b) => a.supplierSku.localeCompare(b.supplierSku));

  return { articles, errors, warnings };
}
