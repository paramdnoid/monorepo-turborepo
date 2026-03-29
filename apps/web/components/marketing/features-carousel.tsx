"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { EllipseCard, EllipseCarousel } from "@/components/marketing/ellipse-carousel";
import { FadeIn } from "@/components/marketing/fade-in";
import { Button } from "@repo/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/onboarding/onboarding-toggle-group";
import { features } from "@/content/features";
import { uiText } from "@/content/ui-text";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { useEllipseCarousel } from "@/hooks/use-ellipse-carousel";

const CAROUSEL_CONFIG = {
  xs: { radius: { x: 150, y: 18 }, card: { w: 248, h: 164 }, height: 250 },
  sm: { radius: { x: 198, y: 24 }, card: { w: 266, h: 174 }, height: 274 },
  md: { radius: { x: 320, y: 42 }, card: { w: 292, h: 186 }, height: 306 },
  lg: { radius: { x: 390, y: 48 }, card: { w: 312, h: 194 }, height: 328 },
  xl: { radius: { x: 440, y: 54 }, card: { w: 328, h: 200 }, height: 340 },
} as const;

export function FeaturesCarousel() {
  const carouselHintId = useId();
  const carouselStatusId = useId();
  const prefersReducedMotion = useReducedMotion();
  const [isInteractive, setIsInteractive] = useState(false);
  const bp = useBreakpoint();
  const cfg = CAROUSEL_CONFIG[bp];
  const isDesktop = bp === "md" || bp === "lg" || bp === "xl";
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setIsInteractive(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const { rotation, activeIndex, goTo, next, prev, pauseAutoPlay, resumeAutoPlay } =
    useEllipseCarousel({
      count: features.length,
      autoPlayMs: prefersReducedMotion ? 0 : 5200,
      containerRef,
      enabled: isInteractive,
    });

  const activeFeature = features[activeIndex]!;

  return (
    <FadeIn>
      <div
        ref={containerRef}
        className="relative px-2 outline-none transition-opacity duration-300 sm:px-4 md:px-14"
        aria-busy={!isInteractive}
        onMouseEnter={isDesktop && isInteractive ? pauseAutoPlay : undefined}
        onMouseLeave={isDesktop && isInteractive ? resumeAutoPlay : undefined}
        onFocusCapture={isInteractive ? pauseAutoPlay : undefined}
        onBlurCapture={(event) => {
          if (!isInteractive) return;
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            resumeAutoPlay();
          }
        }}
        role="region"
        aria-roledescription="carousel"
        aria-label={uiText.landingSections.featuresCarousel.regionAriaLabel}
        aria-describedby={carouselHintId}
        tabIndex={0}
        onKeyDown={(event) => {
          if (!isInteractive) return;
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            prev();
          }
          if (event.key === "ArrowRight") {
            event.preventDefault();
            next();
          }
        }}
      >
        <p id={carouselHintId} className="sr-only">
          {uiText.landingSections.featuresCarousel.hint}
        </p>
        <p id={carouselStatusId} className="sr-only" aria-live="polite" aria-atomic="true">
          {uiText.landingSections.featuresCarousel.activePrefix}: {activeFeature.title} ({activeIndex + 1}{" "}
          {uiText.landingSections.featuresCarousel.of} {features.length})
        </p>
        <p className="mb-3 flex items-center justify-center gap-2 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
          <span
            className={`h-2 w-2 rounded-full ${isInteractive ? "bg-primary/70" : "animate-pulse bg-muted-foreground/50"}`}
            aria-hidden
          />
          {isInteractive
            ? uiText.landingSections.featuresCarousel.interactiveReady
            : uiText.landingSections.featuresCarousel.interactiveLoading}
        </p>
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={prev}
          disabled={!isInteractive}
          className="premium-panel absolute left-0 top-1/2 z-30 hidden h-11 w-11 -translate-y-1/2 md:flex"
          aria-label={`${uiText.landingSections.featuresCarousel.previousLabelPrefix} ${uiText.landingSections.featuresCarousel.activePrefix} ${activeIndex + 1} ${uiText.landingSections.featuresCarousel.of} ${features.length}`}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <motion.div
          drag={isInteractive ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.08}
          onDragStart={isInteractive ? pauseAutoPlay : undefined}
          onDragEnd={(_, info) => {
            if (!isInteractive) return;
            if (info.offset.x < -42) next();
            else if (info.offset.x > 42) prev();
            else goTo(activeIndex);
            resumeAutoPlay();
          }}
          style={{ cursor: "grab", touchAction: "pan-y" }}
          whileDrag={{ cursor: "grabbing" }}
        >
          <EllipseCarousel containerHeight={cfg.height}>
            {features.map((feature, i) => (
              <EllipseCard
                key={feature.title}
                index={i}
                totalCount={features.length}
                rotation={rotation}
                radiusX={cfg.radius.x}
                radiusY={cfg.radius.y}
                onClick={() => goTo(i)}
                cardWidth={cfg.card.w}
                cardHeight={cfg.card.h}
                ariaLabel={`${feature.title} (${i + 1} ${uiText.landingSections.featuresCarousel.of} ${features.length})`}
                isActive={activeIndex === i}
              >
                <div className={`feature-card h-full rounded-2xl p-4 ${activeIndex === i ? "feature-card-active" : ""}`}>
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/8 text-primary ring-1 ring-primary/10">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <p className="font-sans text-[15px] font-bold tracking-tight">{feature.title}</p>
                  <p className="mt-1 text-xs leading-snug text-muted-foreground sm:text-[13px]">{feature.description}</p>
                </div>
              </EllipseCard>
            ))}
          </EllipseCarousel>
        </motion.div>

        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={next}
          disabled={!isInteractive}
          className="premium-panel absolute right-0 top-1/2 z-30 hidden h-11 w-11 -translate-y-1/2 md:flex"
          aria-label={`${uiText.landingSections.featuresCarousel.nextLabelPrefix} ${uiText.landingSections.featuresCarousel.activePrefix} ${activeIndex + 1} ${uiText.landingSections.featuresCarousel.of} ${features.length}`}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>

        {!isDesktop && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button size="sm" variant="outline" onClick={prev} disabled={!isInteractive}>
              {uiText.landingSections.featuresCarousel.mobileBack}
            </Button>
            <Button size="sm" variant="outline" onClick={next} disabled={!isInteractive}>
              {uiText.landingSections.featuresCarousel.mobileNext}
            </Button>
          </div>
        )}

        <div className="mt-5 flex justify-center">
          <ToggleGroup
            type="single"
            value={String(activeIndex)}
            onValueChange={(value) => {
              if (!isInteractive) return;
              if (value !== "") goTo(Number(value));
            }}
            variant="default"
            spacing={1}
            className="premium-panel inline-flex max-w-full items-center overflow-x-auto rounded-full border border-border/60 p-1.5 shadow-sm backdrop-blur-sm"
            aria-label={uiText.landingSections.featuresCarousel.navigationAriaLabel}
            aria-controls={carouselStatusId}
          >
            {features.map((feature, i) => (
              <ToggleGroupItem
                key={feature.title}
                value={String(i)}
                size="sm"
                className="h-9 w-9 rounded-full p-0 text-muted-foreground transition-[color,background-color,box-shadow] hover:text-foreground data-[state=on]:bg-primary data-[state=on]:text-primary-foreground sm:h-10 sm:w-10"
                aria-label={feature.title}
              >
                <feature.icon className="h-4 w-4" />
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div className="mx-auto mt-5 max-w-2xl text-center">
          <ul className="flex flex-wrap justify-center gap-2">
            {activeFeature.benefits.map((benefit) => (
              <li key={benefit} className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                <Check className="h-3 w-3 text-primary" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </FadeIn>
  );
}
