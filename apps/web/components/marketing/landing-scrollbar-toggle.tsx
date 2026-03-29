"use client";

import { useEffect } from "react";

const HIDDEN_SCROLLBAR_CLASS = "landing-scrollbar-hidden";

export function LandingScrollbarToggle() {
  useEffect(() => {
    document.documentElement.classList.add(HIDDEN_SCROLLBAR_CLASS);
    document.body.classList.add(HIDDEN_SCROLLBAR_CLASS);

    return () => {
      document.documentElement.classList.remove(HIDDEN_SCROLLBAR_CLASS);
      document.body.classList.remove(HIDDEN_SCROLLBAR_CLASS);
    };
  }, []);

  return null;
}
