import type { Metadata } from "next";

import { getServerLocale } from "@/lib/i18n/server-locale";

import { CustomersModuleLandingContent } from "@/components/web/customers/customers-module-landing-content";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return {
    title: locale === "en" ? "Customers" : "Kunden",
    description:
      locale === "en"
        ? "Module entry for customer master data and addresses."
        : "Moduleinstieg fuer Kundenstamm und Adressen.",
  };
}

export default function CustomersRootPage() {
  return <CustomersModuleLandingContent />;
}
