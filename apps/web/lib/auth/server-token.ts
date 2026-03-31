import { cookies } from "next/headers";

import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";

export async function getServerAccessToken() {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COOKIE_NAME)?.value;
}

/**
 * Liefert true, wenn kein nutzbarer Access-Token-Wert vorliegt (fehlt, kein JWT, Parse-Fehler,
 * oder `exp` in der Vergangenheit). Ohne `exp`-Claim wird nicht als abgelaufen behandelt.
 */
export function isAccessTokenCookieMissingOrExpired(
  token: string | undefined,
): boolean {
  const trimmed = token?.trim();
  if (!trimmed) return true;

  const segments = trimmed.split(".");
  if (segments.length < 2) return true;

  try {
    const payload = segments[1];
    if (payload === undefined) return true;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      Math.ceil(normalized.length / 4) * 4,
      "=",
    );
    const json = Buffer.from(padded, "base64").toString("utf-8");
    const parsed = JSON.parse(json) as { exp?: number };
    if (typeof parsed.exp !== "number") {
      return false;
    }
    const nowSec = Math.floor(Date.now() / 1000);
    return nowSec >= parsed.exp;
  } catch {
    return true;
  }
}
