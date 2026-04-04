import { getTrades, type TradeFeatureItem } from "@/content/trades";
import type { Locale } from "@/lib/i18n/locale";

/** URL segments under `/web/painter/…` — English kebab-case. Trade slug remains `maler` in `content/trades`. */
export const PAINTER_MODULE_SEGMENTS = [
  "area-calculation",
  "gaeb-support",
  "digital-project-folders",
  "employee-management",
  "scheduling",
  "substrate-inspection",
  "resource-management-wholesale",
  "datev-interface",
  "color-management",
  "room-book-bill-of-quantities",
] as const;

export type PainterModuleSegment = (typeof PAINTER_MODULE_SEGMENTS)[number];

const ICON_BY_SEGMENT: Record<PainterModuleSegment, string> = {
  "area-calculation": "Ruler",
  "gaeb-support": "FileSpreadsheet",
  "digital-project-folders": "FolderOpen",
  "employee-management": "Users",
  scheduling: "CalendarDays",
  "substrate-inspection": "Layers",
  "resource-management-wholesale": "PackageSearch",
  "datev-interface": "FileOutput",
  "color-management": "Palette",
  "room-book-bill-of-quantities": "Building2",
};

export function getAllPainterModuleSegments(): readonly PainterModuleSegment[] {
  return PAINTER_MODULE_SEGMENTS;
}

export function isPainterModuleSegment(
  value: string,
): value is PainterModuleSegment {
  return (PAINTER_MODULE_SEGMENTS as readonly string[]).includes(value);
}

function getPainterTrade(locale: Locale) {
  const trades = getTrades(locale);
  return trades.find((t) => t.slug === "maler");
}

export type PainterModuleEntry = {
  segment: PainterModuleSegment;
  href: string;
  feature: TradeFeatureItem;
};

export function getPainterModulesOrdered(locale: Locale): PainterModuleEntry[] {
  const painter = getPainterTrade(locale);
  if (!painter) return [];

  return PAINTER_MODULE_SEGMENTS.map((segment) => {
    const icon = ICON_BY_SEGMENT[segment];
    const feature = painter.tradeFeatures.find((f) => f.icon === icon);
    if (!feature) {
      throw new Error(`Painter tradeFeatures missing icon ${icon}`);
    }
    return {
      segment,
      href: `/web/painter/${segment}`,
      feature,
    };
  });
}

export function getPainterModuleBySegment(
  locale: Locale,
  segment: string,
): PainterModuleEntry | null {
  if (!isPainterModuleSegment(segment)) return null;
  const painter = getPainterTrade(locale);
  if (!painter) return null;
  const icon = ICON_BY_SEGMENT[segment];
  const feature = painter.tradeFeatures.find((f) => f.icon === icon);
  if (!feature) return null;
  return { segment, href: `/web/painter/${segment}`, feature };
}
