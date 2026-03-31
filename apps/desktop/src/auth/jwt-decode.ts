export type JwtPayload = {
  sub?: string;
  exp?: number;
  name?: string;
  email?: string;
  preferred_username?: string;
};

export function decodeJwtPayload(token: string): JwtPayload | null {
  const segments = token.split(".");
  if (segments.length < 2) return null;
  const payload = segments[1];
  if (payload === undefined) return null;
  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      Math.ceil(normalized.length / 4) * 4,
      "=",
    );
    const json = Buffer.from(padded, "base64").toString("utf-8");
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}
