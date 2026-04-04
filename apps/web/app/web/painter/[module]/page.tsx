import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getAllPainterModuleSegments,
  getPainterModuleBySegment,
} from "@/lib/trades/painter-modules";
import { getServerLocale } from "@/lib/i18n/server-locale";
import { ColorManagementContent } from "../color-management-content";
import { DatevInterfaceContent } from "../datev-interface-content";
import { DigitalProjectFoldersContent } from "../digital-project-folders-content";
import { EmployeeManagementContent } from "../employee-management-content";
import { GaebSupportContent } from "../gaeb-support-content";
import { ResourceManagementWholesaleContent } from "../resource-management-wholesale-content";
import { SchedulingContent } from "../scheduling-content";

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

  if (segment === "employee-management") {
    return <EmployeeManagementContent locale={locale} />;
  }

  if (segment === "scheduling") {
    return <SchedulingContent locale={locale} feature={entry.feature} />;
  }

  if (segment === "datev-interface") {
    return <DatevInterfaceContent locale={locale} feature={entry.feature} />;
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

  if (segment === "resource-management-wholesale") {
    return <ResourceManagementWholesaleContent locale={locale} />;
  }

  const placeholder =
    locale === "en"
      ? "This module is a preview — functionality will follow step by step."
      : "Dieses Modul ist eine Vorschau — die Funktionen folgen schrittweise.";

  return (
    <div className="w-full min-w-0 space-y-6">
      <section className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
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
