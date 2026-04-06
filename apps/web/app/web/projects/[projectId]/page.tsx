import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getServerLocale } from "@/lib/i18n/server-locale";
import { ProjectHubContent } from "@/components/web/projects/project-hub-content";

type PageProps = { params: Promise<{ projectId: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return {
    title: locale === "en" ? "Project hub" : "Projekt-Hub",
    description:
      locale === "en"
        ? "A single view for project master data, documents and links."
        : "Eine zentrale Sicht auf Projekt-Stammdaten, Belege, Dateien und Verknuepfungen.",
  };
}

export default async function ProjectHubPage({ params }: PageProps) {
  const { projectId } = await params;
  if (!projectId?.trim()) {
    notFound();
  }
  const locale = await getServerLocale();
  return (
    <div className="w-full min-w-0 space-y-6">
      <ProjectHubContent locale={locale} projectId={projectId} />
    </div>
  );
}

