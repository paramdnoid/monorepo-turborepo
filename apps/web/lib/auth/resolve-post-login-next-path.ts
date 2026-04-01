import "server-only";

import { safeNextPath } from "./safe-next-path";

/**
 * Ziel nach erfolgreichem Password-Login oder bei Besuch von `/login` mit gültiger Session:
 * - Explizites `next` (Query/Body) gewinnt (über `safeNextPath` abgesichert).
 * - Sonst `/web` — Onboarding (`/onboarding`) ist nur der Registrierungsflow, nicht Login-Standard.
 */
export function resolveLoginRedirect(explicitNext: string | undefined): string {
  return safeNextPath(explicitNext) ?? "/web";
}
