import type { Metadata } from "next";

import {
  getSalesPageDescription,
  getSalesPageTitle,
} from "@/content/sales-module";
import { getServerLocale } from "@/lib/i18n/server-locale";

import { SalesModuleContent } from "./sales-module-content";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return {
    title: getSalesPageTitle("overview", locale),
    description: getSalesPageDescription("overview", locale),
  };
}

export default async function SalesOverviewPage() {
  const locale = await getServerLocale();
  return <SalesModuleContent locale={locale} />;
}
