import { z } from "zod";

/** Gewerke wie auf der Landingpage (`apps/web/content/trades.ts`). */
export const TRADE_SLUGS = ["kaminfeger", "maler", "shk"] as const;

export type TradeSlug = (typeof TRADE_SLUGS)[number];

export const tradeSlugSchema = z.enum(TRADE_SLUGS);
