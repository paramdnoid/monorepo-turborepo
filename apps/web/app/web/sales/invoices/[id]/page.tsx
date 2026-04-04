import type { Metadata } from "next";

import {
  getSalesPageDescription,
  getSalesPageTitle,
} from "@/content/sales-module";
import { getServerLocale } from "@/lib/i18n/server-locale";

import { SalesDetail } from "../../sales-detail";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const locale = await getServerLocale();
  await params;
  return {
    title: getSalesPageTitle("invoices", locale),
    description: getSalesPageDescription("invoices", locale),
  };
}

export default async function SalesInvoiceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const locale = await getServerLocale();
  return (
    <div className="w-full min-w-0 space-y-6">
      <SalesDetail locale={locale} mode="invoices" documentId={id} />
    </div>
  );
}
