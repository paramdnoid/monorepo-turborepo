"use client";

import { useEffect, useState } from "react";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "@repo/ui/next-themes";

import { useAppLocale } from "@/components/locale-provider";
import { Button } from "@repo/ui/button";
import { getUiText } from "@/content/ui-text";
import { cn } from "@repo/ui/utils";

type ThemeToggleProps = {
  className?: string;
};

const themeOrder = ["light", "dark", "system"] as const;

export function ThemeToggle({ className }: ThemeToggleProps) {
  const locale = useAppLocale();
  const uiText = getUiText(locale);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const { theme, setTheme } = useTheme();
  const activeTheme = themeOrder.includes((theme ?? "light") as (typeof themeOrder)[number])
    ? ((theme ?? "light") as (typeof themeOrder)[number])
    : "light";
  const nextTheme = themeOrder[(themeOrder.indexOf(activeTheme) + 1) % themeOrder.length];

  const themeLabelMap = {
    light: uiText.common.themeModeLight,
    dark: uiText.common.themeModeDark,
    system: uiText.common.themeModeSystem,
  } as const;

  const iconMap = {
    light: <SunIcon className="size-4" aria-hidden />,
    dark: <MoonIcon className="size-4" aria-hidden />,
    system: <MonitorIcon className="size-4" aria-hidden />,
  } as const;

  const srLabel = `${uiText.common.cycleThemeMode}. ${themeLabelMap[activeTheme as keyof typeof themeLabelMap]} -> ${themeLabelMap[nextTheme as keyof typeof themeLabelMap]}`;

  const handleThemeChange = () => {
    setTheme(nextTheme ?? "light");
    document.cookie = `theme-preference=${nextTheme}; path=/; max-age=31536000`;
  };

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
        aria-label={uiText.common.cycleThemeMode}
        title={uiText.common.cycleThemeMode}
      >
        <SunIcon className="size-4" aria-hidden />
        <span className="sr-only">{uiText.common.cycleThemeMode}</span>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={cn("text-muted-foreground hover:text-foreground", className)}
      onClick={handleThemeChange}
      aria-label={srLabel}
      title={srLabel}
    >
      {iconMap[activeTheme]}
      <span className="sr-only">{srLabel}</span>
    </Button>
  );
}
