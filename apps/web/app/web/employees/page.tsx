import type { Metadata } from "next";

import { getServerLocale } from "@/lib/i18n/server-locale";

import { WorkforceModuleLandingContent } from "@/components/web/workforce/workforce-module-landing-content";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return {
    title: locale === "en" ? "Team & planning" : "Team & Planung",
    description:
      locale === "en"
        ? "Module entry for employees, availability, and scheduling."
        : "Moduleinstieg fuer Mitarbeitende, Verfuegbarkeit und Terminplanung.",
  };
}

export default function EmployeesRootPage() {
  return <WorkforceModuleLandingContent />;
}
