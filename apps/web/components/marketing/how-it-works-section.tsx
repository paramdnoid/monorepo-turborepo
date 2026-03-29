import { FadeIn, StaggerChildren, StaggerItem } from "@/components/marketing/fade-in";
import { GradientText } from "@/components/marketing/gradient-text";
import { SectionContainer } from "@/components/marketing/section-container";
import { steps } from "@/content/steps";
import { uiText } from "@/content/ui-text";

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="relative -mt-10 overflow-hidden py-16 pt-22 sm:-mt-12 sm:py-20 sm:pt-24 md:-mt-16 md:py-28 md:pt-32"
      aria-labelledby="how-it-works-heading"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-36 bg-linear-to-b from-background via-background/80 to-transparent md:h-44"
      />
      <SectionContainer>
        <FadeIn className="mx-auto mb-12 max-w-2xl text-center md:mb-16">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-primary">
            {uiText.landingSections.howItWorks.kicker}
          </p>
          <h2 id="how-it-works-heading" className="hero-text-gloss font-sans mb-4 text-[1.9rem] font-extrabold sm:text-3xl md:text-4xl lg:text-5xl">
            {uiText.landingSections.howItWorks.headingPrefix}{" "}
            <GradientText>{uiText.landingSections.howItWorks.headingHighlight}</GradientText>
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
            {uiText.landingSections.howItWorks.description}
          </p>
        </FadeIn>

        <StaggerChildren className="mx-auto grid max-w-7xl gap-7 md:grid-cols-3 md:gap-8" staggerDelay={0.15}>
          {steps.map((item) => (
            <StaggerItem key={item.step}>
              <div className="group relative text-center">
                <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-linear-to-br from-primary/10 to-primary/5 ring-1 ring-primary/12">
                  <span className="animate-gradient-x bg-linear-to-r from-primary to-amber-500 bg-clip-text text-3xl font-extrabold text-transparent">{item.step}</span>
                </div>
                <h3 className="font-sans mb-3 text-lg font-bold">{item.title}</h3>
                <p className="mx-auto max-w-xs text-sm leading-relaxed text-muted-foreground">{item.description}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </SectionContainer>
    </section>
  );
}
