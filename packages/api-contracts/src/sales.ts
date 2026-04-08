import { z } from "zod";

export const salesQuoteStatusSchema = z.enum([
  "draft",
  "sent",
  "accepted",
  "rejected",
  "expired",
]);

export type SalesQuoteStatus = z.infer<typeof salesQuoteStatusSchema>;

export const SALES_QUOTE_STATUS_OPTIONS: readonly SalesQuoteStatus[] =
  salesQuoteStatusSchema.options;

export const salesInvoiceStatusSchema = z.enum([
  "draft",
  "sent",
  "paid",
  "overdue",
  "cancelled",
]);

export type SalesInvoiceStatus = z.infer<typeof salesInvoiceStatusSchema>;

export const SALES_INVOICE_STATUS_OPTIONS: readonly SalesInvoiceStatus[] =
  salesInvoiceStatusSchema.options;

export const salesInvoiceBillingTypeSchema = z.enum([
  "invoice",
  "partial",
  "final",
  "credit_note",
]);

export type SalesInvoiceBillingType = z.infer<
  typeof salesInvoiceBillingTypeSchema
>;

const optionalUuidOrNull = z.union([z.string().uuid(), z.null()]).optional();

const optionalInstantOrNull = z.union([z.string(), z.null()]).optional();

export const salesCreateQuoteSchema = z.object({
  documentNumber: z.string().trim().min(1).max(80),
  customerLabel: z.string().trim().min(1).max(400),
  status: salesQuoteStatusSchema.default("draft"),
  currency: z.string().length(3).default("EUR"),
  totalCents: z.number().int().min(0).max(1_000_000_000_000),
  validUntil: optionalInstantOrNull,
  projectId: optionalUuidOrNull,
  customerId: optionalUuidOrNull,
});

export type SalesCreateQuoteInput = z.infer<typeof salesCreateQuoteSchema>;

export const salesPatchQuoteSchema = salesCreateQuoteSchema.partial();

export type SalesPatchQuoteInput = z.infer<typeof salesPatchQuoteSchema>;

export const salesCreateInvoiceSchema = z.object({
  documentNumber: z.string().trim().min(1).max(80),
  customerLabel: z.string().trim().min(1).max(400),
  status: salesInvoiceStatusSchema.default("draft"),
  billingType: salesInvoiceBillingTypeSchema.default("invoice"),
  currency: z.string().length(3).default("EUR"),
  totalCents: z.number().int().min(0).max(1_000_000_000_000),
  quoteId: optionalUuidOrNull,
  parentInvoiceId: optionalUuidOrNull,
  creditForInvoiceId: optionalUuidOrNull,
  projectId: optionalUuidOrNull,
  issuedAt: optionalInstantOrNull,
  dueAt: optionalInstantOrNull,
  paidAt: optionalInstantOrNull,
  customerId: optionalUuidOrNull,
  /** Rabatt auf Summe der Positions-Bruttobeträge (Basispunkte, z. B. 500 = 5 %). */
  headerDiscountBps: z.number().int().min(0).max(10_000).optional().default(0),
});

export type SalesCreateInvoiceInput = z.infer<typeof salesCreateInvoiceSchema>;

/** Body für POST /v1/sales/quotes/:quoteId/invoices — Kopf-/Währung kommen vom Angebot. */
export const salesCreateInvoiceFromQuoteSchema = z.object({
  documentNumber: z.string().trim().min(1).max(80),
  status: salesInvoiceStatusSchema.default("draft"),
  billingType: salesInvoiceBillingTypeSchema.default("invoice"),
  parentInvoiceId: optionalUuidOrNull,
  creditForInvoiceId: optionalUuidOrNull,
  issuedAt: optionalInstantOrNull,
  dueAt: optionalInstantOrNull,
  paidAt: optionalInstantOrNull,
  headerDiscountBps: z.number().int().min(0).max(10_000).optional().default(0),
});

