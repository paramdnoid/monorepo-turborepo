import type { Metadata } from "next";

import { getCustomersHeaderMeta } from "@/content/customers-module";
import { getServerLocale } from "@/lib/i18n/server-locale";

import { CustomersListContent } from "./customers-list-content";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const meta = getCustomersHeaderMeta("/web/customers", locale);
  return {
    title: meta?.title ?? "Kunden",
    description: meta?.subtitle ?? "",
  };
}

export default async function CustomersPage() {
  const locale = await getServerLocale();
  return (
    <div className="w-full min-w-0 space-y-6">
      <CustomersListContent locale={locale} />
    </div>
  );
}
