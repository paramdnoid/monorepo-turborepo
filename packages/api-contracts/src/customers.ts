import { z } from "zod";

export const customerAddressKindSchema = z.enum([
  "billing",
  "shipping",
  "site",
  "other",
]);

export type CustomerAddressKind = z.infer<typeof customerAddressKindSchema>;

export const CUSTOMER_ADDRESS_KIND_OPTIONS: readonly CustomerAddressKind[] =
  customerAddressKindSchema.options;

const optionalTrimmedNull = z
  .union([z.string().trim().max(4000), z.null()])
  .optional();

export const customerAddressSchema = z.object({
  id: z.string().uuid(),
  kind: customerAddressKindSchema,
  label: z.string().nullable(),
  recipientName: z.string(),
  addressLine2: z.string().nullable(),
  street: z.string(),
  postalCode: z.string(),
  city: z.string(),
  country: z.string(),
  isDefault: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CustomerAddress = z.infer<typeof customerAddressSchema>;

export const customerListItemSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  customerNumber: z.string().nullable(),
  category: z.string().nullable(),
  city: z.string().nullable(),
  archivedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CustomerListItem = z.infer<typeof customerListItemSchema>;

export const customersListResponseSchema = z.object({
  customers: z.array(customerListItemSchema),
  /** Gesamtanzahl fuer die aktuelle Filterkombination (Suche / archiviert). */
  total: z.number().int().nonnegative(),
  permissions: z.object({
    canEdit: z.boolean(),
  }),
});

/** Eine Adresszeile in der mandantenweiten Adressliste (mit Kundenbezug). */
export const customerAddressBookRowSchema = z.object({
  customerId: z.string().uuid(),
  displayName: z.string(),
  customerNumber: z.string().nullable(),
  customerArchivedAt: z.string().nullable(),
  address: customerAddressSchema,
});

export type CustomerAddressBookRow = z.infer<typeof customerAddressBookRowSchema>;

export const customersAddressesListResponseSchema = z.object({
  rows: z.array(customerAddressBookRowSchema),
  /** Gesamtanzahl fuer die aktuelle Filterkombination (Suche / archiviert). */
  total: z.number().int().nonnegative(),
  permissions: z.object({
    canEdit: z.boolean(),
  }),
});

export const customerDetailSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  customerNumber: z.string().nullable(),
  category: z.string().nullable(),
  vatId: z.string().nullable(),
  taxNumber: z.string().nullable(),
  notes: z.string().nullable(),
  /** Zahlungsziel in Tagen (Default für neue Rechnungen). */
  paymentTermsDays: z.number().int().nonnegative().nullable(),
  /** Skonto in Basispunkten (2.5% => 250). */
  cashDiscountPercentBps: z.number().int().nonnegative().nullable(),
  /** Skonto-Frist in Tagen. */
  cashDiscountDays: z.number().int().nonnegative().nullable(),
  /** Mahnung Stufe 1: Tage nach Rechnungs-Faelligkeit (`dueAt`). */
  reminderLevel1DaysAfterDue: z.number().int().nonnegative().nullable(),
  /** Mahnung Stufe 2: Tage nach Rechnungs-Faelligkeit (`dueAt`). */
  reminderLevel2DaysAfterDue: z.number().int().nonnegative().nullable(),
  /** Mahnung Stufe 3: Tage nach Rechnungs-Faelligkeit (`dueAt`). */
  reminderLevel3DaysAfterDue: z.number().int().nonnegative().nullable(),
  archivedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  addresses: z.array(customerAddressSchema),
});

export type CustomerDetail = z.infer<typeof customerDetailSchema>;

export const customerDetailResponseSchema = z.object({
  customer: customerDetailSchema,
});

const addressInputBase = z.object({
  kind: customerAddressKindSchema.default("billing"),
  label: z
    .union([z.string().trim().max(200), z.null()])
    .optional()
    .default(null),
  recipientName: z.string().trim().min(1).max(300),
  addressLine2: z
    .union([z.string().trim().max(300), z.null()])
    .optional()
    .default(null),
  street: z.string().trim().min(1).max(300),
  postalCode: z.string().trim().min(1).max(32),
  city: z.string().trim().min(1).max(120),
  country: z
    .string()
    .trim()
    .length(2)
    .regex(/^[A-Z]{2}$/)
    .default("DE"),
  isDefault: z.boolean().optional().default(false),
});

