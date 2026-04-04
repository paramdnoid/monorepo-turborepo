import type { Locale } from "@/lib/i18n/locale";

/**
 * Mengenfaktor aus Freitext (Komma/Punkt je Locale), z. B. fuer „Menge × Einzelpreis“.
 * Leerstring → null (nicht 0), ungueltig → null.
 */
export function parseQuantityAsMultiplier(
  input: string,
  locale: Locale,
): number | null {
  const t = input.trim().replace(/\s/g, "");
  if (t === "") {
    return null;
  }
  const normalized =
    locale === "en"
      ? t.replace(/,/g, "")
      : t.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  if (!Number.isFinite(n)) {
    return null;
  }
  return n;
}

/** Waehrungsbetrag aus Formularfeld (Komma/Punkt je Locale) in Cent. */
export function parseMajorToMinorUnits(
  input: string,
  locale: Locale,
): number | null {
  const t = input.trim().replace(/\s/g, "");
  if (t === "") {
    return 0;
  }
  const normalized =
    locale === "en"
      ? t.replace(/,/g, "")
      : t.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  if (!Number.isFinite(n)) {
    return null;
  }
  return Math.round(n * 100);
}

/** `YYYY-MM-DD` fuer date-Input, leer wenn ungueltig/fehlend. */
export function isoToDateInputValue(iso: string | null | undefined): string {
  if (!iso) {
    return "";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  return d.toISOString().slice(0, 10);
}

/** Kalendertag zu ISO-Zeitstempel (Mittag UTC) fuer die API. */
export function dateInputToIsoNoon(value: string): string | null {
  const v = value.trim();
  if (!v) {
    return null;
  }
  return new Date(`${v}T12:00:00.000Z`).toISOString();
}

export function formatMinorCurrency(
  cents: number,
  currency: string,
  locale: Locale,
): string {
  const tag = locale === "en" ? "en-US" : "de-DE";
  return new Intl.NumberFormat(tag, {
    style: "currency",
    currency: currency || "EUR",
  }).format(cents / 100);
}
