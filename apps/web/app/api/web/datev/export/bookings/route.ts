import { NextResponse } from "next/server";

import { getUiText } from "@/content/ui-text";
import { validateWebAccessTokenSession } from "@/lib/auth/validate-web-session";
import { getRequestLocale } from "@/lib/i18n/request-locale";

const API_BASE =
  process.env.NEXT_PUBLIC_WEB_API_BASE_URL ?? "http://127.0.0.1:4000";

function noStoreInit(init?: ResponseInit): ResponseInit {
  return {
    ...init,
    headers: {
      ...init?.headers,
      "Cache-Control": "private, no-store",
    },
  };
}

export async function GET(request: Request) {
  const locale = getRequestLocale(request);
  const text = getUiText(locale);

  const session = await validateWebAccessTokenSession();
  if (!session.ok) {
    return NextResponse.json(
      { error: text.api.auth.bffSessionInvalid },
      noStoreInit({ status: 401 }),
    );
  }

  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  const qs = new URLSearchParams({ from, to });

  try {
    const res = await fetch(
      `${API_BASE}/v1/datev/export/bookings.csv?${qs.toString()}`,
      {
        headers: { Authorization: `Bearer ${session.token}` },
        cache: "no-store",
      },
    );

    const buf = await res.arrayBuffer();
    const headers = new Headers();
    headers.set("Cache-Control", "private, no-store");
    const ct = res.headers.get("content-type");
    if (ct) headers.set("Content-Type", ct);
    const cd = res.headers.get("content-disposition");
    if (cd) headers.set("Content-Disposition", cd);
    return new NextResponse(buf, { status: res.status, headers });
  } catch {
    return NextResponse.json(
      { error: text.api.auth.loginAuthServiceUnavailable },
      noStoreInit({ status: 503 }),
    );
  }
}
