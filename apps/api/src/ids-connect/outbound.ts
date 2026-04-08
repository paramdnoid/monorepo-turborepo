import { randomUUID } from "node:crypto";

import {
  type IdsConnectCartPatchRequest,
  type IdsConnectSearchResponse,
  idsConnectCartSnapshotSchema,
  idsConnectSearchResponseSchema,
} from "@repo/api-contracts";

/** Relativ zur Lieferanten-Basis-URL (normalisierte Shim-Kontrakte). */
export const IDS_CONNECT_PATH_PREFIX = "/zgwerk/ids-connect/v1";

type SupplierMeta = Record<string, unknown>;

const MOCK_HITS = [
  {
    externalId: "mock-ext-1",
    sku: "GH-10001",
    name: "Acryl Dispersionsfarbe weiss 12,5 l",
    unit: "Gebinde",
    price: "48.90",
    currency: "EUR",
  },
  {
    externalId: "mock-ext-2",
    sku: "GH-20002",
    name: "Malerrolle Pro 25 cm",
    unit: "Stk",
    price: "7.20",
    currency: "EUR",
  },
];

export function mockSearchResponse(q?: string | null): IdsConnectSearchResponse {
  const needle = (q ?? "").trim().toLowerCase();
  const hits = MOCK_HITS.filter(
    (h) =>
      !needle ||
      h.sku.toLowerCase().includes(needle) ||
      (h.name?.toLowerCase().includes(needle) ?? false),
  ).map((h) => ({ ...h }));
  return { hits, nextCursor: null };
}

export function mockHitByExternalId(
  externalId: string,
):
  | (typeof MOCK_HITS)[number]
  | undefined {
  return MOCK_HITS.find((h) => h.externalId === externalId);
}

async function fetchJson(
  url: string,
  init: RequestInit,
): Promise<unknown> {
  const res = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(28_000),
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`ids_connect_invalid_json:${res.status}`);
  }
  if (!res.ok) {
    throw new Error(`ids_connect_http:${res.status}`);
  }
  return json;
}

function baseAndAuth(meta: SupplierMeta): {
  base: string;
  headers: Record<string, string>;
} {
  const base = String(meta.idsConnectBaseUrl ?? "")
    .trim()
    .replace(/\/$/, "");
  const key = String(meta.idsConnectApiKey ?? "").trim();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (key) {
    headers.Authorization = `Bearer ${key}`;
  }
  return { base, headers };
}

export async function outboundSearch(
  meta: SupplierMeta,
  body: { q?: string; cursor?: string | null },
): Promise<IdsConnectSearchResponse> {
  if (meta.idsConnectMode === "mock") {
    return mockSearchResponse(body.q);
  }
  const { base, headers } = baseAndAuth(meta);
  const url = `${base}${IDS_CONNECT_PATH_PREFIX}/search`;
  const json = await fetchJson(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return idsConnectSearchResponseSchema.parse(json);
}

export async function outboundCreateCart(
  meta: SupplierMeta,
): Promise<{ externalCartId: string }> {
  if (meta.idsConnectMode === "mock") {
    return {
      externalCartId: `mock-cart-${randomUUID()}`,
    };
  }
  const { base, headers } = baseAndAuth(meta);
  const url = `${base}${IDS_CONNECT_PATH_PREFIX}/carts`;
  const json = (await fetchJson(url, {
    method: "POST",
    headers,
    body: JSON.stringify({}),
  })) as { externalCartId?: string };
  const id = json.externalCartId;
  if (!id || typeof id !== "string") {
    throw new Error("ids_connect_missing_external_cart_id");
  }
  return { externalCartId: id };
}

export type IdsConnectSnapshotLine = {
  externalId: string;
  sku: string;
  name: string | null;
  quantity: string;
  unit: string | null;
  unitPrice: string;
  currency: string;
};

export async function outboundPatchCart(
  meta: SupplierMeta,
  externalCartId: string,
  body: IdsConnectCartPatchRequest,
): Promise<{ lines: IdsConnectSnapshotLine[] }> {
  if (meta.idsConnectMode === "mock") {
    const lines: IdsConnectSnapshotLine[] = body.lines.map((ln) => {
      const hit = mockHitByExternalId(ln.externalId);
      if (!hit) {
        throw new Error(`ids_connect_unknown_line:${ln.externalId}`);
      }
      return {
        externalId: hit.externalId,
        sku: hit.sku,
        name: hit.name,
        quantity: ln.quantity,
        unit: hit.unit,
        unitPrice: hit.price,
        currency: hit.currency,
      };
    });
    return { lines };
  }
  const { base, headers } = baseAndAuth(meta);
  const url = `${base}${IDS_CONNECT_PATH_PREFIX}/carts/${encodeURIComponent(externalCartId)}`;
  const json = (await fetchJson(url, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  })) as { snapshot?: unknown };
  const snap = idsConnectCartSnapshotSchema.safeParse(json.snapshot ?? json);
  if (!snap.success) {
    throw new Error("ids_connect_patch_invalid_response");
  }
  return { lines: snap.data.lines };
}

export async function outboundSubmitCart(
  meta: SupplierMeta,
  externalCartId: string,
): Promise<{
  status: string;
  redirectUrl: string | null;
  message?: string;
}> {
  if (meta.idsConnectMode === "mock") {
    return {
      status: "submitted",
      redirectUrl: null,
      message: "Mock: Warenkorb uebermittelt.",
    };
  }
  const { base, headers } = baseAndAuth(meta);
  const url = `${base}${IDS_CONNECT_PATH_PREFIX}/carts/${encodeURIComponent(externalCartId)}/submit`;
  const json = (await fetchJson(url, {
    method: "POST",
    headers,
    body: JSON.stringify({}),
  })) as {
    status?: string;
    redirectUrl?: string | null;
    message?: string;
  };
  return {
    status: json.status ?? "submitted",
    redirectUrl: json.redirectUrl ?? null,
    message: json.message,
  };
}
