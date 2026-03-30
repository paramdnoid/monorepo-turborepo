import { DEFAULT_TRADE_ID, TRADE_IDS, type KnownTradeId } from "./trade-types";

const TRADE_SYNONYMS: Record<string, KnownTradeId> = {
  kaminfeger: "kaminfeger",
  schornsteinfeger: "kaminfeger",
  chimney_sweep: "kaminfeger",
  maler: "maler",
  painter: "maler",
  shk: "shk",
  sanitaer: "shk",
  sanitar: "shk",
  "sanitär": "shk",
  "sanitaer-heizung-klima": "shk",
  hvac: "shk",
}

export function isTradeId(value: string): value is KnownTradeId {
  return TRADE_IDS.includes(value as KnownTradeId)
}

export function resolveTradeId(value?: string | null): KnownTradeId {
  if (!value) return DEFAULT_TRADE_ID

  const normalized = value.trim().toLowerCase()
  if (isTradeId(normalized)) return normalized

  return TRADE_SYNONYMS[normalized] ?? DEFAULT_TRADE_ID
}
