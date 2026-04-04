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
});

export const customerDetailSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  customerNumber: z.string().nullable(),
  vatId: z.string().nullable(),
  taxNumber: z.string().nullable(),
  notes: z.string().nullable(),
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
  vatId: z.union([z.string().trim().max(80), z.null()]).optional().default(null),
  taxNumber: z
    .union([z.string().trim().max(80), z.null()])
    .optional()
    .default(null),
  notes: optionalTrimmedNull,
  defaultAddress: customerCreateAddressSchema.optional(),
});

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;

export const customerPatchSchema = z.object({
  displayName: z.string().trim().min(1).max(400).optional(),
  customerNumber: z
    .union([z.string().trim().max(80), z.null()])
    .optional(),
  vatId: z.union([z.string().trim().max(80), z.null()]).optional(),
  taxNumber: z.union([z.string().trim().max(80), z.null()]).optional(),
  notes: z.union([z.string().trim().max(8000), z.null()]).optional(),
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
