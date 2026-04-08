import { NextResponse } from "next/server";

import { getAuthSessionContext } from "@/lib/auth/session-user";
import { validateWebAccessTokenSession } from "@/lib/auth/validate-web-session";

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

export async function POST(request: Request) {
  const session = await validateWebAccessTokenSession();
  if (!session.ok) {
    return NextResponse.json({ error: "unauthorized" }, noStoreInit({ status: 401 }));
  }

  const ctx = await getAuthSessionContext();
  if (!ctx.permissions.workforce.canEdit) {
    return NextResponse.json({ error: "forbidden" }, noStoreInit({ status: 403 }));
  }

  let body: string;
  try {
    body = await request.text();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, noStoreInit({ status: 400 }));
  }

  try {
    const res = await fetch(`${API_BASE}/v1/scheduling/assignments/reorder`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.token}`,
        "Content-Type": "application/json",
      },
      body,
    });
    const bodyText = await res.text();
    return new NextResponse(bodyText, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "application/json",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "upstream_unavailable" }, noStoreInit({ status: 503 }));
  }
}

