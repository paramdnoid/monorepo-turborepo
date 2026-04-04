import type { Metadata } from "next";

import { getServerLocale } from "@/lib/i18n/server-locale";

import { WebOverviewContent } from "@/components/web/overview/web-overview-content";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return {
    title: "App",
    description:
      locale === "en"
        ? "Product shell preview (sidebar) in the web app."
        : "Produkt-Shell-Vorschau (Sidebar) in der Web-App.",
  };
}

export default function WebAppPage() {
  return <WebOverviewContent />;
}
