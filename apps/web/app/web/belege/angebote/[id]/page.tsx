import type { Metadata } from "next";

import {
  getBelegePageDescription,
  getBelegePageTitle,
} from "@/content/belege-module";
import { getServerLocale } from "@/lib/i18n/server-locale";

import { BelegeSalesDetail } from "../../belege-sales-detail";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const locale = await getServerLocale();
  await params;
  return {
    title: getBelegePageTitle("quotes", locale),
    description: getBelegePageDescription("quotes", locale),
  };
}

export default async function BelegeAngebotDetailPage({ params }: PageProps) {
  const { id } = await params;
  const locale = await getServerLocale();
  return (
    <div className="w-full min-w-0 space-y-6">
      <BelegeSalesDetail locale={locale} mode="quotes" documentId={id} />
    </div>
  );
}