export const customerCreateAddressSchema = addressInputBase;

export const customerCreateSchema = z.object({
  displayName: z.string().trim().min(1).max(400),
  customerNumber: z
    .union([z.string().trim().max(80), z.null()])
    .optional()
    .default(null),
  category: z
    .union([z.string().trim().max(80), z.null()])
    .optional()
    .default(null),
  vatId: z.union([z.string().trim().max(80), z.null()]).optional().default(null),
  taxNumber: z
    .union([z.string().trim().max(80), z.null()])
    .optional()
    .default(null),
  notes: optionalTrimmedNull,
  paymentTermsDays: z
    .union([z.number().int().min(0).max(3650), z.null()])
    .optional()
    .default(null),
  cashDiscountPercentBps: z
    .union([z.number().int().min(0).max(10000), z.null()])
    .optional()
    .default(null),
  cashDiscountDays: z
    .union([z.number().int().min(0).max(365), z.null()])
    .optional()
    .default(null),
  reminderLevel1DaysAfterDue: z
    .union([z.number().int().min(0).max(3650), z.null()])
    .optional()
    .default(null),
  reminderLevel2DaysAfterDue: z
    .union([z.number().int().min(0).max(3650), z.null()])
    .optional()
    .default(null),
  reminderLevel3DaysAfterDue: z
    .union([z.number().int().min(0).max(3650), z.null()])
    .optional()
    .default(null),
  defaultAddress: customerCreateAddressSchema.optional(),
});

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;

export const customersBatchArchiveRequestSchema = z.object({
  customerIds: z.array(z.string().uuid()).min(1).max(500),
  archived: z.boolean().optional(),
  category: z.union([z.string().trim().max(80), z.null()]).optional(),
}).superRefine((value, ctx) => {
  if (value.archived === undefined && value.category === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "archived or category must be provided",
      path: ["archived"],
    });
  }
});

export const customersBatchArchiveResponseSchema = z.object({
  updated: z.number().int().nonnegative(),
});

export type CustomersBatchArchiveRequest = z.infer<
  typeof customersBatchArchiveRequestSchema
>;
export type CustomersBatchArchiveResponse = z.infer<
  typeof customersBatchArchiveResponseSchema
>;

export const customerPatchSchema = z.object({
  displayName: z.string().trim().min(1).max(400).optional(),
  customerNumber: z
    .union([z.string().trim().max(80), z.null()])
    .optional(),
  category: z.union([z.string().trim().max(80), z.null()]).optional(),
  vatId: z.union([z.string().trim().max(80), z.null()]).optional(),
  taxNumber: z.union([z.string().trim().max(80), z.null()]).optional(),
  notes: z.union([z.string().trim().max(8000), z.null()]).optional(),
  paymentTermsDays: z.union([z.number().int().min(0).max(3650), z.null()]).optional(),
  cashDiscountPercentBps: z
    .union([z.number().int().min(0).max(10000), z.null()])
    .optional(),
  cashDiscountDays: z.union([z.number().int().min(0).max(365), z.null()]).optional(),
  reminderLevel1DaysAfterDue: z
    .union([z.number().int().min(0).max(3650), z.null()])
    .optional(),
  reminderLevel2DaysAfterDue: z
    .union([z.number().int().min(0).max(3650), z.null()])
    .optional(),
  reminderLevel3DaysAfterDue: z
    .union([z.number().int().min(0).max(3650), z.null()])
    .optional(),
  archived: z.boolean().optional(),
});

export type CustomerPatchInput = z.infer<typeof customerPatchSchema>;

export const customerPatchAddressSchema = addressInputBase.partial();

export type CustomerPatchAddressInput = z.infer<
  typeof customerPatchAddressSchema
>;

/** Mehrzeiliger Empfaengerblock fuer Belege (Kunde / Leistungsempfaenger). */
export function formatCustomerAddressLabel(a: {
  recipientName: string;
  addressLine2: string | null;
  street: string;
  postalCode: string;
  city: string;
  country: string;
}): string {
  const lines: string[] = [a.recipientName.trim()];
  const line2 = a.addressLine2?.trim();
  if (line2) {
    lines.push(line2);
  }
  lines.push(a.street.trim());
  lines.push(`${a.postalCode.trim()} ${a.city.trim()}`.trim());
  lines.push(a.country.trim());
  return lines.filter(Boolean).join("\n");
}
