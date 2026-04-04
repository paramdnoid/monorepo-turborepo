import type { Metadata } from "next";

import {
  getBelegePageDescription,
  getBelegePageTitle,
} from "@/content/belege-module";
import { getServerLocale } from "@/lib/i18n/server-locale";

import { BelegeModuleContent } from "./belege-module-content";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return {
    title: getBelegePageTitle("overview", locale),
    description: getBelegePageDescription("overview", locale),
  };
}

export default async function BelegeOverviewPage() {
  const locale = await getServerLocale();
  return <BelegeModuleContent locale={locale} />;
}
