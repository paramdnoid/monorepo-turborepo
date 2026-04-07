export type EInvoiceProfile = "xrechnung" | "zugferd";

export type EInvoiceBillingType = "invoice" | "partial" | "final" | "credit_note";

export type EInvoiceSnapshot = {
  documentNumber: string;
  issuedAt: string | null;
  dueAt: string | null;
  currency: string;
  customerLabel: string;
  totalCents: number;
  balanceCents: number;
  billingType: EInvoiceBillingType;
  lines: Array<{
    id: string;
    sortIndex: number;
    description: string;
    quantity: string | null;
    unit: string | null;
    unitPriceCents: number;
    lineTotalCents: number;
    taxRateBps: number;
    discountBps: number;
  }>;
  taxBreakdown: Array<{
    taxRateBps: number;
    netCents: number;
    taxCents: number;
    grossCents: number;
  }>;
};

export type EInvoicePostalAddress = {
  street: string;
  addressLine2: string | null;
  postalCode: string;
  city: string;
  /** ISO 3166-1 alpha-2 */
  country: string;
};

export type EInvoiceParty = {
  name: string;
  address: EInvoicePostalAddress;
  vatId: string | null;
  taxNumber: string | null;
};

export type EInvoiceIssue = {
  level: "error" | "warning";
  code: string;
  message: string;
  path?: string[];
};

export type EInvoiceValidationResult = {
  ok: boolean;
  errors: EInvoiceIssue[];
  warnings: EInvoiceIssue[];
};

