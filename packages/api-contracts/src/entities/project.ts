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

export const projectStatusSchema = z.enum([
  "planned",
  "active",
  "on-hold",
  "completed",
]);

export type ProjectStatus = z.infer<typeof projectStatusSchema>;

const optionalTrimmedOrNull = (max: number) =>
  z.union([z.string().trim().max(max), z.null()]).optional();
const optionalUuidOrNull = z.union([z.string().uuid(), z.null()]).optional();

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

/** Projekt-Stammdaten fuer API (`/v1/projects`). */
export const projectSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  projectNumber: z.string().nullable(),
  status: projectStatusSchema,
  customerId: z.string().uuid().nullable(),
  siteAddressId: z.string().uuid().nullable(),
  customerLabel: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  archivedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Project = z.infer<typeof projectSchema>;

export const projectsListResponseSchema = z.object({
  projects: z.array(projectSchema),
  total: z.number().int().nonnegative(),
});

export type ProjectsListResponse = z.infer<typeof projectsListResponseSchema>;

export const projectsListQuerySchema = z.object({
  q: z.string().trim().optional(),
  status: projectStatusSchema.optional(),
  includeArchived: z.boolean().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
});

export type ProjectsListQuery = z.infer<typeof projectsListQuerySchema>;

export const projectCreateRequestSchema = z
  .object({
    title: z.string().trim().min(1).max(500),
    projectNumber: optionalTrimmedOrNull(80),
    status: projectStatusSchema.optional(),
    customerId: optionalUuidOrNull,
    siteAddressId: optionalUuidOrNull,
    customerLabel: optionalTrimmedOrNull(240),
    startDate: z.union([isoDate, z.null()]).optional(),
    endDate: z.union([isoDate, z.null()]).optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.startDate && v.endDate && v.startDate > v.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "startDate must be <= endDate",
        path: ["endDate"],
      });
    }
    if (v.siteAddressId != null && !v.customerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "siteAddressId requires customerId",
        path: ["siteAddressId"],
      });
    }
  });

export type ProjectCreateRequest = z.infer<typeof projectCreateRequestSchema>;

export const projectPatchRequestSchema = z
  .object({
    title: z.string().trim().min(1).max(500).optional(),
    projectNumber: optionalTrimmedOrNull(80),
    status: projectStatusSchema.optional(),
    customerId: optionalUuidOrNull,
    siteAddressId: optionalUuidOrNull,
    customerLabel: optionalTrimmedOrNull(240),
    startDate: z.union([isoDate, z.null()]).optional(),
    endDate: z.union([isoDate, z.null()]).optional(),
    archived: z.boolean().optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.startDate && v.endDate && v.startDate > v.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "startDate must be <= endDate",
        path: ["endDate"],
      });
    }
    if (v.siteAddressId != null && !v.customerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "siteAddressId requires customerId",
        path: ["siteAddressId"],
      });
    }
  });

export type ProjectPatchRequest = z.infer<typeof projectPatchRequestSchema>;

export const projectResponseSchema = z.object({
  project: projectSchema,
});

export type ProjectResponse = z.infer<typeof projectResponseSchema>;
