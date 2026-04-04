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

import { SalesDocumentPrint } from "../../../sales-document-print";
import { SalesPrintToolbar } from "../../../sales-print-toolbar";
import { fetchQuoteForPrint } from "../../../sales-print-fetch";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = await getServerLocale();
  await params;
  return {
    title: `${getSalesPageTitle("quotes", locale)} — ${locale === "en" ? "Print" : "Druck"}`,
    description: getSalesPageDescription("quotes", locale),
  };
}

export default async function SalesQuotePrintPage({ params }: PageProps) {
  const { id } = await params;
  const session = await validateWebAccessTokenSession();
  const h = await headers();
  const pathname =
    h.get("x-pathname") ?? `/web/sales/quotes/${encodeURIComponent(id)}/print`;

  if (!session.ok) {
    if (session.reason === "superseded_by_app") {
      redirect(
        `/api/auth/invalidate-superseded-web-session?next=${encodeURIComponent(pathname)}`,
      );
    }
    redirect(`/login?next=${encodeURIComponent(pathname)}`);
  }

  const result = await fetchQuoteForPrint(session.token, id);
  const locale = await getServerLocale();
  const copy = getSalesTableCopy(locale);
  const backList = "/web/sales/quotes";
  const backDoc = `/web/sales/quotes/${encodeURIComponent(id)}`;
  const pdfHref = `/api/web/sales/quotes/${encodeURIComponent(id)}/pdf`;

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
      <SalesPrintToolbar locale={locale} backHref={backDoc} pdfHref={pdfHref} />
      <SalesDocumentPrint locale={locale} mode="quotes" quote={result.quote} me={result.me} />
    </div>
  );
}
