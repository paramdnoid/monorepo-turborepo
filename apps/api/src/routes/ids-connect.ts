import {
  type IdsConnectCartRow,
  idsConnectCartPatchRequestSchema,
  idsConnectSearchRequestSchema,
  idsConnectCartSubmitResponseSchema,
} from "@repo/api-contracts";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";

import {
  catalogSuppliers,
  idsConnectCarts,
  type Db,
} from "@repo/db";

import {
  outboundCreateCart,
  outboundPatchCart,
  outboundSearch,
  outboundSubmitCart,
} from "../ids-connect/outbound.js";

const RETENTION_DAYS = 90;

function logIds(
  c: Context,
  msg: string,
  extra: Record<string, unknown> = {},
): void {
  console.log(
    JSON.stringify({
      level: "info",
      service: "zunftgewerk-api",
      module: "ids_connect",
      requestId: c.get("requestId"),
      msg,
      ...extra,
    }),
  );
}

const IDS_WINDOW_MS = 60_000;
const IDS_MAX_PER_WINDOW = 60;
const idsTimestampsByTenant = new Map<string, number[]>();

function idsRateAllowed(tenantId: string): boolean {
  const now = Date.now();
  const list = idsTimestampsByTenant.get(tenantId) ?? [];
  const recent = list.filter((t) => now - t < IDS_WINDOW_MS);
  if (recent.length >= IDS_MAX_PER_WINDOW) {
    return false;
  }
  recent.push(now);
  idsTimestampsByTenant.set(tenantId, recent);
  return true;
}

function purgeDate(): Date {
  return new Date(Date.now() + RETENTION_DAYS * 86_400_000);
}

function mapCartRow(
  r: typeof idsConnectCarts.$inferSelect,
): IdsConnectCartRow {
  return {
    id: r.id,
    supplierId: r.supplierId,
    externalCartId: r.externalCartId,
    status: r.status as IdsConnectCartRow["status"],
    snapshot: r.snapshot,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

async function loadIdsSupplier(
  db: Db,
  tenantId: string,
  supplierId: string,
) {
  const rows = await db
    .select()
    .from(catalogSuppliers)
    .where(
      and(
        eq(catalogSuppliers.id, supplierId),
        eq(catalogSuppliers.tenantId, tenantId),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row || row.sourceKind !== "ids_connect") {
    return undefined;
  }
  const meta =
    row.meta && typeof row.meta === "object"
      ? (row.meta as Record<string, unknown>)
      : undefined;
  if (!meta?.idsConnectMode) {
    return undefined;
  }
  return { row, meta };
}

export function createIdsConnectSearchHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth", code: "AUTH" }, 500);
    }
    if (!idsRateAllowed(auth.tenantId)) {
      return c.json(
        { error: "rate_limited", code: "RATE_LIMIT", retryAfterSec: 60 },
        429,
      );
    }
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable", code: "DB" }, 503);
    }
    const supplierId = c.req.param("supplierId");
    if (!supplierId) {
      return c.json({ error: "missing_supplier", code: "PARAM" }, 400);
    }
    const loaded = await loadIdsSupplier(db, auth.tenantId, supplierId);
    if (!loaded) {
      return c.json({ error: "supplier_not_found", code: "SUPPLIER" }, 404);
    }
    let json: unknown;
    try {
      json = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json", code: "JSON" }, 400);
    }
    const parsed = idsConnectSearchRequestSchema.safeParse(json);
    if (!parsed.success) {
      return c.json({ error: "invalid_body", code: "VALIDATION" }, 400);
    }
    try {
      logIds(c, "ids_connect_search", {
        tenantId: auth.tenantId,
        supplierId,
        q: parsed.data.q ?? "",
      });
      const res = await outboundSearch(loaded.meta, parsed.data);
      return c.json(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "ids_connect_error";
      return c.json(
        { error: "ids_connect_upstream", code: "IDS", detail: msg },
        502,
      );
    }
  };
}

export function createIdsConnectCartPostHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth", code: "AUTH" }, 500);
    }
    if (!idsRateAllowed(auth.tenantId)) {
      return c.json(
        { error: "rate_limited", code: "RATE_LIMIT", retryAfterSec: 60 },
        429,
      );
    }
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable", code: "DB" }, 503);
    }
    const supplierId = c.req.param("supplierId");
    if (!supplierId) {
      return c.json({ error: "missing_supplier", code: "PARAM" }, 400);
    }
    const loaded = await loadIdsSupplier(db, auth.tenantId, supplierId);
    if (!loaded) {
      return c.json({ error: "supplier_not_found", code: "SUPPLIER" }, 404);
    }
    try {
      logIds(c, "ids_connect_cart_create", {
        tenantId: auth.tenantId,
        supplierId,
      });
      const { externalCartId } = await outboundCreateCart(loaded.meta);
      const [row] = await db
        .insert(idsConnectCarts)
        .values({
          tenantId: auth.tenantId,
          supplierId: loaded.row.id,
          externalCartId,
          status: "draft",
          snapshot: { lines: [] },
          purgeAfterAt: purgeDate(),
        })
        .returning();
      if (!row) {
        return c.json({ error: "insert_failed", code: "INSERT" }, 500);
      }
      return c.json({ cart: mapCartRow(row) }, 201);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "ids_connect_error";
      return c.json(
        { error: "ids_connect_upstream", code: "IDS", detail: msg },
        502,
      );
    }
  };
}

export function createIdsConnectCartPatchHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth", code: "AUTH" }, 500);
    }
    if (!idsRateAllowed(auth.tenantId)) {
      return c.json(
        { error: "rate_limited", code: "RATE_LIMIT", retryAfterSec: 60 },
        429,
      );
    }
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable", code: "DB" }, 503);
    }
    const cartId = c.req.param("cartId");
    if (!cartId) {
      return c.json({ error: "missing_cart", code: "PARAM" }, 400);
    }
    let json: unknown;
    try {
      json = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json", code: "JSON" }, 400);
    }
    const parsed = idsConnectCartPatchRequestSchema.safeParse(json);
    if (!parsed.success) {
      return c.json({ error: "invalid_body", code: "VALIDATION" }, 400);
    }
    const cartRows = await db
      .select()
      .from(idsConnectCarts)
      .where(
        and(
          eq(idsConnectCarts.id, cartId),
          eq(idsConnectCarts.tenantId, auth.tenantId),
        ),
      )
      .limit(1);
    const cart = cartRows[0];
    if (!cart) {
      return c.json({ error: "cart_not_found", code: "CART" }, 404);
    }
    const loaded = await loadIdsSupplier(db, auth.tenantId, cart.supplierId);
    if (!loaded || !cart.externalCartId) {
      return c.json({ error: "supplier_not_found", code: "SUPPLIER" }, 404);
    }
    try {
      logIds(c, "ids_connect_cart_patch", {
        tenantId: auth.tenantId,
        cartId,
        lineCount: parsed.data.lines.length,
      });
      const { lines } = await outboundPatchCart(
        loaded.meta,
        cart.externalCartId,
        parsed.data,
      );
      const [updated] = await db
        .update(idsConnectCarts)
        .set({
          snapshot: { lines },
          updatedAt: new Date(),
        })
        .where(eq(idsConnectCarts.id, cart.id))
        .returning();
      if (!updated) {
        return c.json({ error: "update_failed", code: "UPDATE" }, 500);
      }
      return c.json({ cart: mapCartRow(updated) });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "ids_connect_error";
      return c.json(
        { error: "ids_connect_upstream", code: "IDS", detail: msg },
        502,
      );
    }
  };
}

export function createIdsConnectCartSubmitHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth", code: "AUTH" }, 500);
    }
    if (!idsRateAllowed(auth.tenantId)) {
      return c.json(
        { error: "rate_limited", code: "RATE_LIMIT", retryAfterSec: 60 },
        429,
      );
    }
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable", code: "DB" }, 503);
    }
    const cartId = c.req.param("cartId");
    if (!cartId) {
      return c.json({ error: "missing_cart", code: "PARAM" }, 400);
    }
    const cartRows = await db
      .select()
      .from(idsConnectCarts)
      .where(
        and(
          eq(idsConnectCarts.id, cartId),
          eq(idsConnectCarts.tenantId, auth.tenantId),
        ),
      )
      .limit(1);
    const cart = cartRows[0];
    if (!cart) {
      return c.json({ error: "cart_not_found", code: "CART" }, 404);
    }
    const loaded = await loadIdsSupplier(db, auth.tenantId, cart.supplierId);
    if (!loaded || !cart.externalCartId) {
      return c.json({ error: "supplier_not_found", code: "SUPPLIER" }, 404);
    }
    try {
      logIds(c, "ids_connect_cart_submit", {
        tenantId: auth.tenantId,
        cartId,
      });
      const submit = await outboundSubmitCart(loaded.meta, cart.externalCartId);
      const [updated] = await db
        .update(idsConnectCarts)
        .set({
          status: "submitted",
          updatedAt: new Date(),
        })
        .where(eq(idsConnectCarts.id, cart.id))
        .returning();
      if (!updated) {
        return c.json({ error: "update_failed", code: "UPDATE" }, 500);
      }
      const body = {
        cart: mapCartRow(updated),
        submit: {
          status: submit.status,
          redirectUrl: submit.redirectUrl,
          message: submit.message,
        },
      };
      const safe = idsConnectCartSubmitResponseSchema.safeParse(body);
      if (!safe.success) {
        return c.json({ error: "response_invalid", code: "INTERNAL" }, 500);
      }
      return c.json(safe.data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "ids_connect_error";
      await db
        .update(idsConnectCarts)
        .set({ status: "error", updatedAt: new Date() })
        .where(eq(idsConnectCarts.id, cart.id));
      return c.json(
        { error: "ids_connect_upstream", code: "IDS", detail: msg },
        502,
      );
    }
  };
}
