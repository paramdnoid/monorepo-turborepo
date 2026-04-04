import type { Metadata } from "next";

import { getWorkforceHeaderMeta } from "@/content/workforce-module";
import { getServerLocale } from "@/lib/i18n/server-locale";

import { SchedulingContent } from "@/components/web/workforce/scheduling-content";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const meta = getWorkforceHeaderMeta("/web/scheduling", locale);
  return {
    title: meta?.title ?? "Terminplanung",
    description: meta?.subtitle ?? "",
  };
}

export default async function SchedulingPage() {
  const locale = await getServerLocale();
  return <SchedulingContent locale={locale} />;
}
