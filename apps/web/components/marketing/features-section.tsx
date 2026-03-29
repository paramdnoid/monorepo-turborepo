import { Sparkles } from "lucide-react";

import { FadeIn } from "@/components/marketing/fade-in";
import { GlowBackground } from "@/components/marketing/glow-background";
import { GradientText } from "@/components/marketing/gradient-text";
import { SectionContainer } from "@/components/marketing/section-container";
import { Badge } from "@repo/ui/badge";
import { uiText } from "@/content/ui-text";

import { FeaturesCarouselClient } from "@/components/marketing/features-carousel-client";

export function FeaturesSection() {
  return (
    <section
      id="features"
      className="relative -mt-10 scroll-mt-32 overflow-x-clip bg-muted/20 pb-14 pt-20 md:-mt-14 md:pb-12 md:pt-24"
      aria-labelledby="features-heading"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-36 bg-linear-to-b from-background via-background/80 to-transparent md:h-44"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-36 bg-linear-to-t from-background via-background/85 to-transparent md:h-44"
      />
      <div className="bg-dot-pattern absolute inset-0 opacity-20" aria-hidden />
      <GlowBackground />
      <SectionContainer className="relative z-20">
        <FadeIn className="mx-auto mb-10 max-w-2xl text-center">
          <Badge variant="secondary" className="enterprise-kicker mb-4 border px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em]">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            {uiText.landingSections.features.badge}
          </Badge>
          <h2 id="features-heading" className="hero-text-gloss font-sans mb-3 text-balance text-[1.9rem] font-bold sm:text-3xl md:text-4xl lg:text-5xl">
            {uiText.landingSections.features.headingPrefix}<br /><GradientText>{uiText.landingSections.features.headingHighlight}</GradientText>
          </h2>
          <p className="text-base leading-[1.7] text-muted-foreground md:text-lg">
            {uiText.landingSections.features.description}
          </p>
        </FadeIn>

        <FeaturesCarouselClient />
      </SectionContainer>
    </section>
  );
}
