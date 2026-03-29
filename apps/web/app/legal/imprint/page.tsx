import type { Metadata } from "next";

import { getUiText } from "@/content/ui-text";
import { getServerLocale } from "@/lib/i18n/server-locale";

const legalArticleClass =
  "legal-html max-w-none space-y-4 text-foreground [&_a]:text-primary [&_h1]:mb-6 [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:mt-8 [&_h2]:scroll-mt-28 [&_h2]:text-xl [&_h2]:font-semibold [&_p]:mb-4 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-2";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const text = getUiText(locale).legal.imprint;
  return {
    title: text.metaTitle,
    description: text.metaDescription,
  };
}

export default async function ImprintPage() {
  const locale = await getServerLocale();
  const text = getUiText(locale).legal.imprint;

  return (
    <article
      className={legalArticleClass}
      dangerouslySetInnerHTML={{ __html: text.contentHtml }}
    />
  );
}
