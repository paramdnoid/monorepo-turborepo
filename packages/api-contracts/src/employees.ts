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
export const employeeDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "invalid_date");
export const employeeTimeZoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+)*$/, "invalid_timezone");

const optionalTrimmedText = z.union([z.string().trim().max(8000), z.null()]);
const optionalShortText = (max: number) =>
  z.union([z.string().trim().min(1).max(max), z.null()]);
const optionalEmail = z.union([z.string().trim().email().max(400), z.null()]);

export const employeeStatusSchema = z.enum([
  "ACTIVE",
  "ONBOARDING",
  "INACTIVE",
]);

export type EmployeeStatus = z.infer<typeof employeeStatusSchema>;

export const employeeEmploymentTypeSchema = z.enum([
  "FULL_TIME",
  "PART_TIME",
  "CONTRACTOR",
  "APPRENTICE",
]);

export type EmployeeEmploymentType = z.infer<typeof employeeEmploymentTypeSchema>;

export const employeeRelationshipKindSchema = z.enum([
  "MUTUALLY_EXCLUSIVE",
  "MENTOR_TRAINEE",
]);

export type EmployeeRelationshipKind = z.infer<
  typeof employeeRelationshipKindSchema
>;

export const employeeAttachmentKindSchema = z.enum([
  "document",
  "certificate",
  "other",
]);

