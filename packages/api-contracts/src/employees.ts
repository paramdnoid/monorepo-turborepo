import { z } from "zod";

/** Lokale Uhrzeit HH:MM oder HH:MM:SS (Postgres `time`). */
export const employeeLocalTimeSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "invalid_time_format");

export type EmployeeLocalTime = z.infer<typeof employeeLocalTimeSchema>;

export const employeeGeocodeSourceSchema = z.enum(["manual", "ors"]);

export type EmployeeGeocodeSource = z.infer<typeof employeeGeocodeSourceSchema>;

/** 0 = Sonntag .. 6 = Samstag (JavaScript Date#getDay). */
export const employeeWeekdaySchema = z.number().int().min(0).max(6);

const optionalTrimmedText = z.union([z.string().trim().max(8000), z.null()]);

function coordsRefine(
  data: { latitude: number | null; longitude: number | null },
  ctx: z.core.$RefinementCtx,
) {
  const hasLat = data.latitude !== null && data.latitude !== undefined;
  const hasLng = data.longitude !== null && data.longitude !== undefined;
  if (hasLat !== hasLng) {
    ctx.addIssue({
      code: "custom",
      message: "latitude_and_longitude_together",
      path: hasLat ? ["longitude"] : ["latitude"],
    });
  }
  if (hasLat && data.latitude !== null) {
    if (data.latitude < -90 || data.latitude > 90) {
      ctx.addIssue({
        code: "custom",
        message: "latitude_range",
        path: ["latitude"],
      });
    }
  }
  if (hasLng && data.longitude !== null) {
    if (data.longitude < -180 || data.longitude > 180) {
      ctx.addIssue({
        code: "custom",
        message: "longitude_range",
        path: ["longitude"],
      });
    }
  }
}

const privateAddressFields = {
  privateAddressLabel: optionalTrimmedText.optional().default(null),
  privateAddressLine2: optionalTrimmedText.optional().default(null),
  privateRecipientName: optionalTrimmedText.optional().default(null),
  privateStreet: optionalTrimmedText.optional().default(null),
  privatePostalCode: optionalTrimmedText.optional().default(null),
  privateCity: optionalTrimmedText.optional().default(null),
  privateCountry: z
    .union([
      z
        .string()
        .trim()
        .length(2)
        .regex(/^[A-Z]{2}$/),
      z.null(),
    ])
    .optional()
    .default(null),
  latitude: z.number().finite().nullable().optional().default(null),
  longitude: z.number().finite().nullable().optional().default(null),
  geocodeSource: z
    .union([employeeGeocodeSourceSchema, z.null()])
    .optional()
    .default(null),
};

export const employeeAvailabilityRuleInputSchema = z
  .object({
    weekday: employeeWeekdaySchema,
    startTime: employeeLocalTimeSchema,
    endTime: employeeLocalTimeSchema,
    sortIndex: z.number().int().min(0).max(999).optional().default(0),
  })
  .superRefine((v, ctx) => {
    if (v.endTime <= v.startTime) {
      ctx.addIssue({
        code: "custom",
        message: "end_after_start",
        path: ["endTime"],
      });
    }
  });

export type EmployeeAvailabilityRuleInput = z.infer<
  typeof employeeAvailabilityRuleInputSchema
>;

export const employeeAvailabilityRuleSchema = z.object({
  id: z.string().uuid(),
  weekday: employeeWeekdaySchema,
  startTime: employeeLocalTimeSchema,
  endTime: employeeLocalTimeSchema,
  sortIndex: z.number().int().min(0).max(999),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type EmployeeAvailabilityRule = z.infer<
  typeof employeeAvailabilityRuleSchema
>;

export const employeeListItemSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  roleLabel: z.string().nullable(),
  city: z.string().nullable(),
  hasGeo: z.boolean(),
  archivedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type EmployeeListItem = z.infer<typeof employeeListItemSchema>;

export const employeesListResponseSchema = z.object({
  employees: z.array(employeeListItemSchema),
  total: z.number().int().nonnegative(),
});

export const employeeDetailSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  roleLabel: z.string().nullable(),
  notes: z.string().nullable(),
  privateAddressLabel: z.string().nullable(),
  privateAddressLine2: z.string().nullable(),
  privateRecipientName: z.string().nullable(),
  privateStreet: z.string().nullable(),
  privatePostalCode: z.string().nullable(),
  privateCity: z.string().nullable(),
  privateCountry: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  geocodedAt: z.string().nullable(),
  geocodeSource: employeeGeocodeSourceSchema.nullable(),
  archivedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  availability: z.array(employeeAvailabilityRuleSchema),
});

export type EmployeeDetail = z.infer<typeof employeeDetailSchema>;

export const employeeDetailResponseSchema = z.object({
  employee: employeeDetailSchema,
});

export const employeeCreateSchema = z
  .object({
    displayName: z.string().trim().min(1).max(400),
    roleLabel: z
      .union([z.string().trim().max(200), z.null()])
      .optional()
      .default(null),
    notes: optionalTrimmedText.optional().default(null),
    ...privateAddressFields,
    availability: z
      .array(employeeAvailabilityRuleInputSchema)
      .optional()
      .default([]),
  })
  .superRefine((data, ctx) => {
    coordsRefine(
      { latitude: data.latitude ?? null, longitude: data.longitude ?? null },
      ctx,
    );
  });

export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;

const optionalPrivateAddressPatch = {
  privateAddressLabel: optionalTrimmedText.optional(),
  privateAddressLine2: optionalTrimmedText.optional(),
  privateRecipientName: optionalTrimmedText.optional(),
  privateStreet: optionalTrimmedText.optional(),
  privatePostalCode: optionalTrimmedText.optional(),
  privateCity: optionalTrimmedText.optional(),
  privateCountry: z
    .union([
      z
        .string()
        .trim()
        .length(2)
        .regex(/^[A-Z]{2}$/),
      z.null(),
    ])
    .optional(),
  latitude: z.number().finite().nullable().optional(),
  longitude: z.number().finite().nullable().optional(),
  geocodeSource: z
    .union([employeeGeocodeSourceSchema, z.null()])
    .optional(),
};

export const employeePatchSchema = z
  .object({
    displayName: z.string().trim().min(1).max(400).optional(),
    roleLabel: z.union([z.string().trim().max(200), z.null()]).optional(),
    notes: optionalTrimmedText.optional(),
    archived: z.boolean().optional(),
    availability: z.array(employeeAvailabilityRuleInputSchema).optional(),
    ...optionalPrivateAddressPatch,
  })
  .superRefine((data, ctx) => {
    const lat =
      data.latitude !== undefined ? data.latitude : ("__skip__" as const);
    const lng =
      data.longitude !== undefined ? data.longitude : ("__skip__" as const);
    if (lat === "__skip__" && lng === "__skip__") {
      return;
    }
    const latitude = lat === "__skip__" ? null : lat;
    const longitude = lng === "__skip__" ? null : lng;
    coordsRefine({ latitude, longitude }, ctx);
  });

export type EmployeePatchInput = z.infer<typeof employeePatchSchema>;