export type SalesCreateInvoiceFromQuoteInput = z.infer<
  typeof salesCreateInvoiceFromQuoteSchema
>;

export const salesPatchInvoiceSchema = salesCreateInvoiceSchema.partial();

export type SalesPatchInvoiceInput = z.infer<typeof salesPatchInvoiceSchema>;

export const salesQuoteListItemSchema = z.object({
  id: z.string().uuid(),
  documentNumber: z.string(),
  customerLabel: z.string(),
  customerId: z.string().uuid().nullable(),
  projectId: z.string().uuid().nullable(),
  status: z.string(),
  currency: z.string(),
  totalCents: z.number().int(),
  validUntil: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type SalesQuoteListItem = z.infer<typeof salesQuoteListItemSchema>;

export const salesListSortDirSchema = z.enum(["asc", "desc"]);

export type SalesListSortDir = z.infer<typeof salesListSortDirSchema>;

export const salesQuotesSortBySchema = z.enum([
  "documentNumber",
  "customerLabel",
  "status",
  "totalCents",
  "validUntil",
  "updatedAt",
]);

export type SalesQuotesSortBy = z.infer<typeof salesQuotesSortBySchema>;

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

export const salesQuotesListQuerySchema = z.object({
  q: z.string().trim().optional(),
  status: salesQuoteStatusSchema.optional(),
  dateFrom: isoDate.optional(),
  dateTo: isoDate.optional(),
  projectId: z.string().uuid().optional(),
  sortBy: salesQuotesSortBySchema.optional(),
  sortDir: salesListSortDirSchema.optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
});

export type SalesQuotesListQuery = z.infer<typeof salesQuotesListQuerySchema>;

export const salesListPermissionsSchema = z.object({
  canEdit: z.boolean(),
  canArchive: z.boolean(),
  canExport: z.boolean(),
  canBatch: z.boolean(),
});

export type SalesListPermissions = z.infer<typeof salesListPermissionsSchema>;

export const salesQuotesListResponseSchema = z.object({
  quotes: z.array(salesQuoteListItemSchema),
  total: z.number().int().nonnegative(),
  permissions: salesListPermissionsSchema,
});

export const salesDocumentLineSchema = z.object({
  id: z.string().uuid(),
  sortIndex: z.number().int(),
  description: z.string(),
  quantity: z.string().nullable(),
  unit: z.string().nullable(),
  unitPriceCents: z.number().int(),
  lineTotalCents: z.number().int(),
  taxRateBps: z.number().int().min(0).max(10_000).default(1900),
  discountBps: z.number().int().min(0).max(10_000).default(0),
  /** gesetzt, wenn die Zeile aus dem Lieferanten-Katalog übernommen wurde */
  catalogArticleId: z.string().uuid().nullable().optional(),
});

export type SalesDocumentLine = z.infer<typeof salesDocumentLineSchema>;

export const salesCreateQuoteLineSchema = z.object({
  description: z.string().trim().min(1).max(2000),
  quantity: z.string().max(40).nullable().optional(),
  unit: z.string().max(40).nullable().optional(),
  unitPriceCents: z.number().int().min(0).optional().default(0),
  lineTotalCents: z.number().int().min(0),
  taxRateBps: z.number().int().min(0).max(10_000).optional().default(1900),
  discountBps: z.number().int().min(0).max(10_000).optional().default(0),
  catalogArticleId: z.string().uuid().optional(),
});

export type SalesCreateQuoteLineInput = z.infer<typeof salesCreateQuoteLineSchema>;

export const salesPatchQuoteLineSchema = salesCreateQuoteLineSchema
  .partial()
  .extend({
    sortIndex: z.number().int().min(0).max(1_000_000).optional(),
    catalogArticleId: z.union([z.string().uuid(), z.null()]).optional(),
  });

export type SalesPatchQuoteLineInput = z.infer<typeof salesPatchQuoteLineSchema>;

export const salesCreateInvoiceLineSchema = salesCreateQuoteLineSchema;

export const salesPatchInvoiceLineSchema = salesPatchQuoteLineSchema;

/** PUT …/lines/reorder — `lineIds` exakt die gleiche Menge wie DB-Zeilen, neue Reihenfolge. */
export const salesReorderDocumentLinesSchema = z.object({
  lineIds: z
    .array(z.string().uuid())
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "lineIds must be unique",
    }),
});

