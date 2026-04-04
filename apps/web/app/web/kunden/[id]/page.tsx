import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCustomersHeaderMeta } from "@/content/customers-module";
import { getServerLocale } from "@/lib/i18n/server-locale";

import { KundenCustomerDetailContent } from "../kunden-customer-detail-content";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const locale = await getServerLocale();
  const meta = getCustomersHeaderMeta(`/web/kunden/${id}`, locale);
  return {
    title: meta?.title ?? "Kunde",
    description: meta?.subtitle ?? "",
  };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function KundenDetailPage({ params }: PageProps) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    notFound();
  }
  const locale = await getServerLocale();
  return (
    <div className="w-full min-w-0 space-y-6">
      <KundenCustomerDetailContent locale={locale} customerId={id} />
    </div>
  );
}
