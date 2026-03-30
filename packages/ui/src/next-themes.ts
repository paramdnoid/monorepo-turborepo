"use client";

/**
 * Single re-export so apps and @repo/ui share one `next-themes` module instance.
 * Otherwise pnpm can install two copies (different React peer graphs) and
 * ThemeProvider + useTheme() see different contexts — theme toggle becomes a no-op.
 */
export { ThemeProvider, useTheme } from "next-themes";
