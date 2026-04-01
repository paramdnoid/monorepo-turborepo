import { isAccessTokenCookieMissingOrExpired } from "@/lib/auth/server-token";

export type WebSessionValidation =
  | { ok: true; token: string }
  | { ok: false; reason: "missing_or_expired" | "superseded_by_app" };

/**
 * Reine Verzweigungslogik für Tests (ohne DB / Cookies).
 */
export function webSessionOutcomeFromChecks(
  token: string | undefined,
  superseded: boolean,
): WebSessionValidation {
  if (isAccessTokenCookieMissingOrExpired(token) || !token?.trim()) {
    return { ok: false, reason: "missing_or_expired" };
  }
  if (superseded) {
    return { ok: false, reason: "superseded_by_app" };
  }
  return { ok: true, token };
}
