import type { Metadata } from "next";

import {
  getCustomersPageDescription,
  getCustomersPageTitle,
} from "@/content/customers-module";
import { getServerLocale } from "@/lib/i18n/server-locale";

import { CustomersAddressesContent } from "@/components/web/customers/customers-addresses-content";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return {
    title: getCustomersPageTitle("addresses", locale),
    description: getCustomersPageDescription("addresses", locale),
  };
}

export default async function CustomersAddressesPage() {
  const locale = await getServerLocale();
  return (
    <div className="w-full min-w-0 space-y-6">
      <CustomersAddressesContent locale={locale} />
    </div>
  );
}
