import type { Metadata } from "next";

import { getWorkforceHeaderMeta } from "@/content/workforce-module";
import { getServerLocale } from "@/lib/i18n/server-locale";

import { EmployeesListContent } from "@/components/web/workforce/employees-list-content";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const meta = getWorkforceHeaderMeta("/web/employees/list", locale);
  return {
    title: meta?.title ?? "Mitarbeiterverwaltung",
    description: meta?.subtitle,
  };
}

export default async function EmployeesListPage() {
  const locale = await getServerLocale();
  return (
    <div className="w-full min-w-0 space-y-6">
      <EmployeesListContent locale={locale} />
    </div>
  );
}
