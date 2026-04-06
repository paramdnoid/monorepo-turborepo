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
  currency: z.string().length(3).default("EUR"),
  totalCents: z.number().int().min(0).max(1_000_000_000_000),
  quoteId: optionalUuidOrNull,
  projectId: optionalUuidOrNull,
  issuedAt: optionalInstantOrNull,
  dueAt: optionalInstantOrNull,
  paidAt: optionalInstantOrNull,
  customerId: optionalUuidOrNull,
});

export type SalesCreateInvoiceInput = z.infer<typeof salesCreateInvoiceSchema>;

/** Body für POST /v1/sales/quotes/:quoteId/invoices — Kopf-/Währung kommen vom Angebot. */
export const salesCreateInvoiceFromQuoteSchema = z.object({
  documentNumber: z.string().trim().min(1).max(80),
  status: salesInvoiceStatusSchema.default("draft"),
  issuedAt: optionalInstantOrNull,
  dueAt: optionalInstantOrNull,
  paidAt: optionalInstantOrNull,
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
});

export type SalesDocumentLine = z.infer<typeof salesDocumentLineSchema>;

export const salesCreateQuoteLineSchema = z.object({
  description: z.string().trim().min(1).max(2000),
  quantity: z.string().max(40).nullable().optional(),
  unit: z.string().max(40).nullable().optional(),
  unitPriceCents: z.number().int().min(0).optional().default(0),
  lineTotalCents: z.number().int().min(0),
});

export type SalesCreateQuoteLineInput = z.infer<typeof salesCreateQuoteLineSchema>;

export const salesPatchQuoteLineSchema = salesCreateQuoteLineSchema
  .partial()
  .extend({
    sortIndex: z.number().int().min(0).max(1_000_000).optional(),
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
  currency: z.string(),
  totalCents: z.number().int(),
  issuedAt: z.string().nullable(),
  dueAt: z.string().nullable(),
  paidAt: z.string().nullable(),
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
});

export const salesInvoiceDetailResponseSchema = z.object({
  invoice: salesInvoiceDetailSchema,
});
