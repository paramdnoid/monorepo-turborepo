export const SUPPORTED_LOCALES = ["de", "en"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "de";
export const LOCALE_COOKIE_NAME = "locale-preference";

export function isLocale(value: string): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale);
}

export function normalizeLocale(input?: string | null): Locale | null {
  if (!input) return null;

  const normalized = input.trim().toLowerCase();
  if (isLocale(normalized)) return normalized;

  const base = normalized.split("-")[0];
  return base && isLocale(base) ? base : null;
}

export function resolveLocaleFromAcceptLanguage(
  acceptLanguageHeader?: string | null,
): Locale | null {
  if (!acceptLanguageHeader) return null;

  const candidates = acceptLanguageHeader
    .split(",")
    .map((part) => part.split(";")[0]?.trim())
    .filter(Boolean);

  for (const candidate of candidates) {
    const locale = normalizeLocale(candidate);
    if (locale) return locale;
  }

  return null;
}

export function resolveLocale(input?: {
  cookieValue?: string | null;
  acceptLanguageHeader?: string | null;
}): Locale {
  const fromCookie = normalizeLocale(input?.cookieValue);
  if (fromCookie) return fromCookie;

  const fromHeader = resolveLocaleFromAcceptLanguage(input?.acceptLanguageHeader);
  if (fromHeader) return fromHeader;

  return DEFAULT_LOCALE;
}
