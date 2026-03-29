"use client";

import { motion } from "framer-motion";
import { HeartHandshake, LockKeyhole, Play, ShieldCheck, Sparkles, Zap } from "lucide-react";
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

export function HeroSection() {
  const text = uiText.landingSections.hero;

  return (
    <section className="relative min-h-screen overflow-hidden" aria-labelledby="hero-heading">
      <GlowBackground />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-44 bg-linear-to-b from-transparent via-background/80 to-background md:h-56"
      />
      <SectionContainer className="relative z-20 flex min-h-screen flex-col justify-center pb-16 pt-30 sm:pt-28 lg:pt-26">
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.22fr] lg:gap-8">
          <div className="text-center lg:text-left">
            <FadeIn delay={0.1}>
              <Badge variant="secondary" className="enterprise-kicker mb-6 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] sm:text-[11px]">
                <Sparkles className="h-3 w-3 text-primary" />
                {text.badge}
              </Badge>
            </FadeIn>
            <FadeIn delay={0.2}>
              <h1 id="hero-heading" className="hero-title-brutal hero-text-gloss text-[2.05rem] leading-[0.9] sm:text-[2.45rem] md:text-[2.85rem] lg:text-[3.2rem]">
                <span className="block">{text.headingPrefix}</span>
                <span className="block">
                  <GradientText>{text.headingHighlight}</GradientText>
                </span>
              </h1>
            </FadeIn>
            <FadeIn delay={0.35}>
              <p className="mx-auto mb-8 mt-5 max-w-[44ch] text-[0.97rem] leading-[1.65] text-muted-foreground lg:mx-0">
                {text.description}
              </p>
            </FadeIn>
            <FadeIn delay={0.5}>
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <GradientCta href="/onboarding" className="min-h-12 text-[0.95rem] sm:min-h-13">
                  {text.primaryCta}
                </GradientCta>
                <Button size="lg" variant="outline" className="min-h-12 w-full gap-2 sm:w-auto" asChild>
                  <Link href="#trades">
                    <Play className="h-4 w-4" />
                    {text.secondaryCta}
                  </Link>
                </Button>
              </div>
            </FadeIn>
            <FadeIn delay={0.65}>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-2.5 text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground sm:text-[11px] lg:justify-start">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  {text.trustDsgvo}
                </span>
                <span className="hidden sm:inline text-border">|</span>
                <span className="flex items-center gap-2">
                  <LockKeyhole className="h-4 w-4 text-primary" />
                  {text.trustEncryption}
                </span>
                <span className="hidden sm:inline text-border">|</span>
                <span className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  {text.trustPayment}
                </span>
                <span className="hidden sm:inline text-border">|</span>
                <span className="flex items-center gap-2">
                  <HeartHandshake className="h-4 w-4 text-primary" />
                  {text.trustSupport}
                </span>
              </div>
            </FadeIn>
            <FadeIn delay={0.75}>
              <div className="mt-6 grid max-w-xl gap-3 sm:grid-cols-2">
                <div className="premium-panel rounded-xl px-4 py-3 text-left">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {text.metricTempoLabel}
                  </p>
                  <p className="mt-1 font-sans text-[1.55rem] font-bold leading-none text-foreground">
                    {text.metricTempoValue}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{text.metricTempoDescription}</p>
                </div>
                <div className="premium-panel rounded-xl px-4 py-3 text-left">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {text.metricControlLabel}
                  </p>
                  <p className="mt-1 font-sans text-[1.55rem] font-bold leading-none text-foreground">
                    {text.metricControlValue}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{text.metricControlDescription}</p>
                </div>
              </div>
            </FadeIn>
          </div>

          <FadeIn delay={0.5} direction="left">
            <motion.div
              className="relative mx-auto w-full max-w-[calc(100vw-1.5rem)] perspective-[520px] sm:max-w-xl sm:perspective-[600px] lg:ml-auto lg:max-w-[min(60vw,54rem)] xl:max-w-[min(58vw,58rem)]"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7 }}
            >
              <div className="group relative transition-transform duration-700 ease-out sm:transform-[rotateY(-14deg)_rotateX(5deg)] hover:sm:transform-[rotateY(-5deg)_rotateX(2deg)]">
                <div className="premium-panel-strong overflow-hidden rounded-xl p-1">
                  <Image
                    src="/hero-dashboard-light.png"
                    alt={text.dashboardPreviewAlt}
                    width={1024}
                    height={636}
                    priority
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 60vw, 760px"
                    className="rounded-lg dark:hidden"
                  />
                  <Image
                    src="/hero-dashboard-dark.png"
                    alt={text.dashboardPreviewAlt}
                    width={1024}
                    height={636}
                    priority
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 60vw, 760px"
                    className="hidden rounded-lg dark:block"
                  />
                </div>
              </div>
              <div
                aria-hidden
                className="premium-panel absolute -bottom-5 right-1 z-20 hidden rounded-lg px-3 py-1.5 text-left shadow-md backdrop-blur-md md:block lg:-bottom-6 lg:right-2 lg:transform-[rotateY(-14deg)_rotateX(5deg)_translateZ(24px)]"
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
            </motion.div>
          </FadeIn>
        </div>
      </SectionContainer>
    </section>
  );
}
