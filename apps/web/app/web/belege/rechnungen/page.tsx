import type { Metadata } from "next";

import {
  getBelegePageDescription,
  getBelegePageTitle,
} from "@/content/belege-module";
import { getServerLocale } from "@/lib/i18n/server-locale";

import { BelegeSalesList } from "../belege-sales-list";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return {
    title: getBelegePageTitle("invoices", locale),
    description: getBelegePageDescription("invoices", locale),
  };
}

export default async function BelegeRechnungenPage() {
  const locale = await getServerLocale();
  return (
    <div className="w-full min-w-0 space-y-6">
      <BelegeSalesList locale={locale} mode="invoices" />
    </div>
  );
}
