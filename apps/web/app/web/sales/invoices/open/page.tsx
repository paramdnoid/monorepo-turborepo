import type { Metadata } from "next";
import Link from "next/link";

import { SalesCamtImportPanel } from "@/components/web/sales/sales-camt-import-panel";
import { SalesOpenInvoicesList } from "@/components/web/sales/sales-open-invoices-list";
import { getSalesTableCopy, getSalesHeaderMeta } from "@/content/sales-module";
import { getServerLocale } from "@/lib/i18n/server-locale";

import { Button } from "@repo/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const meta = getSalesHeaderMeta("/web/sales/invoices/open", locale);
  return {
    title: meta?.title ?? "Offene Posten",
    description: meta?.subtitle ?? "",
  };
}

export default async function SalesOpenInvoicesPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const locale = await getServerLocale();
  const copy = getSalesTableCopy(locale);
  const projectId =
    typeof searchParams?.projectId === "string" ? searchParams.projectId : undefined;
  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/web/sales/invoices">{copy.backToList}</Link>
        </Button>
      </div>
      <SalesCamtImportPanel locale={locale} />
      <SalesOpenInvoicesList locale={locale} projectId={projectId} />
    </div>
  );
}
