import { z } from "zod";

/**
 * Basis für Offline-Sync: Client sendet Batches mit Idempotenz-Key.
 * Server validiert, wendet Mutationen an und antwortet mit neuen Server-Versionen.
 */
export const syncMutationSchema = z.object({
  idempotencyKey: z.string().uuid(),
  entityType: z.string().min(1).max(120),
  operation: z.enum(["create", "update", "delete"]),
  payload: z.record(z.string(), z.unknown()),
  clientVersion: z.number().int().nonnegative().optional(),
});

/** Request-Body für POST /v1/sync — Mandant kommt ausschließlich aus dem JWT. */
export const syncBatchRequestSchema = z.object({
  deviceId: z.string().uuid(),
  mutations: z.array(syncMutationSchema).max(500),
});

export type SyncMutation = z.infer<typeof syncMutationSchema>;
export type SyncBatchRequest = z.infer<typeof syncBatchRequestSchema>;

/** @deprecated Nutze {@link syncBatchRequestSchema} — `tenantId` gehört nicht in den Client-Body. */
export const syncBatchSchema = z.object({
  deviceId: z.string().uuid(),
  tenantId: z.string().min(1).max(128),
  mutations: z.array(syncMutationSchema).max(500),
});

export type SyncBatch = z.infer<typeof syncBatchSchema>;
