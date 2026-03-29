import { FadeIn } from "@/components/marketing/fade-in";
import { GlowBackground } from "@/components/marketing/glow-background";
import { GradientText } from "@/components/marketing/gradient-text";
import { SectionContainer } from "@/components/marketing/section-container";
import { PricingCards, type PublicPlan } from "@/components/marketing/pricing-cards";
import { uiText } from "@/content/ui-text";

const STATIC_PLANS: PublicPlan[] = [
  {
    tier: "starter",
    name: uiText.landing.pricing.plans[0].name,
    description: uiText.landing.pricing.plans[0].description,
    priceMonthly: 19900,
    priceYearly: 214920,
    trialDays: 30,
    isPopular: true,
    ctaText: uiText.landing.pricing.plans[0].ctaText,
    ctaLink: uiText.landing.pricing.plans[0].ctaLink,
    features: uiText.landing.pricing.plans[0].features.map((label) => ({ label })),
  },
  {
    tier: "professional",
    name: uiText.landing.pricing.plans[1].name,
    description: uiText.landing.pricing.plans[1].description,
    priceMonthly: 39900,
    priceYearly: 430920,
    trialDays: 30,
    isPopular: false,
    ctaText: uiText.landing.pricing.plans[1].ctaText,
    ctaLink: uiText.landing.pricing.plans[1].ctaLink,
    features: uiText.landing.pricing.plans[1].features.map((label) => ({ label })),
  },
];

export function PricingSection() {
  const plans = STATIC_PLANS;
  const hasYearly = plans.some((p) => p.priceYearly != null && p.priceYearly > 0);

  return (
    <section id="pricing" className="relative scroll-mt-16 overflow-x-clip bg-muted/15 py-12 md:py-14" aria-labelledby="pricing-heading">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-36 bg-linear-to-t from-background via-background/85 to-transparent md:h-44"
      />
      <div className="bg-dot-pattern absolute inset-0 opacity-[0.12]" aria-hidden />
      <GlowBackground variant="subtle" />
      <SectionContainer className="relative z-20">
        <FadeIn className="mx-auto mb-8 max-w-2xl text-center">
          <h2 id="pricing-heading" className="hero-text-gloss font-sans mb-3 text-[1.9rem] font-bold sm:text-3xl md:text-4xl lg:text-5xl">
            {uiText.landing.pricing.headingPrefix}<br /><GradientText>{uiText.landing.pricing.headingHighlight}</GradientText>
          </h2>
          <p className="text-base leading-[1.68] text-muted-foreground md:text-lg">
            {uiText.landing.pricing.description}
          </p>
          <div aria-hidden className="premium-divider mx-auto mt-4 w-56" />
        </FadeIn>

        <PricingCards plans={plans} hasYearlyOption={hasYearly} />

        <FadeIn delay={0.2}>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            {uiText.landing.pricing.priceHint}
          </p>
        </FadeIn>
      </SectionContainer>
    </section>
  );
}
