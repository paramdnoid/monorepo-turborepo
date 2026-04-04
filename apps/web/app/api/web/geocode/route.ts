import { NextResponse } from "next/server";

import { getUiText } from "@/content/ui-text";
import { validateWebAccessTokenSession } from "@/lib/auth/validate-web-session";
import { getRequestLocale } from "@/lib/i18n/request-locale";
import type { GeocodeSuggestionPayload } from "@/lib/geocode-suggestion";

function noStoreInit(init?: ResponseInit): ResponseInit {
  return {
    ...init,
    headers: {
      ...init?.headers,
      "Cache-Control": "private, no-store",
    },
  };
}

function normalizeCountry(raw: unknown): string {
  if (typeof raw !== "string") {
    return "DE";
  }
  const u = raw.trim().toUpperCase();
  if (u.length === 2) {
    return u;
  }
  const three = { DEU: "DE", AUT: "AT", CHE: "CH", NLD: "NL" } as Record<
    string,
    string
  >;
  if (u.length === 3 && three[u]) {
    return three[u];
  }
  return "DE";
}

function streetFromProperties(p: Record<string, unknown>): string {
  const h = typeof p.housenumber === "string" ? p.housenumber.trim() : "";
  const s = typeof p.street === "string" ? p.street.trim() : "";
  if (h && s) {
    return `${h} ${s}`.trim();
  }
  if (s) {
    return s;
  }
  if (typeof p.street_name === "string" && p.street_name.trim()) {
    return (h ? `${h} ${p.street_name}` : p.street_name).trim();
  }
  return typeof p.name === "string" ? p.name.trim() : "";
}

function mapOrsFeature(feature: unknown): GeocodeSuggestionPayload | null {
  if (typeof feature !== "object" || feature === null) {
    return null;
  }
  const f = feature as { properties?: Record<string, unknown> };
  const p = f.properties;
  if (!p || typeof p !== "object") {
    return null;
  }
  const street = streetFromProperties(p);
  const city =
    (typeof p.locality === "string" && p.locality.trim()) ||
    (typeof p.localadmin === "string" && p.localadmin.trim()) ||
    (typeof p.county === "string" && p.county.trim()) ||
    "";
  const postalCode =
    (typeof p.postalcode === "string" && p.postalcode.trim()) ||
    (typeof p.postcode === "string" && p.postcode.trim()) ||
    "";
  const country = normalizeCountry(
    p.country_code ?? p.country_a ?? p.country_code_a,
  );
  const fullLabel =
    typeof p.label === "string" && p.label.trim() ? p.label.trim() : null;
  const recipientName =
    (typeof p.name === "string" && p.name.trim()) ||
    fullLabel?.split(",")[0]?.trim() ||
    street ||
    city;
  if (!street && !city) {
    return null;
  }
  return {
    recipientName: recipientName || street || "—",
    street: street || "—",
    postalCode,
    city: city || "—",
    country,
    label: null,
    addressLine2: null,
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
  const q = url.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json(
      { configured: true, suggestions: [] satisfies GeocodeSuggestionPayload[] },
      noStoreInit(),
    );
  }

  const apiKey = process.env.OPENROUTESERVICE_API_KEY?.trim();
  const base =
    process.env.OPENROUTESERVICE_BASE_URL?.replace(/\/$/, "").trim() ?? "";

  if (!apiKey || !base) {
    return NextResponse.json(
      {
        configured: false,
        suggestions: [] satisfies GeocodeSuggestionPayload[],
      },
      noStoreInit(),
    );
  }

  const timeoutRaw = Number(process.env.ADDRESS_API_TIMEOUT_MS);
  const timeoutMs = Number.isFinite(timeoutRaw)
    ? Math.min(Math.max(timeoutRaw, 1000), 15_000)
    : 4000;

  const target = `${base}/search?${new URLSearchParams({
    text: q,
    size: "5",
  })}`;

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(target, {
      headers: { Authorization: apiKey },
      signal: ac.signal,
      cache: "no-store",
    });
    const raw: unknown = await res.json().catch(() => null);
    if (!res.ok || raw === null || typeof raw !== "object") {
      return NextResponse.json(
        { configured: true, suggestions: [], upstreamError: true },
        noStoreInit({ status: 200 }),
      );
    }
    const features = (raw as { features?: unknown }).features;
    if (!Array.isArray(features)) {
      return NextResponse.json(
        { configured: true, suggestions: [] },
        noStoreInit(),
      );
    }
    const suggestions = features
      .map(mapOrsFeature)
      .filter((x): x is GeocodeSuggestionPayload => x !== null);
    return NextResponse.json(
      { configured: true, suggestions },
      noStoreInit(),
    );
  } catch {
    return NextResponse.json(
      { configured: true, suggestions: [], upstreamError: true },
      noStoreInit({ status: 200 }),
    );
  } finally {
    clearTimeout(t);
  }
}
