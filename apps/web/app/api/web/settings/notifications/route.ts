import { NextResponse } from "next/server";

import { validateWebAccessTokenSession } from "@/lib/auth/validate-web-session";
import { getRequestLocale } from "@/lib/i18n/request-locale";
import { mapSettingsErrorEnvelope } from "../_lib/error-envelope";

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

  const session = await validateWebAccessTokenSession();
  if (!session.ok) {
    const envelope = mapSettingsErrorEnvelope({
      locale,
      operation: "load",
      status: 401,
    });
    return NextResponse.json(
      envelope,
      noStoreInit({ status: 401 }),
    );
  }

  try {
    const res = await fetch(`${API_BASE}/v1/settings/notifications`, {
      headers: { Authorization: `Bearer ${session.token}` },
      cache: "no-store",
    });
    const bodyText = await res.text();
    if (!res.ok) {
      const envelope = mapSettingsErrorEnvelope({
        locale,
        operation: "load",
        status: res.status,
        apiBodyText: bodyText,
      });
      return NextResponse.json(envelope, noStoreInit({ status: res.status }));
    }
    return new NextResponse(bodyText, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "application/json",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    const envelope = mapSettingsErrorEnvelope({
      locale,
      operation: "load",
      status: 503,
    });
    return NextResponse.json(
      envelope,
      noStoreInit({ status: 503 }),
    );
  }
}

export async function PUT(request: Request) {
  const locale = getRequestLocale(request);

  const session = await validateWebAccessTokenSession();
  if (!session.ok) {
    const envelope = mapSettingsErrorEnvelope({
      locale,
      operation: "save",
      status: 401,
    });
    return NextResponse.json(
      envelope,
      noStoreInit({ status: 401 }),
    );
  }

  let body: string;
  try {
    body = await request.text();
  } catch {
    const envelope = mapSettingsErrorEnvelope({
      locale,
      operation: "save",
      status: 400,
      apiBodyText: JSON.stringify({ error: "invalid_body" }),
    });
    return NextResponse.json(
      envelope,
      noStoreInit({ status: 400 }),
    );
  }

  try {
    const res = await fetch(`${API_BASE}/v1/settings/notifications`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${session.token}`,
        "Content-Type": "application/json",
      },
      body,
      cache: "no-store",
    });
    const bodyText = await res.text();
    if (!res.ok) {
      const envelope = mapSettingsErrorEnvelope({
        locale,
        operation: "save",
        status: res.status,
        apiBodyText: bodyText,
      });
      return NextResponse.json(envelope, noStoreInit({ status: res.status }));
    }
    return new NextResponse(bodyText, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "application/json",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    const envelope = mapSettingsErrorEnvelope({
      locale,
      operation: "save",
      status: 503,
    });
    return NextResponse.json(
      envelope,
      noStoreInit({ status: 503 }),
    );
  }
}

