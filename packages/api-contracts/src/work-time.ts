import { z } from "zod";

export const workTimeDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "invalid_date");

export const workTimeEntrySchema = z.object({
  id: z.string().uuid(),
  employeeId: z.string().uuid(),
  workDate: workTimeDateSchema,
  durationMinutes: z.number().int().min(1).max(24 * 60),
  projectId: z.string().uuid().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const workTimeEntriesListResponseSchema = z.object({
  entries: z.array(workTimeEntrySchema),
});

export const workTimeEntryMutationResponseSchema = z.object({
  entry: workTimeEntrySchema,
});

export const workTimeEntryCreateSchema = z.object({
  employeeId: z.string().uuid(),
  workDate: workTimeDateSchema,
  durationMinutes: z.number().int().min(1).max(24 * 60),
  projectId: z.union([z.string().uuid(), z.null()]).optional().default(null),
  notes: z.union([z.string().trim().max(2000), z.null()]).optional().default(null),
});

export const workTimeEntryPatchSchema = z
  .object({
    employeeId: z.string().uuid().optional(),
    workDate: workTimeDateSchema.optional(),
    durationMinutes: z.number().int().min(1).max(24 * 60).optional(),
    projectId: z.union([z.string().uuid(), z.null()]).optional(),
    notes: z.union([z.string().trim().max(2000), z.null()]).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: "empty_patch",
  });

export type WorkTimeEntry = z.infer<typeof workTimeEntrySchema>;
export type WorkTimeEntriesListResponse = z.infer<
  typeof workTimeEntriesListResponseSchema
>;
export type WorkTimeEntryMutationResponse = z.infer<
  typeof workTimeEntryMutationResponseSchema
>;
export type WorkTimeEntryCreateInput = z.infer<typeof workTimeEntryCreateSchema>;
export type WorkTimeEntryPatchInput = z.infer<typeof workTimeEntryPatchSchema>;
