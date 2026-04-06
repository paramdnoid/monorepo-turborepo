import { headers } from "next/headers";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  getSalesPageDescription,
  getSalesPageTitle,
  getSalesTableCopy,
} from "@/content/sales-module";
import { validateWebAccessTokenSession } from "@/lib/auth/validate-web-session";
import { getServerLocale } from "@/lib/i18n/server-locale";
import { Button } from "@repo/ui/button";

import { SalesInvoiceReminderPrint } from "@/components/web/sales/sales-reminder-print";
import { SalesPrintToolbar } from "@/components/web/sales/sales-print-toolbar";
import {
  fetchInvoiceForPrint,
  fetchResolvedSalesReminderTemplateForPrint,
} from "@/components/web/sales/sales-print-fetch";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string; reminderId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = await getServerLocale();
  await params;
  const titleSuffix =
    locale === "en" ? "Reminder — Print" : "Mahnung — Druck";
  return {
    title: `${getSalesPageTitle("invoices", locale)} — ${titleSuffix}`,
    description: getSalesPageDescription("invoices", locale),
  };
}

export default async function SalesInvoiceReminderPrintPage({ params }: PageProps) {
  const { id, reminderId } = await params;
  const session = await validateWebAccessTokenSession();
  const h = await headers();
  const pathname =
    h.get("x-pathname") ??
    `/web/sales/invoices/${encodeURIComponent(id)}/reminders/${encodeURIComponent(reminderId)}/print`;

  if (!session.ok) {
    if (session.reason === "superseded_by_app") {
      redirect(
        `/api/auth/invalidate-superseded-web-session?next=${encodeURIComponent(pathname)}`,
      );
    }
    redirect(`/login?next=${encodeURIComponent(pathname)}`);
  }

  const locale = await getServerLocale();
  const result = await fetchInvoiceForPrint(session.token, id);
  const copy = getSalesTableCopy(locale);
  const backDoc = `/web/sales/invoices/${encodeURIComponent(id)}`;
  const pdfHref = `/api/web/sales/invoices/${encodeURIComponent(id)}/reminders/${encodeURIComponent(reminderId)}/pdf`;

  if (!result.ok) {
    if (result.status === 404) {
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{copy.notFound}</p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/web/sales/invoices">{copy.backToList}</Link>
          </Button>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{copy.loadError}</p>
        <Button variant="outline" size="sm" asChild>
          <Link href={backDoc}>{copy.backToList}</Link>
        </Button>
      </div>
    );
  }

  const reminder = result.invoice.reminders.find((r) => r.id === reminderId);
  const pdfLang = locale === "en" ? "en" : "de";
  const resolved =
    reminder != null
      ? await fetchResolvedSalesReminderTemplateForPrint(
          session.token,
          pdfLang,
          reminder.level,
        )
      : ({ ok: false as const, status: 500 });

  if (!reminder) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{copy.notFound}</p>
        <Button variant="outline" size="sm" asChild>
          <Link href={backDoc}>{copy.backToList}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0">
      <SalesPrintToolbar locale={locale} backHref={backDoc} pdfHref={pdfHref} />
      <SalesInvoiceReminderPrint
        locale={locale}
        invoice={result.invoice}
        reminder={reminder}
        me={result.me}
        introResolved={resolved.ok ? resolved.introText : undefined}
        feeCents={resolved.ok ? resolved.feeCents : null}
      />
    </div>
  );
}

