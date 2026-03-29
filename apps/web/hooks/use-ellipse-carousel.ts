"use client";

import { animate, useMotionValue, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

const TWO_PI = Math.PI * 2;

export function useEllipseCarousel({
  count,
  autoPlayMs = 5000,
  containerRef,
  enabled = true,
}: {
  count: number;
  autoPlayMs?: number;
  containerRef?: React.RefObject<HTMLElement | null>;
  enabled?: boolean;
}) {
  const angleStep = TWO_PI / count;
  const rotation = useMotionValue(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const prefersReduced = useReducedMotion();
  const pausedRef = useRef(false);
  const visibleRef = useRef(true);
  const activeRef = useRef(0);

  useEffect(() => {
    activeRef.current = activeIndex;
  }, [activeIndex]);

  const goTo = useCallback(
    (index: number) => {
      const target = -angleStep * index;
      const current = rotation.get();
      let diff = target - current;
      diff = ((((diff + Math.PI) % TWO_PI) + TWO_PI) % TWO_PI) - Math.PI;
      if (prefersReduced) rotation.set(current + diff);
      else animate(rotation, current + diff, { type: "spring", stiffness: 180, damping: 28, mass: 1.2 });
      setActiveIndex(index);
    },
    [angleStep, rotation, prefersReduced],
  );

  const next = useCallback(() => goTo((activeRef.current + 1) % count), [count, goTo]);
  const prev = useCallback(() => goTo((activeRef.current - 1 + count) % count), [count, goTo]);
  const pauseAutoPlay = useCallback(() => {
    pausedRef.current = true;
  }, []);
  const resumeAutoPlay = useCallback(() => {
    pausedRef.current = false;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (!containerRef?.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      visibleRef.current = !!entry?.isIntersecting;
    }, { threshold: 0.1 });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [containerRef, enabled]);

  useEffect(() => {
    if (!enabled) return;
    if (autoPlayMs <= 0) return;
    const id = window.setInterval(() => {
      if (!pausedRef.current && visibleRef.current) next();
    }, autoPlayMs);
    return () => window.clearInterval(id);
  }, [autoPlayMs, next, enabled]);

  return { rotation, activeIndex, goTo, next, prev, pauseAutoPlay, resumeAutoPlay };
}
