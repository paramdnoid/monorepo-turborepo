import type { Metadata } from "next";

import { getServerLocale } from "@/lib/i18n/server-locale";

import { WebOverviewContent } from "@/components/web/overview/web-overview-content";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return {
    title: locale === "en" ? "Dashboard" : "Dashboard",
    description:
      locale === "en"
        ? "Operational dashboard with KPIs, worklists, and quick actions."
        : "Operatives Dashboard mit KPIs, Arbeitslisten und Quick Actions.",
  };
}

export default function WebAppPage() {
  return <WebOverviewContent />;
}
