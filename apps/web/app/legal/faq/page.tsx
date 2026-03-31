import type { Metadata } from "next";

import { FaqAnswer } from "@/components/marketing/faq-answer";
import { faqAnswerForJsonLd, getFaqs } from "@/content/faqs";
import { getUiText } from "@/content/ui-text";
import { getServerLocale } from "@/lib/i18n/server-locale";

const legalArticleClass =
  "legal-html max-w-none space-y-4 text-foreground [&_a]:text-primary [&_h1]:mb-6 [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:mt-8 [&_h2]:scroll-mt-28 [&_h2]:text-xl [&_h2]:font-semibold [&_p]:mb-4 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-2";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const text = getUiText(locale).legal.faq;
  return {
    title: text.metaTitle,
    description: text.metaDescription,
  };
}

export default async function LegalFaqPage() {
  const locale = await getServerLocale();
  const text = getUiText(locale).legal.faq;
  const faqs = getFaqs(locale);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: locale,
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faqAnswerForJsonLd(faq.answer) },
    })),
  };

  return (
    <>
      <article className={legalArticleClass}>
        <h1>{text.pageTitle}</h1>
        <p className="text-muted-foreground">{text.pageIntro}</p>
        {faqs.map((faq, index) => (
          <section key={`faq-${index}`}>
            <h2 id={`faq-${index}`}>{faq.question}</h2>
            <FaqAnswer text={faq.answer} />
          </section>
        ))}
      </article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c"),
        }}
      />
    </>
  );
}