export type SalesReorderDocumentLinesInput = z.infer<
  typeof salesReorderDocumentLinesSchema
>;

export const salesQuoteDetailSchema = salesQuoteListItemSchema.extend({
  projectId: z.string().uuid().nullable(),
  lines: z.array(salesDocumentLineSchema),
});

export const salesQuoteDetailResponseSchema = z.object({
  quote: salesQuoteDetailSchema,
});

export const salesInvoiceListItemSchema = z.object({
  id: z.string().uuid(),
  documentNumber: z.string(),
  customerLabel: z.string(),
  customerId: z.string().uuid().nullable(),
  projectId: z.string().uuid().nullable(),
  status: z.string(),
  billingType: salesInvoiceBillingTypeSchema.default("invoice"),
  parentInvoiceId: z.string().uuid().nullable().default(null),
  creditForInvoiceId: z.string().uuid().nullable().default(null),
  currency: z.string(),
  totalCents: z.number().int(),
  headerDiscountBps: z.number().int().min(0).max(10_000).default(0),
  issuedAt: z.string().nullable(),
  dueAt: z.string().nullable(),
  paidAt: z.string().nullable(),
  isFinalized: z.boolean().default(false),
  finalizedAt: z.string().nullable().default(null),
  snapshotHash: z.string().nullable().default(null),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type SalesInvoiceListItem = z.infer<typeof salesInvoiceListItemSchema>;

export const salesInvoicesSortBySchema = z.enum([
  "documentNumber",
  "customerLabel",
  "status",
  "totalCents",
  "dueAt",
  "updatedAt",
]);

export type SalesInvoicesSortBy = z.infer<typeof salesInvoicesSortBySchema>;

export const salesInvoicesListQuerySchema = z.object({
  q: z.string().trim().optional(),
  status: salesInvoiceStatusSchema.optional(),
  dateFrom: isoDate.optional(),
  dateTo: isoDate.optional(),
  projectId: z.string().uuid().optional(),
  sortBy: salesInvoicesSortBySchema.optional(),
  sortDir: salesListSortDirSchema.optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
});

export type SalesInvoicesListQuery = z.infer<typeof salesInvoicesListQuerySchema>;

export const salesInvoicesListResponseSchema = z.object({
  invoices: z.array(salesInvoiceListItemSchema),
  total: z.number().int().nonnegative(),
  permissions: salesListPermissionsSchema,
});

/** Rechnungen mit positivem offenen Saldo (OP-Liste). */
export const salesOpenInvoiceListItemSchema = salesInvoiceListItemSchema.extend({
  paidTotalCents: z.number().int().nonnegative(),
  balanceCents: z.number().int(),
});

export type SalesOpenInvoiceListItem = z.infer<
  typeof salesOpenInvoiceListItemSchema
>;

export const salesOpenInvoicesSortBySchema = z.enum([
  "documentNumber",
  "customerLabel",
  "dueAt",
  "totalCents",
  "balanceCents",
  "updatedAt",
]);

export type SalesOpenInvoicesSortBy = z.infer<
  typeof salesOpenInvoicesSortBySchema
>;

export const salesOpenInvoicesListQuerySchema = z.object({
  q: z.string().trim().optional(),
  projectId: z.string().uuid().optional(),
  sortBy: salesOpenInvoicesSortBySchema.optional(),
  sortDir: salesListSortDirSchema.optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
});

export type SalesOpenInvoicesListQuery = z.infer<
  typeof salesOpenInvoicesListQuerySchema
>;

export const salesOpenInvoicesListResponseSchema = z.object({
  invoices: z.array(salesOpenInvoiceListItemSchema),
  total: z.number().int().nonnegative(),
  permissions: salesListPermissionsSchema,
});

export const salesInvoicePaymentSchema = z.object({
  id: z.string().uuid(),
  amountCents: z.number().int().positive(),
  paidAt: z.string(),
  note: z.string().nullable(),
  createdAt: z.string(),
});

export type SalesInvoicePayment = z.infer<typeof salesInvoicePaymentSchema>;

export const salesInvoiceReminderChannelSchema = z.enum(["manual", "email"]);

export type SalesInvoiceReminderChannel = z.infer<
  typeof salesInvoiceReminderChannelSchema
>;

export const salesInvoiceReminderSchema = z.object({
  id: z.string().uuid(),
  level: z.number().int().min(1).max(10),
  sentAt: z.string(),
  channel: salesInvoiceReminderChannelSchema,
  note: z.string().nullable(),
  createdAt: z.string(),
});

export type SalesInvoiceReminder = z.infer<typeof salesInvoiceReminderSchema>;

/** Body für POST /v1/sales/invoices/:id/payments */
export const salesCreateInvoicePaymentSchema = z.object({
  amountCents: z.number().int().min(1).max(1_000_000_000_000),
  /** ISO-8601 (z. B. aus datetime-local via Mittag UTC). */
  paidAt: z.string().trim().min(1),
  note: z.string().trim().max(2000).nullable().optional(),
});

export type SalesCreateInvoicePaymentInput = z.infer<
  typeof salesCreateInvoicePaymentSchema
>;

/** Body für POST /v1/sales/invoices/payments/batch */
export const salesBatchInvoicePaymentItemSchema = z.object({
  invoiceId: z.string().uuid(),
  amountCents: z.number().int().min(1).max(1_000_000_000_000),
  note: z.string().trim().max(2000).nullable().optional(),
});

export type SalesBatchInvoicePaymentItem = z.infer<
  typeof salesBatchInvoicePaymentItemSchema
>;

export const salesCreateBatchInvoicePaymentsSchema = z.object({
  /** ISO-8601 (z. B. aus date input via Mittag UTC). */
  paidAt: z.string().trim().min(1),
  note: z.string().trim().max(2000).nullable().optional(),
  allocations: z.array(salesBatchInvoicePaymentItemSchema).min(1).max(100),
});

export type SalesCreateBatchInvoicePaymentsInput = z.infer<
  typeof salesCreateBatchInvoicePaymentsSchema
>;

export const salesBatchInvoicePaymentCreatedSchema = z.object({
  paymentId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  amountCents: z.number().int().positive(),
});

export type SalesBatchInvoicePaymentCreated = z.infer<
  typeof salesBatchInvoicePaymentCreatedSchema
>;

export const salesBatchInvoicePaymentsResponseSchema = z.object({
  created: z.array(salesBatchInvoicePaymentCreatedSchema),
  invoiceIds: z.array(z.string().uuid()),
  totalAmountCents: z.number().int().positive(),
});

export type SalesBatchInvoicePaymentsResponse = z.infer<
  typeof salesBatchInvoicePaymentsResponseSchema
>;

/** CAMT-/Kontoauszug-Zeile als Input für Zuordnungsvorschläge auf OP-Rechnungen. */
export const salesCamtMatchRequestSchema = z.object({
  amountCents: z.number().int().min(1).max(1_000_000_000_000),
  /** ISO-8601 (Buchungsdatum). */
  paidAt: z.string().trim().min(1),
  remittanceInfo: z.string().trim().max(4000).optional(),
  debtorName: z.string().trim().max(400).optional(),
  candidateLimit: z.number().int().min(1).max(20).optional(),
});

export type SalesCamtMatchRequest = z.infer<typeof salesCamtMatchRequestSchema>;

export const salesCamtMatchConfidenceSchema = z.enum(["high", "medium", "low"]);

export type SalesCamtMatchConfidence = z.infer<
  typeof salesCamtMatchConfidenceSchema
>;

export const salesCamtMatchCandidateSchema = z.object({
  invoiceId: z.string().uuid(),
  documentNumber: z.string(),
  customerLabel: z.string(),
  currency: z.string(),
  balanceCents: z.number().int(),
  dueAt: z.string().nullable(),
  score: z.number().int(),
  confidence: salesCamtMatchConfidenceSchema,
  reasons: z.array(z.string()),
});

export type SalesCamtMatchCandidate = z.infer<
  typeof salesCamtMatchCandidateSchema
>;

export const salesCamtMatchResponseSchema = z.object({
  matches: z.array(salesCamtMatchCandidateSchema),
  suggestedInvoiceId: z.string().uuid().nullable(),
});

export type SalesCamtMatchResponse = z.infer<typeof salesCamtMatchResponseSchema>;

export const salesCamtCdtDbtIndSchema = z.enum(["CRDT", "DBIT", "UNKNOWN"]);

export const salesCamtImportEntrySchema = z.object({
  lineIndex: z.number().int().nonnegative(),
  cdtDbtInd: salesCamtCdtDbtIndSchema,
  amountCents: z.number().int(),
  currency: z.string(),
  bookingDate: z.string().nullable(),
  paidAtIso: z.string().nullable(),
  remittanceInfo: z.string(),
  debtorName: z.string(),
  skipped: z.boolean(),
  skipReason: z.enum(["not_credit", "no_amount"]).optional(),
  matches: z.array(salesCamtMatchCandidateSchema),
  suggestedInvoiceId: z.string().uuid().nullable(),
});

export type SalesCamtImportEntry = z.infer<typeof salesCamtImportEntrySchema>;

export const salesCamtImportResponseSchema = z.object({
  parseWarnings: z.array(z.string()),
  candidateLimit: z.number().int().min(1).max(20),
  entries: z.array(salesCamtImportEntrySchema),
});

export type SalesCamtImportResponse = z.infer<typeof salesCamtImportResponseSchema>;

export const salesCamtImportBatchSummarySchema = z.object({
  id: z.string().uuid(),
  filename: z.string().nullable(),
  fileSha256: z.string(),
  entryCount: z.number().int().nonnegative(),
  createdAt: z.string(),
});

export type SalesCamtImportBatchSummary = z.infer<
  typeof salesCamtImportBatchSummarySchema
>;

export const salesCamtImportBatchesListResponseSchema = z.object({
  batches: z.array(salesCamtImportBatchSummarySchema),
});

export type SalesCamtImportBatchesListResponse = z.infer<
  typeof salesCamtImportBatchesListResponseSchema
>;

export const salesCamtImportBatchDetailResponseSchema = z.object({
  batch: salesCamtImportBatchSummarySchema,
  parseWarnings: z.array(z.string()),
  candidateLimit: z.number().int().min(1).max(20),
  entries: z.array(salesCamtImportEntrySchema),
});

export type SalesCamtImportBatchDetailResponse = z.infer<
  typeof salesCamtImportBatchDetailResponseSchema
>;

/** Body für POST /v1/sales/invoices/:id/reminders */
export const salesCreateInvoiceReminderSchema = z.object({
  level: z.number().int().min(1).max(10),
  /** ISO-8601 (z. B. aus date input via Mittag UTC). */
  sentAt: z.string().trim().min(1),
  channel: salesInvoiceReminderChannelSchema.optional().default("manual"),
  note: z.string().trim().max(2000).nullable().optional(),
});

export type SalesCreateInvoiceReminderInput = z.infer<
  typeof salesCreateInvoiceReminderSchema
>;

export const salesInvoiceDetailSchema = salesInvoiceListItemSchema.extend({
  quoteId: z.string().uuid().nullable(),
  projectId: z.string().uuid().nullable(),
  lines: z.array(salesDocumentLineSchema),
  payments: z.array(salesInvoicePaymentSchema),
  reminders: z.array(salesInvoiceReminderSchema).default([]),
  /** Summe der Zahlungszeilen; ohne Zeilen aber Legacy „bezahlt“: gleich totalCents. */
  paidTotalCents: z.number().int().nonnegative(),
  /** totalCents − paidTotalCents (kann negativ sein bei Datenfehlern). */
  balanceCents: z.number().int(),
  taxBreakdown: z
    .array(
      z.object({
        taxRateBps: z.number().int().min(0).max(10_000),
        netCents: z.number().int(),
        taxCents: z.number().int(),
        grossCents: z.number().int(),
      }),
    )
    .default([]),
});

export const salesInvoiceDetailResponseSchema = z.object({
  invoice: salesInvoiceDetailSchema,
});

/** Technischer Spike: manuelles Testen von Reminder-E-Mail ohne Auto-Lauf. */
export const salesReminderEmailSpikeRequestSchema = z.object({
  to: z.string().trim().email(),
  locale: z.enum(["de", "en"]).optional(),
  dryRun: z.boolean().optional(),
});

export type SalesReminderEmailSpikeRequest = z.infer<
  typeof salesReminderEmailSpikeRequestSchema
>;

export const salesReminderEmailSpikeResponseSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  bodyText: z.string(),
  smtpConfigured: z.boolean(),
  dryRun: z.boolean(),
  delivered: z.boolean(),
});

