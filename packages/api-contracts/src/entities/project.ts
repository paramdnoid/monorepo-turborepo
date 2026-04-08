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

const projectHubQuoteSchema = z.object({
  id: z.string().uuid(),
  documentNumber: z.string(),
  status: z.string(),
  currency: z.string(),
  totalCents: z.number().int(),
  updatedAt: z.string(),
});

const projectHubInvoiceSchema = z.object({
  id: z.string().uuid(),
  documentNumber: z.string(),
  status: z.string(),
  billingType: z.enum(["invoice", "partial", "final", "credit_note"]),
  currency: z.string(),
  totalCents: z.number().int(),
  dueAt: z.string().nullable(),
  updatedAt: z.string(),
});

const projectHubAssetSchema = z.object({
  id: z.string().uuid(),
  filename: z.string(),
  kind: z.enum(["plan", "photo", "document", "other"]),
  byteSize: z.number().int(),
  createdAt: z.string(),
});

const projectHubGaebDocumentSchema = z.object({
  id: z.string().uuid(),
  filename: z.string(),
  status: z.enum(["pending_review", "failed", "approved"]),
  updatedAt: z.string(),
});

const projectHubSchedulingAssignmentSchema = z.object({
  id: z.string().uuid(),
  date: z.string(),
  startTime: z.string(),
  title: z.string(),
});

const projectHubWorkTimeEntrySchema = z.object({
  id: z.string().uuid(),
  workDate: z.string(),
  durationMinutes: z.number().int(),
  employeeName: z.string().nullable(),
  notes: z.string().nullable(),
});

const projectHubOpenItemSchema = z.object({
  id: z.string().uuid(),
  documentNumber: z.string(),
  customerLabel: z.string(),
  dueAt: z.string().nullable(),
  currency: z.string(),
  balanceCents: z.number().int(),
  reminderCount: z.number().int().nonnegative(),
  maxReminderLevel: z.number().int().nullable(),
  latestReminderId: z.string().uuid().nullable(),
});

const projectHubInvoiceChainEntrySchema = z.object({
  id: z.string().uuid(),
  documentNumber: z.string(),
  billingType: z.enum(["invoice", "partial", "final", "credit_note"]),
  totalCents: z.number().int(),
  parentInvoiceId: z.string().uuid().nullable(),
});

const projectHubInvoiceBillingChainSchema = z.object({
  rootInvoiceId: z.string().uuid(),
  rootDocumentNumber: z.string(),
  entries: z.array(projectHubInvoiceChainEntrySchema),
  chainInvoicedCents: z.number().int(),
  chainCreditNotesCents: z.number().int(),
  chainNetCents: z.number().int(),
});

export const projectHubResponseSchema = z.object({
  project: projectSchema,
  siteAddressLabel: z.string().nullable(),
  quotes: z.array(projectHubQuoteSchema),
  invoices: z.array(projectHubInvoiceSchema),
  assets: z.array(projectHubAssetSchema),
  gaebDocuments: z.array(projectHubGaebDocumentSchema),
  schedulingWeek: z.array(projectHubSchedulingAssignmentSchema),
  workTime: z.object({
    totalMinutes: z.number().int().nonnegative(),
    entries: z.array(projectHubWorkTimeEntrySchema),
  }),
  receivables: z.object({
    total: z.number().int().nonnegative(),
    invoices: z.array(projectHubOpenItemSchema),
  }),
  invoiceBillingChains: z.array(projectHubInvoiceBillingChainSchema),
  pipeline: z.object({
    quotes: z.object({
      draft: z.number().int().nonnegative(),
      sent: z.number().int().nonnegative(),
      accepted: z.number().int().nonnegative(),
      rejected: z.number().int().nonnegative(),
      expired: z.number().int().nonnegative(),
    }),
    invoices: z.object({
      draft: z.number().int().nonnegative(),
      sent: z.number().int().nonnegative(),
      overdue: z.number().int().nonnegative(),
      paid: z.number().int().nonnegative(),
    }),
    progress: z.object({
      quotesSentOrLaterPercent: z.number().nonnegative().max(100),
      quotesAcceptedPercent: z.number().nonnegative().max(100),
      quotesAcceptedFromSentPercent: z.number().nonnegative().max(100),
      invoicesIssuedPercent: z.number().nonnegative().max(100),
      invoicesPaidFromIssuedPercent: z.number().nonnegative().max(100),
      invoicesOverdueFromIssuedPercent: z.number().nonnegative().max(100),
    }),
  }),
  kpis: z.object({
    quoteCount: z.number().int().nonnegative(),
    quoteVolumeCents: z.number().int(),
    acceptedQuoteCount: z.number().int().nonnegative(),
    quoteAcceptanceRatePercent: z.number().nonnegative().max(100),
    invoiceCount: z.number().int().nonnegative(),
    invoiceVolumeCents: z.number().int(),
    paidInvoiceCount: z.number().int().nonnegative(),
    paidInvoiceRatePercent: z.number().nonnegative().max(100),
    openBalanceCents: z.number().int(),
    overdueOpenCount: z.number().int().nonnegative(),
    next7AssignmentsCount: z.number().int().nonnegative(),
    workTimeMinutesMonthToDate: z.number().int().nonnegative(),
    assetCount: z.number().int().nonnegative(),
    assetBytesTotal: z.number().int().nonnegative(),
    gaebDocumentCount: z.number().int().nonnegative(),
  }),
  segments: z.object({
    last30Days: z.object({
      quoteCount: z.number().int().nonnegative(),
      quoteVolumeCents: z.number().int(),
      acceptedQuoteCount: z.number().int().nonnegative(),
      quoteAcceptanceRatePercent: z.number().nonnegative().max(100),
      invoiceCount: z.number().int().nonnegative(),
      invoiceVolumeCents: z.number().int(),
      paidInvoiceCount: z.number().int().nonnegative(),
      paidInvoiceRatePercent: z.number().nonnegative().max(100),
      paymentReceivedCents: z.number().int(),
    }),
    previous30Days: z.object({
      quoteCount: z.number().int().nonnegative(),
      quoteVolumeCents: z.number().int(),
      acceptedQuoteCount: z.number().int().nonnegative(),
      quoteAcceptanceRatePercent: z.number().nonnegative().max(100),
      invoiceCount: z.number().int().nonnegative(),
      invoiceVolumeCents: z.number().int(),
      paidInvoiceCount: z.number().int().nonnegative(),
      paidInvoiceRatePercent: z.number().nonnegative().max(100),
      paymentReceivedCents: z.number().int(),
    }),
    trends: z.object({
      quoteCountDeltaPercent: z.number().nullable(),
      quoteVolumeDeltaPercent: z.number().nullable(),
      quoteAcceptanceRateDeltaPercent: z.number().nullable(),
      invoiceCountDeltaPercent: z.number().nullable(),
      invoiceVolumeDeltaPercent: z.number().nullable(),
      paymentReceivedDeltaPercent: z.number().nullable(),
      paidInvoiceRateDeltaPercent: z.number().nullable(),
    }),
  }),
});

export type ProjectHubResponse = z.infer<typeof projectHubResponseSchema>;
