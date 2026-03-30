import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { CtaSection } from "@/components/marketing/cta-section";
import { FeaturesSection } from "@/components/marketing/features-section";
import { HeroSection } from "@/components/marketing/hero-section";
import { HowItWorksSection } from "@/components/marketing/how-it-works-section";
import { EmailVerifyQueryBanner } from "@/components/marketing/email-verify-query-banner";
import { LandingScrollbarToggle } from "@/components/marketing/landing-scrollbar-toggle";
import { PricingSection } from "@/components/marketing/pricing-section";
import { TradesSection } from "@/components/marketing/trades-section";
import { getFaqs } from "@/content/faqs";
import { getUiText } from "@/content/ui-text";
import { getServerLocale } from "@/lib/i18n/server-locale";

type LandingPageProps = {
  searchParams?: Promise<{ emailVerify?: string }>;
};

export default async function LandingPage({ searchParams }: LandingPageProps) {
  const resolvedSearch = searchParams ? await searchParams : {};
  const emailVerifyStatus = resolvedSearch.emailVerify;

  const locale = await getServerLocale();
  const ui = getUiText(locale);
  const faqs = getFaqs(locale);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";

  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "ZunftGewerk",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, iOS, Android, Windows, macOS, Linux",
    description: ui.landing.footer.brandDescription,
    url: siteUrl,
    inLanguage: locale,
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: locale,
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <div className="min-h-screen">
      <EmailVerifyQueryBanner status={emailVerifyStatus} />
      <LandingScrollbarToggle />
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <HeroSection />
        <TradesSection />
        <FeaturesSection />
        <HowItWorksSection />
        <PricingSection />
        <CtaSection />
      </main>
      <SiteFooter />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c"),
        }}
      />
    </div>
  );
}
