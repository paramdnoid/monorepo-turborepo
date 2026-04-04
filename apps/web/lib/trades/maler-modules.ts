import { getTrades, type TradeFeatureItem } from "@/content/trades";
import type { Locale } from "@/lib/i18n/locale";

/** URL segments under `/web/maler/…` — English kebab-case. */
export const MALER_MODULE_SEGMENTS = [
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

export type MalerModuleSegment = (typeof MALER_MODULE_SEGMENTS)[number];

const ICON_BY_SEGMENT: Record<MalerModuleSegment, string> = {
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

export function getAllMalerModuleSegments(): readonly MalerModuleSegment[] {
  return MALER_MODULE_SEGMENTS;
}

export function isMalerModuleSegment(
  value: string,
): value is MalerModuleSegment {
  return (MALER_MODULE_SEGMENTS as readonly string[]).includes(value);
}

function getMalerTrade(locale: Locale) {
  const trades = getTrades(locale);
  return trades.find((t) => t.slug === "maler");
}

export type MalerModuleEntry = {
  segment: MalerModuleSegment;
  href: string;
  feature: TradeFeatureItem;
};

export function getMalerModulesOrdered(locale: Locale): MalerModuleEntry[] {
  const maler = getMalerTrade(locale);
  if (!maler) return [];

  return MALER_MODULE_SEGMENTS.map((segment) => {
    const icon = ICON_BY_SEGMENT[segment];
    const feature = maler.tradeFeatures.find((f) => f.icon === icon);
    if (!feature) {
      throw new Error(`Maler tradeFeatures missing icon ${icon}`);
    }
    return {
      segment,
      href: `/web/maler/${segment}`,
      feature,
    };
  });
}

export function getMalerModuleBySegment(
  locale: Locale,
  segment: string,
): MalerModuleEntry | null {
  if (!isMalerModuleSegment(segment)) return null;
  const maler = getMalerTrade(locale);
  if (!maler) return null;
  const icon = ICON_BY_SEGMENT[segment];
  const feature = maler.tradeFeatures.find((f) => f.icon === icon);
  if (!feature) return null;
  return { segment, href: `/web/maler/${segment}`, feature };
}
