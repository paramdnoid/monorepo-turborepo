"use client";

import { useState } from "react";

import { FadeIn } from "@/components/marketing/fade-in";
import { GlowBackground } from "@/components/marketing/glow-background";
import { GradientText } from "@/components/marketing/gradient-text";
import { SectionContainer } from "@/components/marketing/section-container";
import { SecondaryTrades } from "@/components/marketing/trades/secondary-trades";
import { TradeContent } from "@/components/marketing/trades/trade-content";
import { trades } from "@/content/trades";
import { uiText } from "@/content/ui-text";

export function TradesSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeTrade = trades[activeIndex]!;

  return (
    <section
      id="trades"
      className="relative -mt-14 scroll-mt-40 overflow-hidden pb-14 pt-24 md:-mt-20 md:pb-24 md:pt-30"
      aria-labelledby="trades-heading"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-44 bg-linear-to-b from-background via-background/85 to-transparent md:h-56" />
        <div className="absolute inset-x-0 bottom-0 h-44 bg-linear-to-t from-background via-background/85 to-transparent md:h-56" />
      </div>
      <GlowBackground variant="subtle" />

      <SectionContainer className="relative">
        <FadeIn className="mx-auto mb-12 max-w-xl text-center md:mb-16">
          <h2
            id="trades-heading"
            className="hero-text-gloss font-sans mb-3 text-[1.9rem] font-extrabold tracking-tight sm:text-3xl md:mb-4 md:text-4xl lg:text-5xl"
          >
            {uiText.landingSections.trades.headingPrefix} <GradientText>{uiText.landingSections.trades.headingHighlight}</GradientText>
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed text-balance sm:text-lg">
            {uiText.landingSections.trades.description}
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <TradeContent
            trade={activeTrade}
            activeSlug={activeTrade.slug}
            onSelect={(slug) => {
              const index = trades.findIndex((trade) => trade.slug === slug);
              if (index >= 0) setActiveIndex(index);
            }}
          />
        </FadeIn>

        <FadeIn delay={0.2}>
          <SecondaryTrades />
        </FadeIn>
      </SectionContainer>
    </section>
  );
}