export type EmployeeAttachmentKind = z.infer<typeof employeeAttachmentKindSchema>;

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
    crossesMidnight: z.boolean().optional().default(false),
    validFrom: employeeDateSchema.nullable().optional().default(null),
    validTo: employeeDateSchema.nullable().optional().default(null),
    sortIndex: z.number().int().min(0).max(999).optional().default(0),
  })
  .superRefine((v, ctx) => {
    if (!v.crossesMidnight && v.endTime <= v.startTime) {
      ctx.addIssue({
        code: "custom",
        message: "end_after_start",
        path: ["endTime"],
      });
    }
    if (v.crossesMidnight && v.endTime >= v.startTime) {
      ctx.addIssue({
        code: "custom",
        message: "overnight_end_before_start",
        path: ["endTime"],
      });
    }
    if (v.validFrom && v.validTo && v.validTo < v.validFrom) {
      ctx.addIssue({
        code: "custom",
        message: "date_order",
        path: ["validTo"],
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
  crossesMidnight: z.boolean(),
  validFrom: employeeDateSchema.nullable(),
  validTo: employeeDateSchema.nullable(),
  sortIndex: z.number().int().min(0).max(999),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type EmployeeAvailabilityRule = z.infer<
  typeof employeeAvailabilityRuleSchema
>;

export const employeeAvailabilityOverrideInputSchema = z
  .object({
    date: employeeDateSchema,
    isUnavailable: z.boolean().optional().default(false),
    startTime: employeeLocalTimeSchema.nullable().optional().default(null),
    endTime: employeeLocalTimeSchema.nullable().optional().default(null),
    crossesMidnight: z.boolean().optional().default(false),
    sortIndex: z.number().int().min(0).max(999).optional().default(0),
    note: optionalTrimmedText.optional().default(null),
  })
  .superRefine((v, ctx) => {
    if (v.isUnavailable) {
      if (v.startTime !== null || v.endTime !== null) {
        ctx.addIssue({
          code: "custom",
          message: "override_unavailable_no_time",
          path: ["startTime"],
        });
      }
      if (v.crossesMidnight) {
        ctx.addIssue({
          code: "custom",
          message: "override_unavailable_no_overnight",
          path: ["crossesMidnight"],
        });
      }
      return;
    }
    if (!v.startTime || !v.endTime) {
      ctx.addIssue({
        code: "custom",
        message: "override_time_required",
        path: !v.startTime ? ["startTime"] : ["endTime"],
      });
      return;
    }
    if (!v.crossesMidnight && v.endTime <= v.startTime) {
      ctx.addIssue({
        code: "custom",
        message: "end_after_start",
        path: ["endTime"],
      });
    }
    if (v.crossesMidnight && v.endTime >= v.startTime) {
      ctx.addIssue({
        code: "custom",
        message: "overnight_end_before_start",
        path: ["endTime"],
      });
    }
  });

export type EmployeeAvailabilityOverrideInput = z.infer<
  typeof employeeAvailabilityOverrideInputSchema
>;

export const employeeAvailabilityOverrideSchema = z.object({
  id: z.string().uuid(),
  date: employeeDateSchema,
  isUnavailable: z.boolean(),
  startTime: employeeLocalTimeSchema.nullable(),
  endTime: employeeLocalTimeSchema.nullable(),
  crossesMidnight: z.boolean(),
  sortIndex: z.number().int().min(0).max(999),
  note: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type EmployeeAvailabilityOverride = z.infer<
  typeof employeeAvailabilityOverrideSchema
>;

export const employeeListItemSchema = z.object({
  id: z.string().uuid(),
  employeeNo: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  status: employeeStatusSchema,
  employmentType: employeeEmploymentTypeSchema,
  displayName: z.string(),
  roleLabel: z.string().nullable(),
  city: z.string().nullable(),
  hasGeo: z.boolean(),
  archivedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type EmployeeListItem = z.infer<typeof employeeListItemSchema>;

export const employeesListPermissionsSchema = z.object({
  canEdit: z.boolean(),
});

export const employeesListResponseSchema = z.object({
  employees: z.array(employeeListItemSchema),
  total: z.number().int().nonnegative(),
  permissions: employeesListPermissionsSchema,
});

export const employeesBatchArchiveRequestSchema = z.object({
  employeeIds: z.array(z.string().uuid()).min(1).max(200),
  archived: z.boolean(),
});

export type EmployeesBatchArchiveRequest = z.infer<
  typeof employeesBatchArchiveRequestSchema
>;

export const employeesBatchArchiveResponseSchema = z.object({
  updated: z.number().int().nonnegative(),
  notFoundIds: z.array(z.string().uuid()).optional(),
});

export type EmployeesBatchArchiveResponse = z.infer<
  typeof employeesBatchArchiveResponseSchema
>;

export const employeeSkillSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  archivedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type EmployeeSkill = z.infer<typeof employeeSkillSchema>;

export const employeeSkillCatalogCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export type EmployeeSkillCatalogCreateInput = z.infer<
  typeof employeeSkillCatalogCreateSchema
>;

export const employeeSkillCatalogListResponseSchema = z.object({
  skills: z.array(employeeSkillSchema),
});

export type EmployeeSkillCatalogListResponse = z.infer<
  typeof employeeSkillCatalogListResponseSchema
>;

export const employeeSkillLinksPatchSchema = z.object({
  skillIds: z.array(z.string().uuid()).max(200),
});

export type EmployeeSkillLinksPatchInput = z.infer<
  typeof employeeSkillLinksPatchSchema
>;

export const employeeSkillLinksResponseSchema = z.object({
  selectedSkillIds: z.array(z.string().uuid()),
});

export type EmployeeSkillLinksResponse = z.infer<
  typeof employeeSkillLinksResponseSchema
>;

export const employeeRelationshipSchema = z.object({
  id: z.string().uuid(),
  fromEmployeeId: z.string().uuid(),
  toEmployeeId: z.string().uuid(),
  kind: employeeRelationshipKindSchema,
  note: z.string().nullable(),
  counterpartDisplayName: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type EmployeeRelationship = z.infer<typeof employeeRelationshipSchema>;

export const employeeRelationshipsListResponseSchema = z.object({
  relationships: z.array(employeeRelationshipSchema),
});

export type EmployeeRelationshipsListResponse = z.infer<
  typeof employeeRelationshipsListResponseSchema
>;

export const employeeRelationshipUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  toEmployeeId: z.string().uuid(),
  kind: employeeRelationshipKindSchema,
  note: z.union([z.string().trim().max(400), z.null()]).optional().default(null),
});

export type EmployeeRelationshipUpsertInput = z.infer<
  typeof employeeRelationshipUpsertSchema
>;

export const employeeAttachmentSchema = z.object({
  id: z.string().uuid(),
  employeeId: z.string().uuid(),
  kind: employeeAttachmentKindSchema,
  filename: z.string(),
  contentType: z.string(),
  byteSize: z.number().int().nonnegative(),
  sha256: z.string().nullable(),
  createdAt: z.string(),
});

export type EmployeeAttachment = z.infer<typeof employeeAttachmentSchema>;

export const employeeAttachmentsListResponseSchema = z.object({
  attachments: z.array(employeeAttachmentSchema),
});

export type EmployeeAttachmentsListResponse = z.infer<
  typeof employeeAttachmentsListResponseSchema
>;

export const employeeProfileImageResponseSchema = z.object({
  hasProfileImage: z.boolean(),
  contentType: z.string().nullable(),
});

export type EmployeeProfileImageResponse = z.infer<
  typeof employeeProfileImageResponseSchema
>;

export const employeeDetailSchema = z.object({
  id: z.string().uuid(),
  employeeNo: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  status: employeeStatusSchema,
  employmentType: employeeEmploymentTypeSchema,
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
  profileImageContentType: z.string().nullable(),
  hasProfileImage: z.boolean(),
  archivedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  availabilityTimeZone: employeeTimeZoneSchema,
  availability: z.array(employeeAvailabilityRuleSchema),
  availabilityOverrides: z.array(employeeAvailabilityOverrideSchema),
});

export type EmployeeDetail = z.infer<typeof employeeDetailSchema>;

export const employeePermissionsSchema = z.object({
  canEdit: z.boolean(),
  canDelete: z.boolean(),
  canDecideVacation: z.boolean(),
  canViewSickConfidential: z.boolean(),
  canCreateSickConfidential: z.boolean(),
});

export type EmployeePermissions = z.infer<typeof employeePermissionsSchema>;

export const employeeDetailResponseSchema = z.object({
  employee: employeeDetailSchema,
  permissions: employeePermissionsSchema,
});

export const employeeCreateSchema = z
  .object({
    employeeNo: optionalShortText(50).optional().default(null),
    firstName: optionalShortText(200).optional().default(null),
    lastName: optionalShortText(200).optional().default(null),
    email: optionalEmail.optional().default(null),
    phone: optionalShortText(60).optional().default(null),
    status: employeeStatusSchema.optional().default("ACTIVE"),
    employmentType: employeeEmploymentTypeSchema.optional().default("FULL_TIME"),
    availabilityTimeZone: employeeTimeZoneSchema
      .optional()
      .default("Europe/Berlin"),
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
    availabilityOverrides: z
      .array(employeeAvailabilityOverrideInputSchema)
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
    employeeNo: optionalShortText(50).optional(),
    firstName: optionalShortText(200).optional(),
    lastName: optionalShortText(200).optional(),
    email: optionalEmail.optional(),
    phone: optionalShortText(60).optional(),
    status: employeeStatusSchema.optional(),
    employmentType: employeeEmploymentTypeSchema.optional(),
    availabilityTimeZone: employeeTimeZoneSchema.optional(),
    displayName: z.string().trim().min(1).max(400).optional(),
    roleLabel: z.union([z.string().trim().max(200), z.null()]).optional(),
    notes: optionalTrimmedText.optional(),
    archived: z.boolean().optional(),
    availability: z.array(employeeAvailabilityRuleInputSchema).optional(),
    availabilityOverrides: z
      .array(employeeAvailabilityOverrideInputSchema)
      .optional(),
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

export const employeeVacationStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
]);

export type EmployeeVacationStatus = z.infer<typeof employeeVacationStatusSchema>;

export const employeeVacationRequestSchema = z.object({
  id: z.string().uuid(),
  employeeId: z.string().uuid(),
  fromDate: employeeDateSchema,
  toDate: employeeDateSchema,
  reason: z.string().nullable(),
  status: employeeVacationStatusSchema,
  decisionNote: z.string().nullable(),
  decidedBy: z.string().nullable(),
  decidedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type EmployeeVacationRequest = z.infer<typeof employeeVacationRequestSchema>;

export const employeeVacationListResponseSchema = z.object({
  requests: z.array(employeeVacationRequestSchema),
  permissions: z.object({
    canDecide: z.boolean(),
  }),
});

export const employeeVacationCreateSchema = z
  .object({
    fromDate: employeeDateSchema,
    toDate: employeeDateSchema,
    reason: optionalTrimmedText.optional().default(null),
  })
  .superRefine((v, ctx) => {
    if (v.toDate < v.fromDate) {
      ctx.addIssue({
        code: "custom",
        message: "date_order",
        path: ["toDate"],
      });
    }
  });

export type EmployeeVacationCreateInput = z.infer<typeof employeeVacationCreateSchema>;

export const employeeVacationDecisionPatchSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  decisionNote: optionalTrimmedText.optional().default(null),
});

export type EmployeeVacationDecisionPatchInput = z.infer<
  typeof employeeVacationDecisionPatchSchema
>;

export const employeeSickReportSchema = z.object({
  id: z.string().uuid(),
  employeeId: z.string().uuid(),
  fromDate: employeeDateSchema,
  toDate: employeeDateSchema,
  confidentialNote: z.string().nullable(),
  confidentialNoteRedacted: z.boolean(),
  certificateRequired: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type EmployeeSickReport = z.infer<typeof employeeSickReportSchema>;

export const employeeSickListResponseSchema = z.object({
  reports: z.array(employeeSickReportSchema),
  permissions: z.object({
    canViewConfidential: z.boolean(),
    canCreateConfidential: z.boolean(),
  }),
});

export const employeeSickCreateSchema = z
  .object({
    fromDate: employeeDateSchema,
    toDate: employeeDateSchema,
    confidentialNote: optionalTrimmedText.optional().default(null),
    certificateRequired: z.boolean().optional().default(false),
  })
  .superRefine((v, ctx) => {
    if (v.toDate < v.fromDate) {
      ctx.addIssue({
        code: "custom",
        message: "date_order",
        path: ["toDate"],
      });
    }
  });

export type EmployeeSickCreateInput = z.infer<typeof employeeSickCreateSchema>;

export const employeeActivityActionSchema = z.enum([
  "employee_created",
  "employee_updated",
  "employee_deleted",
  "employee_skills_updated",
  "employee_relationship_upserted",
  "employee_relationship_deleted",
  "employee_profile_image_updated",
  "employee_profile_image_deleted",
  "employee_attachment_uploaded",
  "employee_attachment_deleted",
  "vacation_requested",
  "vacation_decided",
  "sick_report_created",
]);

export type EmployeeActivityAction = z.infer<typeof employeeActivityActionSchema>;

export const employeeActivityEventSchema = z.object({
  id: z.string().uuid(),
  action: employeeActivityActionSchema,
  actorSub: z.string(),
  detail: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string(),
});

export type EmployeeActivityEvent = z.infer<typeof employeeActivityEventSchema>;

export const employeeActivityListResponseSchema = z.object({
  events: z.array(employeeActivityEventSchema),
});

export type EmployeeActivityListResponse = z.infer<
  typeof employeeActivityListResponseSchema
>;
