import { z } from "zod";

/** Sync-`entityType` für Maler-Projekte. */
export const SYNC_ENTITY_TYPE_PROJECT = "project" as const;

/** Maler: erste Domänen-Entität für Offline-Sync (`entityType`: `project`). */
export const projectCreatePayloadSchema = z.object({
  title: z.string().trim().min(1).max(500),
});

export const projectUpdatePayloadSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(500).optional(),
});

export const projectDeletePayloadSchema = z.object({
  id: z.string().uuid(),
});

/** GET `/v1/projects` — Liste fuer Mandanten. */
export const projectListItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  createdAt: z.string(),
});

export type ProjectListItem = z.infer<typeof projectListItemSchema>;

export const projectsListResponseSchema = z.object({
  projects: z.array(projectListItemSchema),
});
