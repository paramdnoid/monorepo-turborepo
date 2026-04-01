import "server-only";

import { isWebAccessTokenSupersededByAppLogin } from "@/lib/auth/peer-session-db";
import {
  getServerAccessToken,
  isAccessTokenCookieMissingOrExpired,
} from "@/lib/auth/server-token";
import type { WebSessionValidation } from "@/lib/auth/web-session-outcome";

export type { WebSessionValidation } from "@/lib/auth/web-session-outcome";

/**
 * Gleiche Policy wie `/web`-Page: gültiger JWT im Cookie, nicht abgelaufen,
 * nicht durch neueren App-Login obsolet (Peer-Session).
 */
export async function validateWebAccessTokenSession(): Promise<WebSessionValidation> {
  const token = await getServerAccessToken();
  if (isAccessTokenCookieMissingOrExpired(token) || !token?.trim()) {
    return { ok: false, reason: "missing_or_expired" };
  }
  if (await isWebAccessTokenSupersededByAppLogin(token)) {
    // Cookie-Löschung nur in Route Handler / Server Action (Next.js 16).
    return { ok: false, reason: "superseded_by_app" };
  }
  return { ok: true, token };
}
