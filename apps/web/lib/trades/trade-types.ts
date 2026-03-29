import type { LucideIcon } from "lucide-react"

export const TRADE_IDS = ["kaminfeger", "maler", "shk"] as const

export type KnownTradeId = (typeof TRADE_IDS)[number]
export type TradeId = KnownTradeId | (string & {})

export const DEFAULT_TRADE_ID: KnownTradeId = "kaminfeger"

export type TradeNavItem = {
  id: string
  title: string
  url: string
  icon: LucideIcon
  group?: string
}

export type DashboardKpiIconVariant = "users" | "user-check" | "user-x" | "user-plus"

export type DashboardKpi = {
  label: string
  value: string
  hint: string
  /** Optional: icon in KPI cards when keyword matching is not enough */
  iconVariant?: DashboardKpiIconVariant
}

export type DashboardListWidget = {
  title: string
  description: string
  actionLabel: string
  items: readonly string[]
}

export type TradeDashboardModule = {
  id: TradeId
  label: string
  description: string
  navItems: readonly TradeNavItem[]
  coreKpis: readonly DashboardKpi[]
  focusAreas: readonly string[]
  widgets: readonly DashboardListWidget[]
}
