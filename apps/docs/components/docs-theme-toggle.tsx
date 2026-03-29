"use client";

import { useSyncExternalStore } from "react";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/utils";

const themeOrder = ["light", "dark", "system"] as const;

const subscribeToNothing = () => () => {};

const labels = {
  light: "Hell",
  dark: "Dunkel",
  system: "System",
} as const;

type DocsThemeToggleProps = {
  className?: string;
};

export function DocsThemeToggle({ className }: DocsThemeToggleProps) {
  const mounted = useSyncExternalStore(subscribeToNothing, () => true, () => false);
  const { theme, setTheme } = useTheme();
  const activeTheme = themeOrder.includes((theme ?? "light") as (typeof themeOrder)[number])
    ? ((theme ?? "light") as (typeof themeOrder)[number])
    : "light";
  const nextIdx = (themeOrder.indexOf(activeTheme) + 1) % themeOrder.length;
  const nextTheme: (typeof themeOrder)[number] = themeOrder[nextIdx] ?? "light";

  const iconMap = {
    light: <SunIcon className="size-4" aria-hidden />,
    dark: <MoonIcon className="size-4" aria-hidden />,
    system: <MonitorIcon className="size-4" aria-hidden />,
  } as const;

  const srLabel = `Designmodus wechseln. Aktuell: ${labels[activeTheme]}, als Nächstes: ${labels[nextTheme]}`;

  if (!mounted) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={cn(
          "pointer-events-none text-muted-foreground hover:text-muted-foreground",
          className,
        )}
        disabled
        aria-label="Designmodus"
      >
        <SunIcon className="size-4" aria-hidden />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={cn("text-muted-foreground hover:text-foreground", className)}
      onClick={() => setTheme(nextTheme ?? "light")}
      aria-label={srLabel}
      title={srLabel}
    >
      {iconMap[activeTheme]}
      <span className="sr-only">{srLabel}</span>
    </Button>
  );
}
