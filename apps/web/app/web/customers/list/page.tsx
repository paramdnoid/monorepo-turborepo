import type { Metadata } from "next";

import {
  getCustomersPageDescription,
  getCustomersPageTitle,
} from "@/content/customers-module";
import { getServerLocale } from "@/lib/i18n/server-locale";

import { CustomersListContent } from "@/components/web/customers/customers-list-content";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return {
    title: getCustomersPageTitle("list", locale),
    description: getCustomersPageDescription("list", locale),
  };
}

export default async function CustomersListPage() {
  const locale = await getServerLocale();
  return (
    <div className="w-full min-w-0 space-y-6">
      <CustomersListContent locale={locale} />
    </div>
  );
}
