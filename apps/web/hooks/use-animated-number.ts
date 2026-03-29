"use client";

import { useReducedMotion, useSpring, useTransform } from "framer-motion";
import { useEffect, useState } from "react";

export function useAnimatedNumber(value: number, options?: { stiffness?: number; damping?: number; restDelta?: number }) {
  const prefersReduced = useReducedMotion();
  const spring = useSpring(value, {
    stiffness: options?.stiffness ?? 100,
    damping: options?.damping ?? 30,
    restDelta: options?.restDelta ?? 0.01,
  });
  const rounded = useTransform(spring, Math.round);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useEffect(() => {
    if (prefersReduced) return;
    return rounded.on("change", setDisplay);
  }, [rounded, prefersReduced]);

  return prefersReduced ? value : display;
}
