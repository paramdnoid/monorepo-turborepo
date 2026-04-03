import type { Metadata } from "next";

import { getServerLocale } from "@/lib/i18n/server-locale";

import { WebSettingsContent } from "../web-settings-content";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return {
    title:
      locale === "en" ? "Settings" : "Einstellungen",
    description:
      locale === "en"
        ? "Account, session, and notification preferences."
        : "Konto, Sitzung und Benachrichtigungen.",
  };
}

export default function WebSettingsPage() {
  return <WebSettingsContent />;
}
