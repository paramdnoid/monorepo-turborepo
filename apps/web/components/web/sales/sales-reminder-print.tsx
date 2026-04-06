import { getSalesInvoicePaymentsCopy, getSalesInvoiceRemindersCopy, getSalesPrintCopy, getSalesTableCopy } from "@/content/sales-module";
import type { Locale } from "@/lib/i18n/locale";
import { formatMinorCurrency } from "@/lib/money-format";

import { formatSalesDocumentDate } from "./sales-document-format";
import type { SalesMeContext } from "./sales-print-fetch";

type InvoiceLike = {
  documentNumber: string;
  customerLabel: string;
  status: string;
  currency: string;
  totalCents: number;
  dueAt: string | null;
  issuedAt: string | null;
  paidAt: string | null;
  updatedAt: string;
  balanceCents: number;
};

type ReminderLike = {
  id: string;
  level: number;
  sentAt: string;
  note: string | null;
};

function interpolateReminderText(template: string, params: {
  invoice: InvoiceLike;
  reminder: ReminderLike;
  locale: Locale;
}): string {
  const { invoice, reminder, locale } = params;
  const entries: Record<string, string> = {
    invoiceNumber: invoice.documentNumber,
    documentNumber: invoice.documentNumber,
    customerName: invoice.customerLabel,
    customerLabel: invoice.customerLabel,
    dueDate: formatSalesDocumentDate(invoice.dueAt, locale),
    issuedDate: formatSalesDocumentDate(invoice.issuedAt, locale),
    reminderDate: formatSalesDocumentDate(reminder.sentAt, locale),
    reminderLevel: String(reminder.level),
    openBalance: formatMinorCurrency(invoice.balanceCents, invoice.currency, locale),
    total: formatMinorCurrency(invoice.totalCents, invoice.currency, locale),
    currency: invoice.currency,
  };
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (full, keyRaw) => {
    const key = String(keyRaw);
    return entries[key] ?? full;
  });
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

export function SalesInvoiceReminderPrint({
  locale,
  invoice,
  reminder,
  me,
  introResolved,
  feeCents,
}: {
  locale: Locale;
  invoice: InvoiceLike;
  reminder: ReminderLike;
  me: SalesMeContext;
  /** Aus API-Aufloesung; sonst eingebauter Standardtext. */
  introResolved?: string;
  /** Mahngebuehr (Cent), Zeile unter dem Fließtext. */
  feeCents?: number | null;
}) {
  const printCopy = getSalesPrintCopy(locale);
  const tableCopy = getSalesTableCopy(locale);
  const paymentCopy = getSalesInvoicePaymentsCopy(locale);
  const reminderCopy = getSalesInvoiceRemindersCopy(locale);

  const title =
    reminder.level <= 1
      ? locale === "en"
        ? "Payment reminder"
        : "Zahlungserinnerung"
      : locale === "en"
        ? "Reminder"
        : "Mahnung";

  const introDefault =
    locale === "en"
      ? "Please settle the open balance. If you have already paid, please disregard this message."
      : "Bitte begleichen Sie den offenen Betrag. Falls Sie bereits gezahlt haben, betrachten Sie dieses Schreiben bitte als gegenstandslos.";
  const introTemplate = introResolved ?? introDefault;
  const intro = interpolateReminderText(introTemplate, { invoice, reminder, locale });

  const org = me.organization;
  const showSenderPlaceholder =
    !org.senderAddress && !org.vatId && !org.taxNumber && !org.hasLogo;

  return (
    <article className="sales-print-document mx-auto max-w-[210mm] bg-background px-6 py-8 text-foreground shadow-sm print:shadow-none print:max-w-none print:px-0 print:py-0">
      <header className="border-b border-border pb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {org.hasLogo ? (
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
              <p className="mt-2 text-xs text-muted-foreground">
                {printCopy.senderHint}
              </p>
            ) : null}
          </div>
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {tableCopy.docNumber} {invoice.documentNumber}
        </p>
      </header>

      <section className="mt-8 space-y-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {printCopy.recipientLabel}
          </p>
          <p className="mt-1 text-base font-medium whitespace-pre-wrap">
            {invoice.customerLabel}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <MetaRow
            label={reminderCopy.level}
            value={`${reminder.level}`}
          />
          <MetaRow
            label={reminderCopy.sentAt}
            value={formatSalesDocumentDate(reminder.sentAt, locale)}
          />
          <MetaRow
            label={tableCopy.dueDate}
            value={formatSalesDocumentDate(invoice.dueAt, locale)}
          />
          <MetaRow
            label={paymentCopy.balance}
            value={formatMinorCurrency(
              invoice.balanceCents,
              invoice.currency,
              locale,
            )}
          />
          <MetaRow
            label={tableCopy.total}
            value={formatMinorCurrency(
              invoice.totalCents,
              invoice.currency,
              locale,
            )}
          />
          <MetaRow
            label={tableCopy.date}
            value={formatSalesDocumentDate(invoice.updatedAt, locale)}
          />
        </div>

        <p className="text-sm text-foreground whitespace-pre-wrap">{intro}</p>

        {feeCents != null && feeCents > 0 ? (
          <p className="text-sm text-foreground">
            {printCopy.reminderFeeLabel}:{" "}
            {formatMinorCurrency(feeCents, invoice.currency, locale)}
          </p>
        ) : null}

        {reminder.note ? (
          <div className="rounded-md border border-border bg-muted/30 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {reminderCopy.note}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{reminder.note}</p>
          </div>
        ) : null}
      </section>
    </article>
  );
}

