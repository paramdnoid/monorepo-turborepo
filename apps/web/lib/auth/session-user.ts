import "server-only"

import { getServerAccessToken } from "@/lib/auth/server-token"
import {
  resolveWebPermissionMatrix,
  type WebPermissionMatrix,
} from "@/lib/auth/web-permissions"
import { getTradeSlugFromOrganization } from "@/lib/organization-trade-slug"
import { resolveTradeId } from "@/lib/trades/resolve-trade"
import type { TradeId } from "@/lib/trades/trade-types"

type AccessTokenClaims = {
  name?: string
  email?: string
  email_verified?: boolean
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
  realm_access?: {
    roles?: unknown
  }
  resource_access?: Record<string, { roles?: unknown }>
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
  roles: string[]
  permissions: WebPermissionMatrix
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

function extractRoles(claims: AccessTokenClaims | null): string[] {
  if (!claims) {
    return []
  }

  const roles = new Set<string>()
  const realmRoles = claims.realm_access?.roles
  if (Array.isArray(realmRoles)) {
    for (const role of realmRoles) {
      if (typeof role === "string" && role.trim()) {
        roles.add(role.trim())
      }
    }
  }

  const resourceAccess = claims.resource_access
  if (resourceAccess) {
    for (const resource of Object.values(resourceAccess)) {
      if (!resource || !Array.isArray(resource.roles)) {
        continue
      }
      for (const role of resource.roles) {
        if (typeof role === "string" && role.trim()) {
          roles.add(role.trim())
        }
      }
    }
  }

  return [...roles]
}

/**
 * Gewerk: zuerst `organizations.trade_slug` (DB), sonst JWT — Mapper in Keycloak können hinter der Registrierung liegen.
 */
async function resolveTradeFromSession(claims: AccessTokenClaims | null): Promise<{
  tradeSlug: string | null
  tradeId: TradeId
  tenantId: string | null
}> {
  const tenantId = mapTenantId(claims)
  const jwtTradeSlug = mapTradeSlug(claims)
  const orgTradeSlug = await getTradeSlugFromOrganization(tenantId)
  const tradeSlug = orgTradeSlug ?? jwtTradeSlug

  return {
    tradeSlug,
    tradeId: resolveTradeId(tradeSlug),
    tenantId,
  }
}

export async function getAuthSessionContext(): Promise<AuthSessionContext> {
  const token = await getServerAccessToken()
  const claims = token ? decodeJwtPayload(token) : null
  const { tradeSlug, tradeId, tenantId } = await resolveTradeFromSession(claims)
  const roles = extractRoles(claims)

  return {
    tradeId,
    tradeSlug,
    tenantId,
    roles,
    permissions: resolveWebPermissionMatrix(roles),
  }
}

export async function getAuthSessionUser(): Promise<AuthSessionUser> {
  const token = await getServerAccessToken()
  const claims = token ? decodeJwtPayload(token) : null
  const { tradeSlug, tradeId, tenantId } = await resolveTradeFromSession(claims)
  const roles = extractRoles(claims)

  return {
    name: mapName(claims),
    email: mapEmail(claims),
    avatar: claims?.picture?.trim() || "/logo.png",
    session: {
      tradeId,
      tradeSlug,
      tenantId,
      roles,
      permissions: resolveWebPermissionMatrix(roles),
    },
  }
}

/** OIDC `email_verified` aus dem Access-Token (z. B. Keycloak). */
export async function getAuthSessionEmailVerified(): Promise<boolean> {
  const token = await getServerAccessToken()
  const claims = token ? decodeJwtPayload(token) : null
  return Boolean(claims?.email_verified)
}

const emailShape = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function resolveSessionEmail(claims: AccessTokenClaims | null): string | null {
  if (!claims) return null
  const fromEmail = claims.email?.trim()
  if (fromEmail && emailShape.test(fromEmail)) {
    return fromEmail.toLowerCase()
  }
  const preferred = claims.preferred_username?.trim()
  if (preferred && emailShape.test(preferred)) {
    return preferred.toLowerCase()
  }
  return null
}

/** Echte Login-E-Mail und Mandanten-ID fuer Stripe (keine Platzhalter-Strings). */
export async function getAuthSessionStripeResumeContext(): Promise<{
  email: string | null
  tenantId: string | null
}> {
  const token = await getServerAccessToken()
  const claims = token ? decodeJwtPayload(token) : null
  return { email: resolveSessionEmail(claims), tenantId: mapTenantId(claims) }
}
