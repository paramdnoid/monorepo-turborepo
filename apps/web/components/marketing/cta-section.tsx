import { CreditCard, Server, ShieldCheck, Timer } from "lucide-react";
import Link from "next/link";

import { FadeIn, StaggerChildren, StaggerItem } from "@/components/marketing/fade-in";
import { GlowBackground } from "@/components/marketing/glow-background";
import { GradientCta } from "@/components/marketing/gradient-cta";
import { GradientText } from "@/components/marketing/gradient-text";
import { SectionContainer } from "@/components/marketing/section-container";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { uiText } from "@/content/ui-text";

const trustItemIcons = [ShieldCheck, Server, CreditCard, Timer] as const;

export function CtaSection() {
  const ctaText = uiText.landingSections.cta;
  const trustItems = trustItemIcons.map((icon, index) => ({
    icon,
    text: ctaText.trustItems[index] ?? "",
  }));

  return (
    <section
      className="relative -mt-10 overflow-hidden py-16 pt-22 sm:-mt-12 sm:py-20 sm:pt-24 md:-mt-16 md:py-32 md:pt-36"
      aria-labelledby="cta-heading"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-36 bg-linear-to-b from-background via-background/80 to-transparent md:h-44"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="from-primary/5 absolute inset-0 bg-linear-to-br via-transparent to-primary/5" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,color-mix(in_oklch,var(--color-primary)_8%,transparent)_0%,transparent_70%)]" />
        <div className="absolute inset-x-0 bottom-0 h-32 from-muted/30 to-transparent bg-linear-to-t" />
      </div>
      <GlowBackground variant="centered" />

      <SectionContainer width="narrow" className="text-center">
        <FadeIn delay={0.1}>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-primary">{ctaText.kicker}</p>
          <h2 id="cta-heading" className="hero-text-gloss font-sans mb-4 text-balance text-[1.9rem] font-extrabold sm:mb-6 sm:text-3xl md:text-4xl lg:text-5xl">
            {ctaText.headingPrefix} <GradientText>{ctaText.headingHighlight}</GradientText>?
          </h2>
        </FadeIn>
        <FadeIn delay={0.2}>
          <p className="mx-auto mb-8 max-w-2xl text-base leading-[1.7] text-muted-foreground sm:mb-10 sm:text-lg">
            {ctaText.description}
          </p>
        </FadeIn>
        <FadeIn delay={0.3}>
          <div className="flex flex-col items-center justify-center gap-3.5 sm:flex-row sm:gap-4">
            <GradientCta href="/onboarding" className="min-h-12 sm:min-h-13">{ctaText.primaryCta}</GradientCta>
            <Button size="lg" variant="outline" className="min-h-12 w-full px-8 text-base sm:min-h-13 sm:w-auto" asChild>
              <Link href="mailto:sales@zunftgewerk.de">{ctaText.secondaryCta}</Link>
            </Button>
          </div>
        </FadeIn>
        <StaggerChildren className="mt-10 flex flex-wrap items-center justify-center gap-2.5 sm:mt-12 sm:gap-3" delay={0.4} staggerDelay={0.06}>
          {trustItems.map((item) => (
            <StaggerItem key={item.text}>
              <Badge variant="secondary" className="gap-2 border border-border/60 bg-background/60 px-3.5 py-2 text-xs font-medium backdrop-blur-sm sm:px-4 sm:text-[13px]">
                <item.icon className="size-3.5 text-primary" aria-hidden />
                {item.text}
              </Badge>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </SectionContainer>
    </section>
  );
}
