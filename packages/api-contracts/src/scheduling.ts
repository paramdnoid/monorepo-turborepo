import { z } from "zod";

import {
  employeeLocalTimeSchema,
  employeeRelationshipKindSchema,
  employeeStatusSchema,
  employeeTimeZoneSchema,
} from "./employees.js";

export const schedulingDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "invalid_date");

export const schedulingUnavailableReasonSchema = z.enum([
  "vacation",
  "sick",
  "override",
]);

export const schedulingSlotSourceSchema = z.enum(["weekly", "override"]);

export const schedulingDaySlotSchema = z.object({
  startTime: employeeLocalTimeSchema,
  endTime: employeeLocalTimeSchema,
  crossesMidnight: z.boolean(),
  source: schedulingSlotSourceSchema,
});

export const schedulingDayEmployeeSchema = z.object({
  employeeId: z.string().uuid(),
  displayName: z.string(),
  employeeNo: z.string().nullable(),
  status: employeeStatusSchema,
  city: z.string().nullable(),
  hasGeo: z.boolean(),
  availabilityTimeZone: employeeTimeZoneSchema,
  isAvailable: z.boolean(),
  unavailableReason: schedulingUnavailableReasonSchema.nullable(),
  slots: z.array(schedulingDaySlotSchema),
});

export const schedulingDependencyWarningSchema = z.object({
  kind: employeeRelationshipKindSchema,
  employeeId: z.string().uuid(),
  relatedEmployeeId: z.string().uuid(),
  message: z.string(),
});

export const schedulingDayResponseSchema = z.object({
  date: schedulingDateSchema,
  employees: z.array(schedulingDayEmployeeSchema),
  dependencyWarnings: z.array(schedulingDependencyWarningSchema),
});

export const schedulingAssignmentSchema = z.object({
  id: z.string().uuid(),
  employeeId: z.string().uuid(),
  date: schedulingDateSchema,
  startTime: employeeLocalTimeSchema,
  title: z.string(),
  place: z.string().nullable(),
  reminderMinutesBefore: z.number().int().min(0).max(1440).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const schedulingAssignmentCreateResponseSchema = z.object({
  assignment: schedulingAssignmentSchema,
  dependencyWarnings: z.array(schedulingDependencyWarningSchema),
});

export const schedulingAssignmentsListResponseSchema = z.object({
  assignments: z.array(schedulingAssignmentSchema),
});

export const schedulingAssignmentCreateSchema = z.object({
  employeeId: z.string().uuid(),
  date: schedulingDateSchema,
  startTime: employeeLocalTimeSchema,
  title: z.string().trim().min(1).max(200),
  place: z.union([z.string().trim().max(200), z.null()]).optional().default(null),
  reminderMinutesBefore: z
    .union([z.number().int().min(0).max(1440), z.null()])
    .optional()
    .default(null),
});

export const schedulingAssignmentPatchSchema = z
  .object({
    employeeId: z.string().uuid().optional(),
    date: schedulingDateSchema.optional(),
    startTime: employeeLocalTimeSchema.optional(),
    title: z.string().trim().min(1).max(200).optional(),
    place: z.union([z.string().trim().max(200), z.null()]).optional(),
    reminderMinutesBefore: z
      .union([z.number().int().min(0).max(1440), z.null()])
      .optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: "empty_patch",
  });

export type SchedulingDate = z.infer<typeof schedulingDateSchema>;
export type SchedulingUnavailableReason = z.infer<
  typeof schedulingUnavailableReasonSchema
>;
export type SchedulingSlotSource = z.infer<typeof schedulingSlotSourceSchema>;
export type SchedulingDaySlot = z.infer<typeof schedulingDaySlotSchema>;
export type SchedulingDayEmployee = z.infer<typeof schedulingDayEmployeeSchema>;
export type SchedulingDependencyWarning = z.infer<
  typeof schedulingDependencyWarningSchema
>;
export type SchedulingDayResponse = z.infer<typeof schedulingDayResponseSchema>;
export type SchedulingAssignment = z.infer<typeof schedulingAssignmentSchema>;
export type SchedulingAssignmentCreateResponse = z.infer<
  typeof schedulingAssignmentCreateResponseSchema
>;
export type SchedulingAssignmentsListResponse = z.infer<
  typeof schedulingAssignmentsListResponseSchema
>;
export type SchedulingAssignmentCreateInput = z.infer<
  typeof schedulingAssignmentCreateSchema
>;
export type SchedulingAssignmentPatchInput = z.infer<
  typeof schedulingAssignmentPatchSchema
>;
