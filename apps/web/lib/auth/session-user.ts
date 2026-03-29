import "server-only"

import { getServerAccessToken } from "@/lib/auth/server-token"
import { resolveTradeId } from "@/lib/trades/resolve-trade"
import type { TradeId } from "@/lib/trades/trade-types"

type AccessTokenClaims = {
  name?: string
  email?: string
  preferred_username?: string
  given_name?: string
  family_name?: string
  picture?: string
  tenant_id?: string | string[]
  trade_slug?: string | string[]
  attributes?: {
    tenant_id?: string[]
    trade_slug?: string[]
  }
}

export type AuthSessionUser = {
  name: string
  email: string
  avatar: string
  session: AuthSessionContext
}

export type AuthSessionContext = {
  tradeId: TradeId
  tradeSlug: string | null
  tenantId: string | null
}

function decodeJwtPayload(token: string): AccessTokenClaims | null {
  const segments = token.split(".")
  if (segments.length < 2) return null

  try {
    const payload = segments[1];
    if (payload === undefined) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/")
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")
    const json = Buffer.from(padded, "base64").toString("utf-8")
    return JSON.parse(json) as AccessTokenClaims
  } catch {
    return null
  }
}

function mapName(claims: AccessTokenClaims | null) {
  if (!claims) return "Angemeldet"
  if (claims.name?.trim()) return claims.name.trim()

  const fullName = [claims.given_name, claims.family_name].filter(Boolean).join(" ").trim()
  if (fullName) return fullName
  if (claims.preferred_username?.trim()) return claims.preferred_username.trim()
  if (claims.email?.trim()) return claims.email.trim()
  return "Angemeldet"
}

function mapEmail(claims: AccessTokenClaims | null) {
  if (!claims) return "Keine E-Mail im Token"
  if (claims.email?.trim()) return claims.email.trim()
  if (claims.preferred_username?.trim()) return claims.preferred_username.trim()
  return "Keine E-Mail im Token"
}

function claimToString(value?: string | string[]) {
  if (!value) return null
  if (typeof value === "string") return value.trim() || null
  for (const candidate of value) {
    const normalized = candidate.trim()
    if (normalized) return normalized
  }
  return null
}

function mapTradeSlug(claims: AccessTokenClaims | null) {
  if (!claims) return null

  return claimToString(claims.trade_slug) ?? claimToString(claims.attributes?.trade_slug) ?? null
}

function mapTenantId(claims: AccessTokenClaims | null) {
  if (!claims) return null

  return claimToString(claims.tenant_id) ?? claimToString(claims.attributes?.tenant_id) ?? null
}

export async function getAuthSessionContext(): Promise<AuthSessionContext> {
  const token = await getServerAccessToken()
  const claims = token ? decodeJwtPayload(token) : null
  const tradeSlug = mapTradeSlug(claims)
  const tenantId = mapTenantId(claims)

  return {
    tradeId: resolveTradeId(tradeSlug),
    tradeSlug,
    tenantId,
  }
}

export async function getAuthSessionUser(): Promise<AuthSessionUser> {
  const token = await getServerAccessToken()
  const claims = token ? decodeJwtPayload(token) : null

  return {
    name: mapName(claims),
    email: mapEmail(claims),
    avatar: claims?.picture?.trim() || "/logo.png",
    session: {
      tradeId: resolveTradeId(mapTradeSlug(claims)),
      tradeSlug: mapTradeSlug(claims),
      tenantId: mapTenantId(claims),
    },
  }
}
