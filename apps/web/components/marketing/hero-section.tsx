"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  HeartHandshake,
  LockKeyhole,
  Play,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { FadeIn } from "@/components/marketing/fade-in";
import { GlowBackground } from "@/components/marketing/glow-background";
import { GradientCta } from "@/components/marketing/gradient-cta";
import { GradientText } from "@/components/marketing/gradient-text";
import { SectionContainer } from "@/components/marketing/section-container";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { uiText } from "@/content/ui-text";
import { cn } from "@repo/ui/utils";

export function HeroSection() {
  const text = uiText.landingSections.hero;
  const prefersReducedMotion = useReducedMotion();

  const tilt3d =
    "transition-transform duration-700 ease-out motion-safe:lg:[transform:rotateY(-14deg)_rotateX(5deg)] motion-safe:lg:group-hover:[transform:rotateY(-6deg)_rotateX(2deg)]";

  return (
    <section
      className="relative min-h-screen overflow-x-clip overflow-y-visible"
      aria-labelledby="hero-heading"
    >
      <GlowBackground />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-44 bg-linear-to-b from-transparent via-background/80 to-background md:h-56"
      />
      <SectionContainer className="relative z-20 flex min-h-screen flex-col justify-center pb-16 pt-30 sm:pt-28 lg:pt-26">
        {/* lg: Grid mit überlappenden Spalten — kein position:absolute, damit Bild sichtbar bleibt und FadeIn/Viewport zuverlässig ist */}
        <div className="relative flex flex-col gap-10 lg:grid lg:min-h-[min(88vh,40rem)] lg:grid-cols-12 lg:items-center lg:gap-0 lg:py-4">
          <div className="relative z-30 min-w-0 bg-transparent text-center lg:col-span-8 lg:col-start-1 lg:row-start-1 lg:pr-2 lg:text-left">
            <div className="relative z-10 w-full max-w-[46ch] lg:max-w-[min(65ch,calc(100vw-2.5rem))]">
              <FadeIn delay={0.1}>
                <Badge
                  variant="secondary"
                  className="enterprise-kicker mb-6 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] sm:text-[11px]"
                >
                  <Sparkles className="h-3 w-3 text-primary" aria-hidden />
                  {text.badge}
                </Badge>
              </FadeIn>
              <FadeIn delay={0.2}>
                <h1
                  id="hero-heading"
                  className="hero-title-brutal hero-text-gloss text-balance text-[2.05rem] leading-[0.92] sm:text-[2.45rem] md:text-[2.85rem] lg:text-[3.2rem] lg:leading-[0.9]"
                >
                  {/* Zwei Zeilen: erste Zeile gesamt, zweite Highlight — kein Umbruch mitten in Zeile 1 ab sm */}
                  <span className="block sm:whitespace-nowrap">
                    {text.headingPrefix}
                  </span>
                  <span className="mt-1 block sm:mt-1.5">
                    <GradientText>{text.headingHighlight}</GradientText>
                  </span>
                </h1>
              </FadeIn>
              <FadeIn delay={0.35}>
                <p className="mx-auto mb-9 mt-5 max-w-[46ch] text-[0.97rem] leading-relaxed text-muted-foreground lg:mx-0">
                  {text.description}
                </p>
              </FadeIn>
              <FadeIn delay={0.5}>
                <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
                  <GradientCta
                    href="/onboarding"
                    className="min-h-12 text-[0.95rem] sm:min-h-13"
                  >
                    {text.primaryCta}
                  </GradientCta>
                  <Button
                    size="lg"
                    variant="outline"
                    className="min-h-12 w-full gap-2 sm:w-auto"
                    asChild
                  >
                    <Link href="#trades">
                      <Play className="h-4 w-4" aria-hidden />
                      {text.secondaryCta}
                    </Link>
                  </Button>
                </div>
              </FadeIn>
              <FadeIn delay={0.65}>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2.5 text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground sm:text-[11px] lg:justify-start">
                  <span className="flex items-center gap-2">
                    <ShieldCheck
                      className="h-4 w-4 shrink-0 text-primary"
                      aria-hidden
                    />
                    {text.trustDsgvo}
                  </span>
                  <span
                    className="hidden h-1 w-1 shrink-0 rounded-full bg-muted-foreground/40 sm:inline"
                    aria-hidden
                  />
                  <span className="flex items-center gap-2">
                    <LockKeyhole
                      className="h-4 w-4 shrink-0 text-primary"
                      aria-hidden
                    />
                    {text.trustEncryption}
                  </span>
                  <span
                    className="hidden h-1 w-1 shrink-0 rounded-full bg-muted-foreground/40 sm:inline"
                    aria-hidden
                  />
                  <span className="flex items-center gap-2">
                    <Zap
                      className="h-4 w-4 shrink-0 text-primary"
                      aria-hidden
                    />
                    {text.trustPayment}
                  </span>
                  <span
                    className="hidden h-1 w-1 shrink-0 rounded-full bg-muted-foreground/40 sm:inline"
                    aria-hidden
                  />
                  <span className="flex items-center gap-2">
                    <HeartHandshake
                      className="h-4 w-4 shrink-0 text-primary"
                      aria-hidden
                    />
                    {text.trustSupport}
                  </span>
                </div>
              </FadeIn>
              <FadeIn delay={0.75}>
                <div className="mt-10 grid max-w-xl gap-3 sm:grid-cols-2 lg:max-w-none">
                  <div className="hero-metric-card px-4 py-2.5 text-left sm:py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {text.metricTempoLabel}
                    </p>
                    <p className="mt-1 font-sans text-[1.4rem] font-bold leading-none tracking-tight text-foreground sm:text-[1.5rem]">
                      {text.metricTempoValue}
                    </p>
                    <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                      {text.metricTempoDescription}
                    </p>
                  </div>
                  <div className="hero-metric-card px-4 py-2.5 text-left sm:py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {text.metricControlLabel}
                    </p>
                    <p className="mt-1 font-sans text-[1.4rem] font-bold leading-none tracking-tight text-foreground sm:text-[1.5rem]">
                      {text.metricControlValue}
                    </p>
                    <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                      {text.metricControlDescription}
                    </p>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>

          {/* Kein FadeIn: vermeidet opacity:0 / Viewport-Glitches; Bild bleibt sofort sichtbar */}
          <div className="relative z-0 mx-auto flex min-h-0 w-full min-w-0 max-w-[calc(100vw-1.5rem)] justify-center sm:max-w-xl lg:col-span-7 lg:col-start-6 lg:row-start-1 lg:-ml-[clamp(1rem,4.5vw,3rem)] lg:max-w-none lg:justify-end lg:pl-1 lg:pr-0">
            <motion.div
              className="relative mx-auto w-full max-w-[calc(100vw-1.5rem)] motion-safe:lg:translate-x-3 motion-safe:xl:translate-x-5 motion-safe:2xl:translate-x-7 lg:ml-auto lg:mr-0 lg:max-w-[min(64vw,52rem)] xl:max-w-[min(60vw,54rem)] 2xl:max-w-[min(56vw,56rem)]"
              initial={
                prefersReducedMotion
                  ? { opacity: 1, y: 0 }
                  : { opacity: 1, y: 12 }
              }
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.45 }}
            >
              {/* perspective auf eigenem Block, damit rotateY/rotateX sichtbar bleiben (nicht mit scale auf derselben Ebene mischen) */}
              <div className="mx-auto w-full max-w-xl py-2 lg:w-full lg:max-w-none lg:[perspective:960px] lg:px-2 lg:py-6">
                <div className="group relative lg:[transform-style:preserve-3d]">
                  <div
                    className={cn(
                      "relative will-change-transform",
                      prefersReducedMotion ? "" : tilt3d,
                    )}
                  >
                    <div className="hero-dashboard-frame overflow-hidden rounded-xl ring-0">
                      <Image
                        src="/hero-dashboard-light.png"
                        alt={text.dashboardPreviewAlt}
                        width={1024}
                        height={636}
                        priority
                        sizes="(max-width: 1023px) 100vw, (max-width: 1536px) 66vw, 1000px"
                        className="block h-auto w-full rounded-none align-top dark:hidden"
                      />
                      <Image
                        src="/hero-dashboard-dark.png"
                        alt={text.dashboardPreviewAlt}
                        width={1024}
                        height={636}
                        priority
                        sizes="(max-width: 1023px) 100vw, (max-width: 1536px) 66vw, 1000px"
                        className="hidden h-auto w-full rounded-none align-top dark:block"
                      />
                    </div>
                    <div
                      aria-hidden
                      className="premium-panel absolute -bottom-4 right-1 z-10 hidden rounded-lg px-3 py-1.5 text-left shadow-md backdrop-blur-md md:block lg:-bottom-5 lg:right-3 lg:shadow-lg"
                    >
                      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {text.liveStatusLabel}
                      </p>
                      <p className="mt-0.5 font-sans text-[1.38rem] leading-none font-bold text-foreground">
                        {text.liveStatusTitle}
                      </p>
                      <p className="mt-0.5 text-[9px] text-muted-foreground">
                        {text.liveStatusDescription}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </SectionContainer>
    </section>
  );
}
