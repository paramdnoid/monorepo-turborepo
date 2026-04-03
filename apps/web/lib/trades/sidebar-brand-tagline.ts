import { getTrades } from "@/content/trades";
import type { Locale } from "@/lib/i18n/locale";
import type { TradeId } from "@/lib/trades/trade-types";

/**
 * Zweite Zeile unter dem Markennamen in der Sidebar: „HANDWERK.“ + angezeigter Gewerk-Name.
 * Nutzt die gleichen Bezeichnungen wie die Marketing-Gewerke (`content/trades`).
 */
export function getSidebarBrandTagline(
  tradeId: TradeId,
  locale: Locale,
  tradeSlug: string | null,
): string {
  const trades = getTrades(locale);
  const trade = trades.find((t) => t.slug === tradeId);
  const label =
    trade?.name ??
    (tradeSlug?.trim() ? tradeSlug.trim() : null) ??
    String(tradeId);
  return `HANDWERK. ${label}`;
}
