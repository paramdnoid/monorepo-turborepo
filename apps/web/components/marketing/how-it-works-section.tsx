import {
  ArrowRight,
  ListOrdered,
  Rocket,
  SlidersHorizontal,
  UserRoundPlus,
} from "lucide-react";

import { FadeIn, StaggerChildren, StaggerItem } from "@/components/marketing/fade-in";
import { GlowBackground } from "@/components/marketing/glow-background";
import { GradientText } from "@/components/marketing/gradient-text";
import { SectionContainer } from "@/components/marketing/section-container";
import { steps } from "@/content/steps";
import { uiText } from "@/content/ui-text";
import { Badge } from "@repo/ui/badge";
import { cn } from "@repo/ui/utils";

const STEP_ICONS = [UserRoundPlus, SlidersHorizontal, Rocket] as const;

/** Gradient-Ring + innerer Kreis — wirkt plastischer als ein dünner Stroke. */
function StepCircleCard({
  step,
  title,
  description,
  icon: Icon,
  className,
}: {
  step: string;
  title: string;
  description: string;
  icon: (typeof STEP_ICONS)[number];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out",
        "mx-auto max-w-[min(100%,19rem)] motion-safe:hover:scale-[1.02] sm:max-w-[20.5rem] md:max-w-[21.5rem] lg:max-w-[22.5rem]",
        className,
      )}
    >
      <div className="rounded-full bg-linear-to-br from-primary/12 via-amber-500/10 to-primary/8 p-[3px] shadow-[0_22px_56px_-32px_color-mix(in_oklch,var(--color-foreground)_45%,transparent)]">
        <article className="relative flex aspect-square w-full flex-col items-center justify-center overflow-hidden rounded-full bg-linear-to-b from-card via-card to-muted/45 px-6 py-8 text-center shadow-[inset_0_1px_0_0_color-mix(in_oklch,var(--color-background)_70%,transparent)] sm:px-7 sm:py-9 md:px-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,color-mix(in_oklch,var(--color-primary)_12%,transparent)_0%,transparent_55%)]"
          />
          <span
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[48%] font-mono text-[clamp(4.5rem,20vw,7rem)] font-black leading-none tabular-nums text-primary/[0.12] select-none"
            aria-hidden
          >
            {step}
          </span>

          <div className="relative z-[1] flex w-full min-w-0 flex-col items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary via-primary to-amber-600 text-primary-foreground shadow-[0_10px_28px_-8px_color-mix(in_oklch,var(--color-primary)_55%,transparent)] ring-[3px] ring-background/95">
              <Icon className="h-7 w-7" aria-hidden strokeWidth={1.75} />
            </div>

            <h3 className="text-[1.05rem] font-bold leading-tight tracking-tight sm:text-lg md:text-xl">
              {title}
            </h3>
            <p className="max-w-[22ch] text-sm leading-relaxed text-muted-foreground text-pretty sm:max-w-[24ch] md:max-w-[26ch]">
              {description}
            </p>
          </div>
        </article>
      </div>
    </div>
  );
}

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="relative -mt-10 scroll-mt-32 overflow-hidden bg-muted/15 py-20 sm:-mt-12 sm:py-24 md:-mt-16 md:py-32 lg:py-36"
      aria-labelledby="how-it-works-heading"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-36 bg-linear-to-b from-background via-background/80 to-transparent md:h-44"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-32 bg-linear-to-t from-background via-background/85 to-transparent md:h-40"
      />
      <div className="bg-dot-pattern absolute inset-0 opacity-[0.11]" aria-hidden />
      <GlowBackground variant="subtle" />

      <SectionContainer className="relative z-20">
        <div className="flex flex-col gap-12 md:gap-16 lg:gap-20">
          <FadeIn className="mx-auto max-w-2xl text-center">
            <Badge
              variant="secondary"
              className="enterprise-kicker mb-4 border px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em]"
            >
              <ListOrdered className="h-3.5 w-3.5 text-primary" aria-hidden />
              {uiText.landingSections.howItWorks.kicker}
            </Badge>
            <h2
              id="how-it-works-heading"
              className="hero-text-gloss font-sans mb-4 text-balance text-[1.9rem] font-extrabold sm:text-3xl md:text-4xl lg:text-5xl"
            >
              {uiText.landingSections.howItWorks.headingPrefix}{" "}
              <GradientText>{uiText.landingSections.howItWorks.headingHighlight}</GradientText>
            </h2>
            <p className="text-base leading-[1.7] text-muted-foreground sm:text-lg md:text-pretty">
              {uiText.landingSections.howItWorks.description}
            </p>
          </FadeIn>

          <div className="relative mx-auto w-full max-w-6xl">
            <div
              aria-hidden
              className="pointer-events-none absolute left-[8%] right-[8%] top-[calc(50%-0.125rem)] z-0 hidden h-0.5 bg-linear-to-r from-transparent via-primary/25 to-transparent md:block lg:left-[6%] lg:right-[6%]"
            />

            <StaggerChildren
              className="relative z-[1] flex flex-col items-center gap-0 md:flex-row md:items-center md:justify-between md:gap-4 lg:gap-6"
              staggerDelay={0.12}
            >
              {steps.flatMap((item, index) => {
                const Icon = STEP_ICONS[index] ?? UserRoundPlus;
                const card = (
                  <StaggerItem
                    key={item.step}
                    className="flex w-full min-w-0 shrink-0 justify-center md:w-auto md:flex-1 md:max-w-none"
                  >
                    <StepCircleCard
                      step={item.step}
                      title={item.title}
                      description={item.description}
                      icon={Icon}
                      className={index > 0 ? "mt-8 md:mt-0" : undefined}
                    />
                  </StaggerItem>
                );

                if (index >= steps.length - 1) {
                  return [card];
                }

                const arrow = (
                  <div
                    key={`how-it-works-arrow-${item.step}`}
                    className="flex shrink-0 items-center justify-center py-4 md:hidden"
                    aria-hidden
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-background/90 text-primary/50 shadow-sm">
                      <ArrowRight className="h-5 w-5" strokeWidth={2} />
                    </div>
                  </div>
                );

                const spacer = (
                  <div
                    key={`how-it-works-spacer-${item.step}`}
                    className="relative z-[2] hidden shrink-0 md:flex md:items-center md:justify-center"
                    aria-hidden
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary/25 bg-background/95 text-primary/55 shadow-md backdrop-blur-sm">
                      <ArrowRight className="h-5 w-5" strokeWidth={2.25} />
                    </div>
                  </div>
                );

                return [card, arrow, spacer];
              })}
            </StaggerChildren>
          </div>
        </div>
      </SectionContainer>
    </section>
  );
}