export type SalesReminderEmailSpikeResponse = z.infer<
  typeof salesReminderEmailSpikeResponseSchema
>;

/** POST /v1/sales/invoices/:id/reminders/:reminderId/email-jobs */
export const salesReminderEmailJobCreateSchema = z.object({
  to: z.string().trim().email(),
  subject: z.string().trim().min(1).max(500),
  bodyText: z.string().min(1).max(200_000),
  locale: z.enum(["de", "en"]),
});

export type SalesReminderEmailJobCreateInput = z.infer<
  typeof salesReminderEmailJobCreateSchema
>;

export const salesReminderEmailJobStatusSchema = z.enum([
  "pending",
  "processing",
  "sent",
  "failed",
]);

export type SalesReminderEmailJobStatus = z.infer<
  typeof salesReminderEmailJobStatusSchema
>;

export const salesReminderEmailJobRecordSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string(),
  invoiceId: z.string().uuid(),
  reminderId: z.string().uuid(),
  toEmail: z.string().email(),
  subject: z.string(),
  bodyText: z.string(),
  locale: z.enum(["de", "en"]),
  status: salesReminderEmailJobStatusSchema,
  attempts: z.number().int().nonnegative(),
  maxAttempts: z.number().int().positive(),
  lastError: z.string().nullable(),
  createdBySub: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  sentAt: z.string().nullable(),
});

