import type { Metadata } from "next";

import { getCustomersHeaderMeta } from "@/content/customers-module";
import { getServerLocale } from "@/lib/i18n/server-locale";

import { KundenListContent } from "./kunden-list-content";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const meta = getCustomersHeaderMeta("/web/kunden", locale);
  return {
    title: meta?.title ?? "Kunden",
    description: meta?.subtitle ?? "",
  };
}

export default async function KundenPage() {
  const locale = await getServerLocale();
  return (
    <div className="w-full min-w-0 space-y-6">
      <KundenListContent locale={locale} />
    </div>
  );
}
