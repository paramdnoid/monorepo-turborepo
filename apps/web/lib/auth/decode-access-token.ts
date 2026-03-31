/**
 * Nur Payload-Dekodierung (keine Signaturprüfung) — wie in session-user für Anzeigelogik.
 */
export type DecodedAccessTokenPayload = {
  sub?: string;
  iat?: number;
  exp?: number;
};

export function decodeAccessTokenPayload(
  token: string,
): DecodedAccessTokenPayload | null {
  const segments = token.split(".");
  if (segments.length < 2) return null;
  try {
    const payload = segments[1];
    if (payload === undefined) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      Math.ceil(normalized.length / 4) * 4,
      "=",
    );
    const json = Buffer.from(padded, "base64").toString("utf-8");
    return JSON.parse(json) as DecodedAccessTokenPayload;
  } catch {
    return null;
  }
}
