import { NextResponse } from "next/server";

import { decodeAccessTokenPayload } from "@/lib/auth/decode-access-token";
import {
  isDesktopAccessTokenSupersededByWebLogin,
  recordAppLoginForUserSub,
} from "@/lib/auth/peer-session-db";
import {
  isAccessTokenCookieMissingOrExpired,
} from "@/lib/auth/server-token";

function bearerToken(request: Request): string | null {
  const raw = request.headers.get("authorization");
  if (!raw?.startsWith("Bearer ")) {
    return null;
  }
  const t = raw.slice("Bearer ".length).trim();
  return t.length > 0 ? t : null;
}

/**
 * Desktop/Mobile: mit `Authorization: Bearer` prüfen, ob eine neuere Web-Anmeldung
 * die App-Session verdrängen soll.
 */
export async function GET(request: Request) {
  const token = bearerToken(request);
  if (!token || isAccessTokenCookieMissingOrExpired(token)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const payload = decodeAccessTokenPayload(token);
  if (!payload?.sub) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const desktopShouldLogout =
    await isDesktopAccessTokenSupersededByWebLogin(token);
  return NextResponse.json({ desktopShouldLogout });
}

/**
 * Nach App-Login (Desktop): neuere App-Session → Web-Cookie soll an anderer Stelle ungültig werden.
 */
export async function POST(request: Request) {
  const token = bearerToken(request);
  if (!token || isAccessTokenCookieMissingOrExpired(token)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const payload = decodeAccessTokenPayload(token);
  if (!payload?.sub) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const event =
    typeof body === "object" &&
    body !== null &&
    "event" in body &&
    typeof (body as { event: unknown }).event === "string"
      ? (body as { event: string }).event
      : null;
  if (event !== "app_login") {
    return NextResponse.json({ error: "invalid_event" }, { status: 400 });
  }

  await recordAppLoginForUserSub(payload.sub);
  return NextResponse.json({ ok: true as const });
}
