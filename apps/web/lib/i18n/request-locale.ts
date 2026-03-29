import {
  LOCALE_COOKIE_NAME,
  type Locale,
  resolveLocale,
} from "@/lib/i18n/locale";

function getCookieValue(cookieHeader: string | null, key: string): string | null {
  if (!cookieHeader) return null;

  const entries = cookieHeader.split(";");
  for (const entry of entries) {
    const [rawName, ...rawValueParts] = entry.split("=");
    if (!rawName) continue;
    if (rawName.trim() !== key) continue;

    const rawValue = rawValueParts.join("=").trim();
    if (!rawValue) return null;

    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }

  return null;
}

export function getRequestLocale(request: Request): Locale {
  return resolveLocale({
    cookieValue: getCookieValue(request.headers.get("cookie"), LOCALE_COOKIE_NAME),
    acceptLanguageHeader: request.headers.get("accept-language"),
  });
}
