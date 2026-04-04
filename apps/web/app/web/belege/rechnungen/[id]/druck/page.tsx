import { headers } from "next/headers";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  getBelegePageDescription,
  getBelegePageTitle,
  getBelegeSalesTableCopy,
} from "@/content/belege-module";
import { validateWebAccessTokenSession } from "@/lib/auth/validate-web-session";
import { getServerLocale } from "@/lib/i18n/server-locale";
import { Button } from "@repo/ui/button";

import { BelegeDocumentPrint } from "../../../belege-document-print";
import { BelegePrintToolbar } from "../../../belege-print-toolbar";
import { fetchInvoiceForPrint } from "../../../belege-print-fetch";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = await getServerLocale();
  await params;
  return {
    title: `${getBelegePageTitle("invoices", locale)} — ${locale === "en" ? "Print" : "Druck"}`,
    description: getBelegePageDescription("invoices", locale),
  };
}

export default async function BelegeRechnungDruckPage({ params }: PageProps) {
  const { id } = await params;
  const session = await validateWebAccessTokenSession();
  const h = await headers();
  const pathname =
    h.get("x-pathname") ?? `/web/belege/rechnungen/${encodeURIComponent(id)}/druck`;

  if (!session.ok) {
    if (session.reason === "superseded_by_app") {
      redirect(
        `/api/auth/invalidate-superseded-web-session?next=${encodeURIComponent(pathname)}`,
      );
    }
    redirect(`/login?next=${encodeURIComponent(pathname)}`);
  }

  const result = await fetchInvoiceForPrint(session.token, id);
  const locale = await getServerLocale();
  const copy = getBelegeSalesTableCopy(locale);
  const backList = "/web/belege/rechnungen";
  const backDoc = `/web/belege/rechnungen/${encodeURIComponent(id)}`;
  const pdfHref = `/api/web/sales/invoices/${encodeURIComponent(id)}/pdf`;

  if (!result.ok) {
    if (result.status === 404) {
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{copy.notFound}</p>
          <Button variant="outline" size="sm" asChild>
            <Link href={backList}>{copy.backToList}</Link>
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

  return (
    <div className="w-full min-w-0">
      <BelegePrintToolbar locale={locale} backHref={backDoc} pdfHref={pdfHref} />
      <BelegeDocumentPrint
        locale={locale}
        mode="invoices"
        invoice={result.invoice}
        me={result.me}
      />
    </div>
  );
}
