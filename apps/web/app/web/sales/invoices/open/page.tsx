import type { Metadata } from "next";

import { SalesCamtImportPanel } from "@/components/web/sales/sales-camt-import-panel";
import { SalesOpenInvoicesList } from "@/components/web/sales/sales-open-invoices-list";
import { SalesOpenInvoicesHeaderActions } from "@/components/web/sales/sales-open-invoices-header-actions";
import { getSalesTableCopy, getSalesHeaderMeta } from "@/content/sales-module";
import { getServerLocale } from "@/lib/i18n/server-locale";

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
  const projectId =
    typeof searchParams?.projectId === "string" ? searchParams.projectId : undefined;
  return (
    <div className="w-full min-w-0 space-y-6">
      <SalesOpenInvoicesHeaderActions locale={locale} />
      <SalesCamtImportPanel locale={locale} />
      <SalesOpenInvoicesList locale={locale} projectId={projectId} />
    </div>
  );
}
