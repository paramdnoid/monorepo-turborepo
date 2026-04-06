import type { Metadata } from "next";

import { getWorkforceHeaderMeta } from "@/content/workforce-module";
import { getServerLocale } from "@/lib/i18n/server-locale";

import { WorkTimeContent } from "@/components/web/workforce/work-time-content";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const meta = getWorkforceHeaderMeta("/web/work-time", locale);
  return {
    title: meta?.title ?? "Zeiterfassung",
    description: meta?.subtitle ?? "",
  };
}

export default async function WorkTimePage() {
  const locale = await getServerLocale();
  return <WorkTimeContent locale={locale} />;
}
