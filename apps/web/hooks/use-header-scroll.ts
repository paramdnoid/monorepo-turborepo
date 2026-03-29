"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { HEADER_SCROLL_THRESHOLD, SCROLL_THROTTLE_MS } from "@/lib/constants";

export function useHeaderScroll() {
  const [scrolled, setScrolled] = useState(false);
  const rafId = useRef<number>(0);
  const lastScrollTime = useRef(0);

  const handleScroll = useCallback(() => {
    const now = performance.now();
    if (now - lastScrollTime.current < SCROLL_THROTTLE_MS) {
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        setScrolled(window.scrollY > HEADER_SCROLL_THRESHOLD);
        lastScrollTime.current = performance.now();
      });
      return;
    }
    lastScrollTime.current = now;
    setScrolled(window.scrollY > HEADER_SCROLL_THRESHOLD);
  }, []);

  useEffect(() => {
    const initId = requestAnimationFrame(handleScroll);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      cancelAnimationFrame(initId);
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(rafId.current);
    };
  }, [handleScroll]);

  return scrolled;
}