export type SalesReminderEmailJobRecord = z.infer<
  typeof salesReminderEmailJobRecordSchema
>;

export const salesReminderEmailJobsListResponseSchema = z.object({
  jobs: z.array(salesReminderEmailJobRecordSchema),
});

/** PATCH /v1/sales/reminder-email-jobs/:jobId */
export const salesReminderEmailJobPatchSchema = z.object({
  status: z.enum(["sent", "failed"]),
  lastError: z.string().max(8000).nullable().optional(),
});

export type SalesReminderEmailJobPatchInput = z.infer<
  typeof salesReminderEmailJobPatchSchema
>;

export const salesReminderEmailJobCreateResponseSchema = z.object({
  job: salesReminderEmailJobRecordSchema,
});

/** POST /v1/sales/reminder-email-jobs/:jobId/retry */
export const salesReminderEmailJobRetryResponseSchema = z.object({
  job: salesReminderEmailJobRecordSchema,
});

/** POST /v1/sales/reminder-email-jobs/:jobId/replay */
export const salesReminderEmailJobReplayResponseSchema = z.object({
  replayedFromJobId: z.string().uuid(),
  job: salesReminderEmailJobRecordSchema,
});

export type SalesReminderEmailJobReplayResponse = z.infer<
  typeof salesReminderEmailJobReplayResponseSchema
