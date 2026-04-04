import type { SalesDocumentLine } from "@repo/api-contracts";

import { getSalesPrintCopy, getSalesLinesCopy, getSalesTableCopy } from "@/content/sales-module";
import type { Locale } from "@/lib/i18n/locale";
import { formatMinorCurrency } from "@/lib/money-format";

import { formatSalesDocumentDate } from "./sales-document-format";
import type { SalesMeContext } from "./sales-print-fetch";

type QuoteLike = {
  documentNumber: string;
  customerLabel: string;
  status: string;
  currency: string;
  totalCents: number;
  validUntil: string | null;
  updatedAt: string;
  projectId: string | null;
  lines: SalesDocumentLine[];
};

type InvoiceLike = {
  documentNumber: string;
  customerLabel: string;
  status: string;
  currency: string;
  totalCents: number;
  issuedAt: string | null;
  dueAt: string | null;
  paidAt: string | null;
  updatedAt: string;
  projectId: string | null;
  quoteId: string | null;
  lines: SalesDocumentLine[];
};

type SalesDocumentPrintProps =
  | { locale: Locale; mode: "quotes"; quote: QuoteLike; me: SalesMeContext }
  | { locale: Locale; mode: "invoices"; invoice: InvoiceLike; me: SalesMeContext };

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

export function SalesDocumentPrint(props: SalesDocumentPrintProps) {
  const { locale, me } = props;
  const printCopy = getSalesPrintCopy(locale);
  const tableCopy = getSalesTableCopy(locale);
  const linesCopy = getSalesLinesCopy(locale);

  const isQuote = props.mode === "quotes";
  const head = isQuote ? props.quote : props.invoice;

  const docTitle = isQuote ? printCopy.documentTitleQuote : printCopy.documentTitleInvoice;

  const sortedLines = [...head.lines].sort((a, b) => a.sortIndex - b.sortIndex);

  const org = me.organization;
  const showSenderPlaceholder =
    !org.senderAddress &&
    !org.vatId &&
    !org.taxNumber &&
    !org.hasLogo;

  return (
    <article className="sales-print-document mx-auto max-w-[210mm] bg-background px-6 py-8 text-foreground shadow-sm print:shadow-none print:max-w-none print:px-0 print:py-0">
      <header className="border-b border-border pb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {org.hasLogo ? (
              // BFF liefert das Bild mit Session — gleiche Origin wie die Druckseite
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/api/web/organization/logo"
                alt=""
                className="mb-2 h-10 w-auto max-h-10 max-w-40 object-contain object-left print:max-h-9"
              />
            ) : null}
            <p className="text-lg font-semibold leading-tight">{org.name}</p>
            {org.senderAddress ? (
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {org.senderAddress}
              </p>
            ) : null}
            {org.vatId ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {printCopy.vatIdLabel}: {org.vatId}
              </p>
            ) : null}
            {org.taxNumber ? (
              <p className="text-xs text-muted-foreground">
                {printCopy.taxNumberLabel}: {org.taxNumber}
              </p>
            ) : null}
            {showSenderPlaceholder ? (
              <p className="mt-2 text-xs text-muted-foreground">{printCopy.senderHint}</p>
            ) : null}
          </div>
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight">{docTitle}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {printCopy.documentNoLabel} {head.documentNumber}
        </p>
      </header>

      <section className="mt-8 space-y-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {printCopy.recipientLabel}
          </p>
          <p className="mt-1 text-base font-medium whitespace-pre-wrap">{head.customerLabel}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <MetaRow label={tableCopy.status} value={head.status} />
          <MetaRow
            label={tableCopy.total}
            value={formatMinorCurrency(head.totalCents, head.currency, locale)}
          />
          {isQuote ? (
            <MetaRow
              label={tableCopy.validUntil}
              value={formatSalesDocumentDate(props.quote.validUntil, locale)}
            />
          ) : (
            <>
              <MetaRow
                label={tableCopy.issued}
                value={formatSalesDocumentDate(props.invoice.issuedAt, locale)}
              />
              <MetaRow
                label={tableCopy.dueDate}
                value={formatSalesDocumentDate(props.invoice.dueAt, locale)}
              />
              <MetaRow
                label={tableCopy.paidAt}
                value={formatSalesDocumentDate(props.invoice.paidAt, locale)}
              />
              {props.invoice.quoteId ? (
                <MetaRow label={tableCopy.quoteRef} value={props.invoice.quoteId} />
              ) : null}
            </>
          )}
          {head.projectId ? (
            <MetaRow label={tableCopy.projectId} value={head.projectId} />
          ) : null}
          <MetaRow
            label={tableCopy.date}
            value={formatSalesDocumentDate(head.updatedAt, locale)}
          />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold">{linesCopy.heading}</h2>
        {sortedLines.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{linesCopy.emptyLines}</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="sales-print-table w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2 pr-3 font-medium">{linesCopy.description}</th>
                  <th className="py-2 pr-3 font-medium tabular-nums">{linesCopy.quantity}</th>
                  <th className="py-2 pr-3 font-medium">{linesCopy.unit}</th>
                  <th className="py-2 pr-3 font-medium tabular-nums">{linesCopy.unitPrice}</th>
                  <th className="py-2 font-medium tabular-nums">{linesCopy.lineTotal}</th>
                </tr>
              </thead>
              <tbody>
                {sortedLines.map((line) => (
                  <tr key={line.id} className="border-b border-border/80">
                    <td className="py-2 pr-3 align-top">{line.description}</td>
                    <td className="py-2 pr-3 align-top tabular-nums">{line.quantity ?? "—"}</td>
                    <td className="py-2 pr-3 align-top">{line.unit ?? "—"}</td>
                    <td className="py-2 pr-3 align-top tabular-nums">
                      {formatMinorCurrency(line.unitPriceCents, head.currency, locale)}
                    </td>
                    <td className="py-2 align-top tabular-nums font-medium">
                      {formatMinorCurrency(line.lineTotalCents, head.currency, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer className="mt-10 flex flex-col items-end gap-1 border-t border-border pt-6">
        <p className="text-sm text-muted-foreground">{printCopy.totalLabel}</p>
        <p className="text-xl font-semibold tabular-nums">
          {formatMinorCurrency(head.totalCents, head.currency, locale)}
        </p>
      </footer>
    </article>
  );
}
