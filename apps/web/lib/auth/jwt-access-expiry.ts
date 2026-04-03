/**
 * JWT Access-Token `exp` prüfen — ohne Node-`Buffer` (Edge Middleware–kompatibel).
 */
export function isJwtAccessExpired(token: string | undefined): boolean {
  const trimmed = token?.trim();
  if (!trimmed) {
    return true;
  }

  const segments = trimmed.split(".");
  if (segments.length < 2) {
    return true;
  }

  try {
    const payload = segments[1];
    if (payload === undefined) {
      return true;
    }
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      Math.ceil(normalized.length / 4) * 4,
      "=",
    );
    const json = atob(padded);
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
