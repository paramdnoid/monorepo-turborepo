import { NextResponse } from "next/server";

import { clearWebAccessTokenCookie } from "@/lib/auth/clear-web-access-cookie";
import { safeNextPath } from "@/lib/auth/safe-next-path";

/**
 * Nach App-Login ist das Web-Cookie obsolet — nur hier (Route Handler) dürfen Cookies mutiert werden.
 * Server Components dürfen kein `cookies().delete` ausführen (Next.js 16).
 */
export async function GET(request: Request) {
  await clearWebAccessTokenCookie();
  const url = new URL(request.url);
  const next = safeNextPath(url.searchParams.get("next") ?? undefined) ?? "/web";
  const login = new URL("/login", url.origin);
  login.searchParams.set("next", next);
  const res = NextResponse.redirect(login);
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}
