import type { Metadata } from "next";

import {
  getSalesPageDescription,
  getSalesPageTitle,
} from "@/content/sales-module";
import { getServerLocale } from "@/lib/i18n/server-locale";

import { SalesList } from "../sales-list";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return {
    title: getSalesPageTitle("invoices", locale),
    description: getSalesPageDescription("invoices", locale),
  };
}

export default async function SalesInvoicesListPage() {
  const locale = await getServerLocale();
  return (
    <div className="w-full min-w-0 space-y-6">
      <SalesList locale={locale} mode="invoices" />
    </div>
  );
}
