import type { Metadata } from "next";

import { getServerLocale } from "@/lib/i18n/server-locale";

import { SalesModuleLandingContent } from "@/components/web/sales/sales-module-landing-content";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return {
    title: locale === "en" ? "Sales" : "Sales",
    description:
      locale === "en"
        ? "Module entry for quotes, invoices, and current follow-up tasks."
        : "Moduleinstieg fuer Angebote, Rechnungen und aktuelle Folgeaufgaben.",
  };
}

export default function SalesRootPage() {
  return <SalesModuleLandingContent />;
}
