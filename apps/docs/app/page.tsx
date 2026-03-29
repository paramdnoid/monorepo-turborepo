import type { Metadata } from "next";

import { DocumentationSections } from "@/components/documentation-sections";
import { getFaqs } from "@web/content/faqs";
import { getUiText } from "@web/content/ui-text";

const ui = getUiText("de");
const faqCount = getFaqs("de").length;

export const metadata: Metadata = {
  title: "Handbuch & Hilfe",
  description: `${ui.landing.footer.brandDescription} Ausfuehrliche Dokumentation mit ${faqCount} haeufigen Fragen zu Funktionen, Gewerken, Preisen und Sicherheit.`,
};

/**
 * ZunftGewerk — Produktdokumentation; Inhalte aus apps/web/content (getUiText, getFaqs, Features, Gewerke).
 */
export default function DocsPage() {
  return <DocumentationSections locale="de" />;
}
