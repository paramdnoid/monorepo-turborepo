import {
  projectCreatePayloadSchema,
  projectDeletePayloadSchema,
  projectUpdatePayloadSchema,
  SYNC_ENTITY_TYPE_PROJECT,
  syncBatchRequestSchema,
} from "@repo/api-contracts";
import { and, eq, sql } from "drizzle-orm";
import type { Context } from "hono";

import { projects, syncMutationReceipts, type Db } from "@repo/db";

type MutationResult = {
  idempotencyKey: string;
  status: "applied" | "duplicate" | "rejected";
  entityId?: string;
  error?: string;
};

function isPgUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "23505"
  );
}

async function applyProjectMutation(
  tx: Db,
  tenantId: string,
  mutation: {
    operation: "create" | "update" | "delete";
    payload: Record<string, unknown>;
  },
): Promise<{ ok: true; entityId?: string } | { ok: false; message: string }> {
  if (mutation.operation === "create") {
    const parsed = projectCreatePayloadSchema.safeParse(mutation.payload);
    if (!parsed.success) {
      return { ok: false, message: parsed.error.message };
    }
    const [row] = await tx
      .insert(projects)
      .values({
        tenantId,
        title: parsed.data.title,
      })
      .returning({ id: projects.id });
    return { ok: true, entityId: row?.id };
  }

  if (mutation.operation === "update") {
    const parsed = projectUpdatePayloadSchema.safeParse(mutation.payload);
    if (!parsed.success) {
      return { ok: false, message: parsed.error.message };
    }
    if (!parsed.data.title) {
      return { ok: false, message: "project update requires title" };
    }
    const updated = await tx
      .update(projects)
      .set({ title: parsed.data.title, updatedAt: sql`now()` })
      .where(
        and(eq(projects.id, parsed.data.id), eq(projects.tenantId, tenantId)),
      )
      .returning({ id: projects.id });
    const row = updated[0];
    if (!row) {
      return { ok: false, message: "project not found" };
    }
    return { ok: true, entityId: row.id };
  }

  if (mutation.operation === "delete") {
    const parsed = projectDeletePayloadSchema.safeParse(mutation.payload);
    if (!parsed.success) {
      return { ok: false, message: parsed.error.message };
    }
    const deleted = await tx
      .delete(projects)
      .where(
        and(eq(projects.id, parsed.data.id), eq(projects.tenantId, tenantId)),
      )
      .returning({ id: projects.id });
    const row = deleted[0];
    if (!row) {
      return { ok: false, message: "project not found" };
    }
    return { ok: true, entityId: row.id };
  }

  return { ok: false, message: "unsupported operation" };
}

export function createSyncHandler(getDb: () => Db | undefined) {
  return async function syncHandler(c: Context) {
    const db = getDb();
    if (!db) {
      return c.json(
        { error: "database_unavailable", code: "DATABASE_UNAVAILABLE" },
        503,
      );
    }

    const auth = c.get("auth");
    if (!auth) {
      return c.json(
        { error: "missing_auth_context", code: "MISSING_AUTH_CONTEXT" },
        500,
      );
    }
    const tenantId = auth.tenantId;
    const bodyUnknown = await c.req.json().catch(() => null);
    const parsedBody = syncBatchRequestSchema.safeParse(bodyUnknown);
    if (!parsedBody.success) {
      return c.json(
        {
          error: "invalid_body",
          code: "INVALID_BODY",
          detail: parsedBody.error.flatten(),
        },
        400,
      );
    }
    const { deviceId, mutations } = parsedBody.data;

    const results: MutationResult[] = [];

    await db.transaction(async (tx) => {
      for (const mutation of mutations) {
        const idempotencyKey = mutation.idempotencyKey;

        if (mutation.entityType !== SYNC_ENTITY_TYPE_PROJECT) {
          results.push({
            idempotencyKey,
            status: "rejected",
            error: `unsupported entity_type: ${mutation.entityType}`,
          });
          continue;
        }

        let receiptId: string | undefined;

        try {
          const inserted = await tx
            .insert(syncMutationReceipts)
            .values({
              tenantId,
              idempotencyKey,
              deviceId,
              entityType: mutation.entityType,
              operation: mutation.operation,
              payload: mutation.payload,
              resultEntityId: null,
            })
            .returning({ id: syncMutationReceipts.id });

          receiptId = inserted[0]?.id;
        } catch (e) {
          if (isPgUniqueViolation(e)) {
            const dup = await tx
              .select({ resultEntityId: syncMutationReceipts.resultEntityId })
              .from(syncMutationReceipts)
              .where(
                and(
                  eq(syncMutationReceipts.tenantId, tenantId),
                  eq(syncMutationReceipts.idempotencyKey, idempotencyKey),
                ),
              )
              .limit(1);
            results.push({
              idempotencyKey,
              status: "duplicate",
              entityId: dup[0]?.resultEntityId ?? undefined,
            });
            continue;
          }
          throw e;
        }

        const outcome = await applyProjectMutation(tx, tenantId, mutation);
        if (!outcome.ok) {
          if (receiptId) {
            await tx
              .delete(syncMutationReceipts)
              .where(eq(syncMutationReceipts.id, receiptId));
          }
          results.push({
            idempotencyKey,
            status: "rejected",
            error: outcome.message,
          });
          continue;
        }

        if (receiptId) {
          await tx
            .update(syncMutationReceipts)
            .set({ resultEntityId: outcome.entityId ?? null })
            .where(eq(syncMutationReceipts.id, receiptId));
        }

        results.push({
          idempotencyKey,
          status: "applied",
          entityId: outcome.entityId,
        });
      }
    });

    return c.json({ results });
  };
}
