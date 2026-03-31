import "server-only";

/**
 * Erlaubte `redirect_uri` für nativen Login (Desktop-Callback, Expo o. ä.).
 * Standard: http://127.0.0.1:<port>/… und http://localhost:<port>/…
 * Zusätzlich: https://auth.expo.io/…
 * Optional: AUTH_NATIVE_REDIRECT_URI_REGEX (eine Zeile, ECMAScript-Regex)
 */
export function isAllowedNativeRedirectUri(redirectUri: string): boolean {
  let url: URL;
  try {
    url = new URL(redirectUri);
  } catch {
    return false;
  }

  if (url.hash.length > 0) {
    return false;
  }

  const extra = process.env.AUTH_NATIVE_REDIRECT_URI_REGEX?.trim();
  if (extra) {
    try {
      const re = new RegExp(extra);
      if (re.test(redirectUri)) {
        return true;
      }
    } catch {
      /* ignore invalid env */
    }
  }

  if (url.protocol === "http:") {
    if (url.hostname === "127.0.0.1" || url.hostname === "localhost") {
      return url.port.length > 0;
    }
  }

  if (url.protocol === "https:" && url.hostname === "auth.expo.io") {
    return true;
  }

  return false;
}
