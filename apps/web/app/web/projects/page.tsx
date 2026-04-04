import type { Metadata } from "next";

import { getServerLocale } from "@/lib/i18n/server-locale";

import { ProjectsManagementContent } from "@/components/web/projects/projects-management-content";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return {
    title: locale === "en" ? "Projects" : "Projekte",
    description:
      locale === "en"
        ? "Manage project master data and lifecycle in the web app."
        : "Projekt-Stammdaten und Lebenszyklus in der Web-App verwalten.",
  };
}

export default async function ProjectsPage() {
  const locale = await getServerLocale();
  return (
    <div className="w-full min-w-0 space-y-6">
      <ProjectsManagementContent locale={locale} />
    </div>
  );
}

