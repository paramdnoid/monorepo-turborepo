"use client";

import { type MouseEvent, useCallback } from "react";

export function useAnchorScroll(getOffset: (href: string, isDesktop: boolean) => number) {
  const scrollToAnchor = useCallback(
    (href: string) => {
      if (!href.startsWith("#")) return;
      const target = document.querySelector<HTMLElement>(href);
      if (!target) return;
      const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
      const top = target.getBoundingClientRect().top + window.scrollY - getOffset(href, isDesktop);
      window.scrollTo({ top, behavior: "smooth" });
      if (window.location.hash !== href) window.history.replaceState(null, "", href);
    },
    [getOffset],
  );

  const handleNavLinkClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, href: string) => {
      if (!href.startsWith("#")) return;
      event.preventDefault();
      scrollToAnchor(href);
    },
    [scrollToAnchor],
  );

  return { handleNavLinkClick, scrollToAnchor };
}