export function parseMultilineAddress(
  senderAddress: string,
): EInvoicePostalAddress | null {
  const lines = senderAddress
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;

  let country = "DE";
  const last = lines[lines.length - 1]?.trim();
  if (last) {
    const normalized = last.toUpperCase();
    if (normalized === "DE" || normalized === "DEUTSCHLAND" || normalized === "GERMANY") {
      country = "DE";
      lines.pop();
    } else if (/^[A-Z]{2}$/.test(normalized)) {
      country = normalized;
      lines.pop();
    }
  }

  let postalCode = "";
  let city = "";
  let cityIdx = -1;
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const candidate = lines[i] ?? "";
    const m = /^(\d{4,6})\s+(.+)$/.exec(candidate);
    if (m) {
      postalCode = m[1] ?? "";
      city = (m[2] ?? "").trim();
      cityIdx = i;
      break;
    }
  }
  if (!postalCode || !city || cityIdx === -1) return null;

  const streetLines = lines.slice(0, cityIdx).filter(Boolean);
  const street = streetLines[streetLines.length - 1]?.trim() ?? "";
  if (!street) return null;
  const addressLine2 =
    streetLines.length > 1 ? streetLines.slice(0, -1).join(", ") : null;
  return {
    street,
    addressLine2: addressLine2 && addressLine2.trim() ? addressLine2.trim() : null,
    postalCode,
    city,
    country,
  };
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function normalizeIsoDate(iso: string | null | undefined): string {
  if (typeof iso === "string" && iso.length >= 10) return iso.slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

function toDateYmdCompact(isoDate: string): string {
  return isoDate.replaceAll("-", "");
}

function formatEuroAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

function computeNetFromGross(grossCents: number, taxRateBps: number): number {
  if (taxRateBps <= 0) return grossCents;
  return Math.round((grossCents * 10_000) / (10_000 + taxRateBps));
}

function parseLineQuantityValue(raw: string | null): number {
  if (!raw) return 1;
  const normalized = raw.trim().replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return 1;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return n;
}

function partyXml(tag: "ram:SellerTradeParty" | "ram:BuyerTradeParty", party: EInvoiceParty): string[] {
  const out: string[] = [];
  out.push(`      <${tag}>`);
  out.push(`        <ram:Name>${escapeXml(party.name)}</ram:Name>`);
  out.push("        <ram:PostalTradeAddress>");
  out.push(`          <ram:PostcodeCode>${escapeXml(party.address.postalCode)}</ram:PostcodeCode>`);
  out.push(`          <ram:LineOne>${escapeXml(party.address.street)}</ram:LineOne>`);
  if (party.address.addressLine2) {
    out.push(`          <ram:LineTwo>${escapeXml(party.address.addressLine2)}</ram:LineTwo>`);
  }
  out.push(`          <ram:CityName>${escapeXml(party.address.city)}</ram:CityName>`);
  out.push(`          <ram:CountryID>${escapeXml(party.address.country)}</ram:CountryID>`);
  out.push("        </ram:PostalTradeAddress>");
  if (party.vatId && party.vatId.trim()) {
    out.push("        <ram:SpecifiedTaxRegistration>");
    out.push(`          <ram:ID schemeID="VA">${escapeXml(party.vatId.trim())}</ram:ID>`);
    out.push("        </ram:SpecifiedTaxRegistration>");
  }
  if (party.taxNumber && party.taxNumber.trim()) {
    out.push("        <ram:SpecifiedTaxRegistration>");
    out.push(`          <ram:ID schemeID="FC">${escapeXml(party.taxNumber.trim())}</ram:ID>`);
    out.push("        </ram:SpecifiedTaxRegistration>");
  }
  out.push(`      </${tag}>`);
  return out;
}

export function validateCiiEInvoiceData(args: {
  profile: EInvoiceProfile;
  invoice: EInvoiceSnapshot;
  seller: EInvoiceParty;
  buyer: EInvoiceParty;
  buyerReference: string | null;
}): EInvoiceValidationResult {
  const errors: EInvoiceIssue[] = [];
  const warnings: EInvoiceIssue[] = [];

  function err(code: string, message: string, path?: string[]) {
    errors.push({ level: "error", code, message, path });
  }
  function warn(code: string, message: string, path?: string[]) {
    warnings.push({ level: "warning", code, message, path });
  }

  if (!args.invoice.documentNumber?.trim()) {
    err("invoice_document_number_missing", "invoice documentNumber is required", ["invoice", "documentNumber"]);
  }
  if (!args.invoice.currency?.trim()) {
    err("invoice_currency_missing", "invoice currency is required", ["invoice", "currency"]);
  }
  if (!args.invoice.issuedAt) {
    warn(
      "invoice_issue_date_missing",
      "invoice issuedAt missing; using today's date as fallback",
      ["invoice", "issuedAt"],
    );
  }
  if (!args.invoice.dueAt) {
    warn(
      "invoice_due_date_missing",
      "invoice dueAt missing; using issuedAt as fallback",
      ["invoice", "dueAt"],
    );
  }
  if (args.invoice.lines.length === 0) {
    err("invoice_lines_missing", "invoice must contain at least one line item", ["invoice", "lines"]);
  }

  if (!args.seller.name?.trim()) {
    err("seller_name_missing", "seller name is required", ["seller", "name"]);
  }
  if (!args.seller.address?.street?.trim()) {
    err("seller_address_street_missing", "seller street is required", ["seller", "address", "street"]);
  }
  if (!args.seller.address?.postalCode?.trim()) {
    err("seller_address_postal_code_missing", "seller postalCode is required", ["seller", "address", "postalCode"]);
  }
  if (!args.seller.address?.city?.trim()) {
    err("seller_address_city_missing", "seller city is required", ["seller", "address", "city"]);
  }
  if (!args.seller.address?.country?.trim()) {
    err("seller_address_country_missing", "seller country is required", ["seller", "address", "country"]);
  }
  if (!args.seller.vatId?.trim() && !args.seller.taxNumber?.trim()) {
    warn(
      "seller_tax_id_missing",
      "seller VAT ID or tax number should be provided for better compliance",
      ["seller"],
    );
  }

  if (!args.buyer.name?.trim()) {
    err("buyer_name_missing", "buyer name is required", ["buyer", "name"]);
  }
  if (!args.buyer.address?.street?.trim()) {
    err("buyer_address_street_missing", "buyer street is required", ["buyer", "address", "street"]);
  }
  if (!args.buyer.address?.postalCode?.trim()) {
    err("buyer_address_postal_code_missing", "buyer postalCode is required", ["buyer", "address", "postalCode"]);
  }
  if (!args.buyer.address?.city?.trim()) {
    err("buyer_address_city_missing", "buyer city is required", ["buyer", "address", "city"]);
  }
  if (!args.buyer.address?.country?.trim()) {
    err("buyer_address_country_missing", "buyer country is required", ["buyer", "address", "country"]);
  }

  const buyerRef = args.buyerReference?.trim() ?? "";
  if (args.profile === "xrechnung" && !buyerRef) {
    warn(
      "buyer_reference_missing",
      "XRechnung profile typically requires BuyerReference (BT-10); please set a customer number / buyer reference",
      ["buyerReference"],
    );
  }

  if (args.invoice.taxBreakdown.length === 0) {
    warn("invoice_tax_breakdown_missing", "invoice taxBreakdown is empty", ["invoice", "taxBreakdown"]);
  } else {
    for (const row of args.invoice.taxBreakdown) {
      if (row.grossCents !== row.netCents + row.taxCents) {
        warn(
          "invoice_tax_breakdown_inconsistent",
          "taxBreakdown row grossCents should equal netCents + taxCents",
          ["invoice", "taxBreakdown"],
        );
        break;
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function buildCiiEInvoiceXml(args: {
  profile: EInvoiceProfile;
  invoice: EInvoiceSnapshot;
  seller: EInvoiceParty;
  buyer: EInvoiceParty;
  buyerReference: string | null;
}): string {
  const issueDate = normalizeIsoDate(args.invoice.issuedAt);
  const dueDate = normalizeIsoDate(args.invoice.dueAt ?? args.invoice.issuedAt);
  const profileId =
    args.profile === "xrechnung"
      ? "urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0"
      : "urn:cen.eu:en16931:2017#conformant#urn:factur-x.eu:1p0:basic";

  const docTypeCode = args.invoice.billingType === "credit_note" ? "381" : "380";

  const taxRows =
    args.invoice.taxBreakdown.length > 0
      ? args.invoice.taxBreakdown
      : [
          {
            taxRateBps: 0,
            netCents: args.invoice.totalCents,
            taxCents: 0,
            grossCents: args.invoice.totalCents,
          },
        ];
  const taxBasisTotalCents = taxRows.reduce((acc, row) => acc + row.netCents, 0);
  const taxTotalCents = taxRows.reduce((acc, row) => acc + row.taxCents, 0);
  const lineNetTotalCents = args.invoice.lines.reduce((acc, line) => {
    const rate = line.taxRateBps ?? 1900;
    return acc + computeNetFromGross(line.lineTotalCents, rate);
  }, 0);

  const buyerReference = args.buyerReference?.trim() || "";

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">',
    "  <rsm:ExchangedDocumentContext>",
    "    <ram:GuidelineSpecifiedDocumentContextParameter>",
    `      <ram:ID>${escapeXml(profileId)}</ram:ID>`,
    "    </ram:GuidelineSpecifiedDocumentContextParameter>",
    "  </rsm:ExchangedDocumentContext>",
    "  <rsm:ExchangedDocument>",
    `    <ram:ID>${escapeXml(args.invoice.documentNumber)}</ram:ID>`,
    `    <ram:TypeCode>${docTypeCode}</ram:TypeCode>`,
    "    <ram:IssueDateTime>",
    `      <udt:DateTimeString format="102">${escapeXml(toDateYmdCompact(issueDate))}</udt:DateTimeString>`,
    "    </ram:IssueDateTime>",
    "  </rsm:ExchangedDocument>",
    "  <rsm:SupplyChainTradeTransaction>",
    ...args.invoice.lines.flatMap((line, idx) => {
      const quantity = parseLineQuantityValue(line.quantity);
      const lineTaxRateBps = line.taxRateBps ?? 1900;
      const lineNetCents = computeNetFromGross(line.lineTotalCents, lineTaxRateBps);
      const unitNetCents = computeNetFromGross(line.unitPriceCents, lineTaxRateBps);
      const ratePercent = (lineTaxRateBps / 100).toFixed(2);
      const unitCode = line.unit?.trim()
        ? line.unit.trim().slice(0, 3).toUpperCase()
        : "C62";
      return [
        "    <ram:IncludedSupplyChainTradeLineItem>",
        "      <ram:AssociatedDocumentLineDocument>",
        `        <ram:LineID>${idx + 1}</ram:LineID>`,
        "      </ram:AssociatedDocumentLineDocument>",
        "      <ram:SpecifiedTradeProduct>",
        `        <ram:Name>${escapeXml(line.description)}</ram:Name>`,
        "      </ram:SpecifiedTradeProduct>",
        "      <ram:SpecifiedLineTradeAgreement>",
        "        <ram:NetPriceProductTradePrice>",
        `          <ram:ChargeAmount>${formatEuroAmount(unitNetCents)}</ram:ChargeAmount>`,
        "        </ram:NetPriceProductTradePrice>",
        "      </ram:SpecifiedLineTradeAgreement>",
        "      <ram:SpecifiedLineTradeDelivery>",
        `        <ram:BilledQuantity unitCode="${escapeXml(unitCode)}">${quantity.toFixed(2)}</ram:BilledQuantity>`,
        "      </ram:SpecifiedLineTradeDelivery>",
        "      <ram:SpecifiedLineTradeSettlement>",
        "        <ram:ApplicableTradeTax>",
        "          <ram:TypeCode>VAT</ram:TypeCode>",
        "          <ram:CategoryCode>S</ram:CategoryCode>",
        `          <ram:RateApplicablePercent>${ratePercent}</ram:RateApplicablePercent>`,
        "        </ram:ApplicableTradeTax>",
        "        <ram:SpecifiedTradeSettlementLineMonetarySummation>",
        `          <ram:LineTotalAmount>${formatEuroAmount(lineNetCents)}</ram:LineTotalAmount>`,
        "        </ram:SpecifiedTradeSettlementLineMonetarySummation>",
        "      </ram:SpecifiedLineTradeSettlement>",
        "    </ram:IncludedSupplyChainTradeLineItem>",
      ];
    }),
    "    <ram:ApplicableHeaderTradeAgreement>",
    ...partyXml("ram:SellerTradeParty", args.seller),
    ...partyXml("ram:BuyerTradeParty", args.buyer),
    ...(buyerReference
      ? [`      <ram:BuyerReference>${escapeXml(buyerReference)}</ram:BuyerReference>`]
      : []),
    "    </ram:ApplicableHeaderTradeAgreement>",
    "    <ram:ApplicableHeaderTradeSettlement>",
    `      <ram:InvoiceCurrencyCode>${escapeXml(args.invoice.currency)}</ram:InvoiceCurrencyCode>`,
    ...taxRows.flatMap((row) => [
      "      <ram:ApplicableTradeTax>",
      `        <ram:CalculatedAmount>${formatEuroAmount(row.taxCents)}</ram:CalculatedAmount>`,
      "        <ram:TypeCode>VAT</ram:TypeCode>",
      `        <ram:BasisAmount>${formatEuroAmount(row.netCents)}</ram:BasisAmount>`,
      "        <ram:CategoryCode>S</ram:CategoryCode>",
      `        <ram:RateApplicablePercent>${(row.taxRateBps / 100).toFixed(2)}</ram:RateApplicablePercent>`,
      "      </ram:ApplicableTradeTax>",
    ]),
    "      <ram:SpecifiedTradePaymentTerms>",
    `        <ram:DueDateDateTime><udt:DateTimeString format="102">${escapeXml(toDateYmdCompact(dueDate))}</udt:DateTimeString></ram:DueDateDateTime>`,
    "      </ram:SpecifiedTradePaymentTerms>",
    "      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>",
    `        <ram:LineTotalAmount>${formatEuroAmount(lineNetTotalCents)}</ram:LineTotalAmount>`,
    `        <ram:TaxBasisTotalAmount>${formatEuroAmount(taxBasisTotalCents)}</ram:TaxBasisTotalAmount>`,
    `        <ram:TaxTotalAmount currencyID="${escapeXml(args.invoice.currency)}">${formatEuroAmount(taxTotalCents)}</ram:TaxTotalAmount>`,
    `        <ram:GrandTotalAmount>${formatEuroAmount(args.invoice.totalCents)}</ram:GrandTotalAmount>`,
    `        <ram:DuePayableAmount>${formatEuroAmount(args.invoice.balanceCents)}</ram:DuePayableAmount>`,
    "      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>",
    "    </ram:ApplicableHeaderTradeSettlement>",
    "  </rsm:SupplyChainTradeTransaction>",
    "</rsm:CrossIndustryInvoice>",
    "",
  ].join("\n");
}

