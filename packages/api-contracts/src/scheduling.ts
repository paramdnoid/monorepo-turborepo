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

function schedulingPlaceCoordsRefine(
  ctx: z.RefinementCtx,
  data: { placeLatitude?: number | null; placeLongitude?: number | null },
) {
  const hasLat = data.placeLatitude != null;
  const hasLng = data.placeLongitude != null;
  if (hasLat !== hasLng) {
    ctx.addIssue({
      code: "custom",
      message: "latitude_and_longitude_together",
      path: hasLat ? ["placeLongitude"] : ["placeLatitude"],
    });
    return;
  }
  if (hasLat && data.placeLatitude != null) {
    const latitude = data.placeLatitude;
    if (latitude < -90 || latitude > 90) {
      ctx.addIssue({
        code: "custom",
        message: "latitude_range",
        path: ["placeLatitude"],
      });
    }
  }
  if (hasLng && data.placeLongitude != null) {
    const longitude = data.placeLongitude;
    if (longitude < -180 || longitude > 180) {
      ctx.addIssue({
        code: "custom",
        message: "longitude_range",
        path: ["placeLongitude"],
      });
    }
  }
}

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
  plannedDurationMinutes: z.number().int().min(1).max(1440),
  windowStartTime: employeeLocalTimeSchema.nullable(),
  windowEndTime: employeeLocalTimeSchema.nullable(),
  title: z.string(),
  place: z.string().nullable(),
  placeStreet: z.string().nullable(),
  placeHouseNumber: z.string().nullable(),
  placePostalCode: z.string().nullable(),
  placeCity: z.string().nullable(),
  placeCountry: z.string().nullable(),
  placeLatitude: z.number().nullable(),
  placeLongitude: z.number().nullable(),
  reminderMinutesBefore: z.number().int().min(0).max(1440).nullable(),
  projectId: z.string().uuid().nullable(),
  addressId: z.string().uuid().nullable(),
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

export const schedulingAddressGeoSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
});

export const schedulingAddressesGeoResponseSchema = z.object({
  addresses: z.array(schedulingAddressGeoSchema),
});

export const schedulingRoutingProviderSchema = z.literal("openrouteservice");

export const schedulingRoutingProfileSchema = z.enum([
  "driving-car",
  "driving-hgv",
  "cycling-regular",
  "foot-walking",
]);

export const schedulingRoutingPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const schedulingRoutingMetricSchema = z.enum(["duration", "distance"]);

export const schedulingRoutingMatrixRequestSchema = z
  .object({
    profile: schedulingRoutingProfileSchema.optional().default("driving-car"),
    locations: z.array(schedulingRoutingPointSchema).min(2).max(60),
    metrics: z
      .array(schedulingRoutingMetricSchema)
      .min(1)
      .optional()
      .default(["duration", "distance"]),
  })
  .strict();

export const schedulingRoutingMatrixResponseSchema = z.object({
  provider: schedulingRoutingProviderSchema,
  profile: schedulingRoutingProfileSchema,
  cached: z.boolean(),
  durations: z.array(z.array(z.number().nullable())).nullable(),
  distances: z.array(z.array(z.number().nullable())).nullable(),
});

export const schedulingRoutingDirectionsRequestSchema = z
  .object({
    profile: schedulingRoutingProfileSchema.optional().default("driving-car"),
    coordinates: z.array(schedulingRoutingPointSchema).min(2).max(60),
  })
  .strict();

export const schedulingRoutingDirectionsResponseSchema = z.object({
  provider: schedulingRoutingProviderSchema,
  profile: schedulingRoutingProfileSchema,
  cached: z.boolean(),
  distanceMeters: z.number(),
  durationSeconds: z.number(),
  geometry: z.object({
    type: z.literal("LineString"),
    coordinates: z.array(z.tuple([z.number(), z.number()])),
  }),
});

