import type { Metadata } from "next";

import {
  getSchedulingFeatureForPage,
  getWorkforceHeaderMeta,
} from "@/content/workforce-module";
import { getServerLocale } from "@/lib/i18n/server-locale";

import { SchedulingContent } from "@/components/web/workforce/scheduling-content";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const meta = getWorkforceHeaderMeta("/web/scheduling", locale);
  const feature = getSchedulingFeatureForPage(locale);
  return {
    title: meta?.title ?? feature.label,
    description: meta?.subtitle ?? feature.description,
  };
}

export default async function SchedulingPage() {
  const locale = await getServerLocale();
  const feature = getSchedulingFeatureForPage(locale);
  return <SchedulingContent locale={locale} feature={feature} />;
}
