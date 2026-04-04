import {
  customerDetailResponseSchema,
  customersListResponseSchema,
  formatCustomerAddressLabel,
} from "@repo/api-contracts";

export async function fetchSalesCustomerOptions(): Promise<
  { id: string; label: string }[]
> {
  const res = await fetch("/api/web/customers?limit=500&offset=0", {
    credentials: "include",
  });
  if (!res.ok) {
    return [];
  }
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return [];
  }
  const parsed = customersListResponseSchema.safeParse(json);
  if (!parsed.success) {
    return [];
  }
  return parsed.data.customers
    .filter((c) => !c.archivedAt)
    .map((c) => ({
      id: c.id,
      label: c.customerNumber
        ? `${c.displayName} (${c.customerNumber})`
        : c.displayName,
    }));
}

/** Text fuer Leistungsempfaenger / customerLabel aus Stammdaten + Adresse. */
export async function recipientLabelFromCustomerId(
  customerId: string,
): Promise<string | null> {
  const res = await fetch(`/api/web/customers/${customerId}`, {
    credentials: "include",
  });
  if (!res.ok) {
    return null;
  }
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return null;
  }
  const parsed = customerDetailResponseSchema.safeParse(json);
  if (!parsed.success) {
    return null;
  }
  const c = parsed.data.customer;
  const ranked = [...c.addresses].sort((a, b) => {
    const score = (x: typeof a) =>
      (x.isDefault ? 0 : 2) + (x.kind === "billing" ? 0 : 1);
    return score(a) - score(b);
  });
  const addr = ranked[0];
  if (!addr) {
    return c.displayName;
  }
  return formatCustomerAddressLabel(addr);
}