export const schedulingAssignmentCreateSchema = z
  .object({
    employeeId: z.string().uuid(),
    date: schedulingDateSchema,
    startTime: employeeLocalTimeSchema,
    plannedDurationMinutes: z.number().int().min(1).max(1440).optional().default(60),
    windowStartTime: employeeLocalTimeSchema.nullable().optional().default(null),
    windowEndTime: employeeLocalTimeSchema.nullable().optional().default(null),
    title: z.string().trim().min(1).max(200),
    place: z.union([z.string().trim().max(200), z.null()]).optional().default(null),
    placeStreet: z.union([z.string().trim().max(500), z.null()]).optional().default(null),
    placeHouseNumber: z.union([z.string().trim().max(80), z.null()]).optional().default(null),
    placePostalCode: z.union([z.string().trim().max(40), z.null()]).optional().default(null),
    placeCity: z.union([z.string().trim().max(200), z.null()]).optional().default(null),
    placeCountry: z.union([z.string().trim().max(200), z.null()]).optional().default(null),
    placeLatitude: z.union([z.number().finite(), z.null()]).optional().default(null),
    placeLongitude: z.union([z.number().finite(), z.null()]).optional().default(null),
    reminderMinutesBefore: z
      .union([z.number().int().min(0).max(1440), z.null()])
      .optional()
      .default(null),
    projectId: z.union([z.string().uuid(), z.null()]).optional().default(null),
    addressId: z.union([z.string().uuid(), z.null()]).optional().default(null),
  })
  .superRefine((data, ctx) => {
    schedulingPlaceCoordsRefine(ctx, data);
  });

export const schedulingAssignmentPatchSchema = z
  .object({
    employeeId: z.string().uuid().optional(),
    date: schedulingDateSchema.optional(),
    startTime: employeeLocalTimeSchema.optional(),
    plannedDurationMinutes: z.number().int().min(1).max(1440).optional(),
    windowStartTime: employeeLocalTimeSchema.nullable().optional(),
    windowEndTime: employeeLocalTimeSchema.nullable().optional(),
    title: z.string().trim().min(1).max(200).optional(),
    place: z.union([z.string().trim().max(200), z.null()]).optional(),
    placeStreet: z.union([z.string().trim().max(500), z.null()]).optional(),
    placeHouseNumber: z.union([z.string().trim().max(80), z.null()]).optional(),
    placePostalCode: z.union([z.string().trim().max(40), z.null()]).optional(),
    placeCity: z.union([z.string().trim().max(200), z.null()]).optional(),
    placeCountry: z.union([z.string().trim().max(200), z.null()]).optional(),
    placeLatitude: z.union([z.number().finite(), z.null()]).optional(),
    placeLongitude: z.union([z.number().finite(), z.null()]).optional(),
    reminderMinutesBefore: z
      .union([z.number().int().min(0).max(1440), z.null()])
      .optional(),
    projectId: z.union([z.string().uuid(), z.null()]).optional(),
    addressId: z.union([z.string().uuid(), z.null()]).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.placeLatitude === undefined && data.placeLongitude === undefined) {
      return;
    }
    if (data.placeLatitude === undefined || data.placeLongitude === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "latitude_and_longitude_together",
        path: data.placeLatitude === undefined ? ["placeLatitude"] : ["placeLongitude"],
      });
      return;
    }
    schedulingPlaceCoordsRefine(ctx, data);
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "empty_patch",
  });

export const schedulingAssignmentReorderItemSchema = z.object({
  id: z.string().uuid(),
  startTime: employeeLocalTimeSchema,
});

export const schedulingAssignmentsReorderRequestSchema = z
  .object({
    assignments: z.array(schedulingAssignmentReorderItemSchema).min(1).max(60),
  })
  .strict();

export const schedulingAssignmentsReorderResponseSchema = z.object({
  ok: z.literal(true),
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
export type SchedulingAssignmentReorderItem = z.infer<
  typeof schedulingAssignmentReorderItemSchema
>;
export type SchedulingAssignmentsReorderRequest = z.infer<
  typeof schedulingAssignmentsReorderRequestSchema
>;
export type SchedulingAssignmentsReorderResponse = z.infer<
  typeof schedulingAssignmentsReorderResponseSchema
>;

export type SchedulingRoutingProvider = z.infer<
  typeof schedulingRoutingProviderSchema
>;
export type SchedulingRoutingProfile = z.infer<typeof schedulingRoutingProfileSchema>;
export type SchedulingRoutingPoint = z.infer<typeof schedulingRoutingPointSchema>;
export type SchedulingRoutingMetric = z.infer<typeof schedulingRoutingMetricSchema>;
export type SchedulingRoutingMatrixRequest = z.infer<
  typeof schedulingRoutingMatrixRequestSchema
>;
export type SchedulingRoutingMatrixResponse = z.infer<
  typeof schedulingRoutingMatrixResponseSchema
>;
export type SchedulingRoutingDirectionsRequest = z.infer<
  typeof schedulingRoutingDirectionsRequestSchema
>;
export type SchedulingRoutingDirectionsResponse = z.infer<
  typeof schedulingRoutingDirectionsResponseSchema
>;
