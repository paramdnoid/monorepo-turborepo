import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getAllPainterModuleSegments,
  getPainterModuleBySegment,
} from "@/lib/trades/painter-modules";
import { getServerLocale } from "@/lib/i18n/server-locale";
import { AreaCalculationContent } from "@/components/web/painter/area-calculation-content";
import { ColorManagementContent } from "@/components/web/painter/color-management-content";
import { DatevInterfaceContent } from "@/components/web/painter/datev-interface-content";
import { DigitalProjectFoldersContent } from "@/components/web/painter/digital-project-folders-content";
import { GaebSupportContent } from "@/components/web/painter/gaeb-support-content";
import { ResourceManagementWholesaleContent } from "@/components/web/painter/resource-management-wholesale-content";
import { RoomBookBillOfQuantitiesContent } from "@/components/web/painter/room-book-bill-of-quantities-content";
import { SubstrateInspectionContent } from "@/components/web/painter/substrate-inspection-content";

type PainterModulePageProps = {
  params: Promise<{ module: string }>;
};

export function generateStaticParams() {
  return getAllPainterModuleSegments().map((module) => ({ module }));
}

export async function generateMetadata({
  params,
}: PainterModulePageProps): Promise<Metadata> {
  const { module: segment } = await params;
  const locale = await getServerLocale();
  const entry = getPainterModuleBySegment(locale, segment);
  if (!entry) {
    return { title: "Module" };
  }
  return {
    title: entry.feature.label,
    description: entry.feature.description,
  };
}

export default async function PainterModulePage({ params }: PainterModulePageProps) {
  const { module: segment } = await params;
  const locale = await getServerLocale();
  const entry = getPainterModuleBySegment(locale, segment);
  if (!entry) {
    notFound();
  }

  if (segment === "datev-interface") {
    return <DatevInterfaceContent locale={locale} feature={entry.feature} />;
  }

  if (segment === "area-calculation") {
    return <AreaCalculationContent locale={locale} />;
  }

  if (segment === "gaeb-support") {
    return <GaebSupportContent locale={locale} />;
  }

  if (segment === "color-management") {
    return <ColorManagementContent locale={locale} />;
  }

  if (segment === "digital-project-folders") {
    return <DigitalProjectFoldersContent locale={locale} />;
  }

  if (segment === "substrate-inspection") {
    return <SubstrateInspectionContent locale={locale} />;
  }

  if (segment === "resource-management-wholesale") {
    return <ResourceManagementWholesaleContent locale={locale} />;
  }

  if (segment === "room-book-bill-of-quantities") {
    return <RoomBookBillOfQuantitiesContent locale={locale} />;
  }

  const placeholder =
    locale === "en"
      ? "This module is a preview — functionality will follow step by step."
      : "Dieses Modul ist eine Vorschau — die Funktionen folgen schrittweise.";

  return (
    <div className="w-full min-w-0 space-y-6">
      <section className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <h3 className="mb-2 text-base font-semibold tracking-tight">
          {locale === "en" ? "Note" : "Hinweis"}
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {placeholder}
        </p>
      </section>
    </div>
  );
}
