import { cookies } from "next/headers";

import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { isJwtAccessExpired } from "@/lib/auth/jwt-access-expiry";

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
  return isJwtAccessExpired(token);
}
