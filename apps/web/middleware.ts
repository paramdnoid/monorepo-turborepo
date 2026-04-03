import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/** Ermöglicht im Server-Layout `login?next=` mit dem tatsächlichen Ziel (z. B. `/web/settings`). */
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/web", "/web/:path*"],
};
