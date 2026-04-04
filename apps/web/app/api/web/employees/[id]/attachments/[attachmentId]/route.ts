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

type RouteContext = { params: Promise<{ id: string; attachmentId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { id, attachmentId } = await context.params;
  const locale = getRequestLocale(request);
  const text = getUiText(locale);
  const session = await validateWebAccessTokenSession();
  if (!session.ok) {
    return NextResponse.json(
      { error: text.api.auth.bffSessionInvalid },
      noStoreInit({ status: 401 }),
    );
  }

  try {
    const res = await fetch(
      `${API_BASE}/v1/employees/${encodeURIComponent(id)}/attachments/${encodeURIComponent(attachmentId)}`,
      {
        headers: { Authorization: `Bearer ${session.token}` },
        cache: "no-store",
      },
    );
    const bytes = await res.arrayBuffer();
    return new NextResponse(bytes, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "application/octet-stream",
        "Content-Disposition":
          res.headers.get("content-disposition") ?? "attachment",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: text.api.auth.loginAuthServiceUnavailable },
      noStoreInit({ status: 503 }),
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id, attachmentId } = await context.params;
  const locale = getRequestLocale(request);
  const text = getUiText(locale);
  const session = await validateWebAccessTokenSession();
  if (!session.ok) {
    return NextResponse.json(
      { error: text.api.auth.bffSessionInvalid },
      noStoreInit({ status: 401 }),
    );
  }

  try {
    const res = await fetch(
      `${API_BASE}/v1/employees/${encodeURIComponent(id)}/attachments/${encodeURIComponent(attachmentId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.token}` },
      },
    );
    const bodyText = await res.text();
    return new NextResponse(bodyText, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "application/json",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: text.api.auth.loginAuthServiceUnavailable },
      noStoreInit({ status: 503 }),
    );
  }
}
