import type { Metadata } from "next";

import { getServerLocale } from "@/lib/i18n/server-locale";
import { SalesReminderOutboxContent } from "@/components/web/sales/reminder-outbox-content";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return {
    title: locale === "en" ? "Reminder outbox" : "Mahn-Outbox",
    description:
      locale === "en"
        ? "Monitoring and retry view for reminder email jobs."
        : "Monitoring- und Retry-Sicht fuer Mahn-E-Mail-Jobs.",
  };
}

export default async function SalesOutboxPage() {
  await getServerLocale();
  return (
    <div className="w-full min-w-0 space-y-6">
      <SalesReminderOutboxContent />
    </div>
  );
}