>;

/** POST /v1/sales/reminder-email-jobs/process */
export const salesReminderEmailJobsProcessRequestSchema = z.object({
  jobId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export type SalesReminderEmailJobsProcessRequest = z.infer<
  typeof salesReminderEmailJobsProcessRequestSchema
>;

export const salesReminderEmailJobsProcessResponseSchema = z.object({
  processed: z.number().int().nonnegative(),
  sent: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  jobs: z.array(salesReminderEmailJobRecordSchema),
});

export type SalesReminderEmailJobsProcessResponse = z.infer<
  typeof salesReminderEmailJobsProcessResponseSchema
>;

/** GET /v1/sales/reminder-email-jobs/metrics */
export const salesReminderEmailJobsMetricsResponseSchema = z.object({
  pending: z.number().int().nonnegative(),
  sent: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  oldestPendingCreatedAt: z.string().nullable(),
  latestFailedAt: z.string().nullable(),
  latestFailedError: z.string().nullable(),
  latestActivityAt: z.string().nullable(),
  latestActivityStatus: z.enum(["pending", "processing", "sent", "failed"]).nullable(),
  latestActivityAttempts: z.number().int().nonnegative().nullable(),
});

export type SalesReminderEmailJobsMetricsResponse = z.infer<
  typeof salesReminderEmailJobsMetricsResponseSchema
>;

/** GET /v1/sales/reminder-email-jobs — Query (tenant ops view). */
export const salesReminderEmailJobsTenantListQuerySchema = z.object({
  status: salesReminderEmailJobStatusSchema.optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
});

export type SalesReminderEmailJobsTenantListQuery = z.infer<
  typeof salesReminderEmailJobsTenantListQuerySchema
>;

/** GET /v1/sales/reminder-email-jobs — Records without full bodyText. */
export const salesReminderEmailJobOpsRecordSchema = z.object({
  id: z.string().uuid(),
  invoice: z.object({
    id: z.string().uuid(),
    documentNumber: z.string(),
    customerLabel: z.string(),
    projectId: z.string().uuid().nullable(),
  }),
  reminder: z.object({
    id: z.string().uuid(),
    level: z.number().int().min(1).max(10),
    sentAt: z.string(),
  }),
  toEmail: z.string().email(),
  subject: z.string(),
  locale: z.enum(["de", "en"]),
  status: salesReminderEmailJobStatusSchema,
  attempts: z.number().int().nonnegative(),
  maxAttempts: z.number().int().positive(),
  lastError: z.string().nullable(),
  createdBySub: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  sentAt: z.string().nullable(),
});

export type SalesReminderEmailJobOpsRecord = z.infer<
  typeof salesReminderEmailJobOpsRecordSchema
>;

export const salesReminderEmailJobsTenantListResponseSchema = z.object({
  jobs: z.array(salesReminderEmailJobOpsRecordSchema),
  total: z.number().int().nonnegative(),
});

export type SalesReminderEmailJobsTenantListResponse = z.infer<
  typeof salesReminderEmailJobsTenantListResponseSchema
>;

/** BFF: Produktivpfad mit Outbox-Audit (ersetzt reinen Spike bei Versand). */
export const salesReminderEmailQueueResponseSchema =
  salesReminderEmailSpikeResponseSchema.extend({
    jobId: z.string().uuid().optional(),
    deliveryAttempts: z.number().int().nonnegative().optional(),
  });

export type SalesReminderEmailQueueResponse = z.infer<
  typeof salesReminderEmailQueueResponseSchema
>;
