import type { AuthContext } from "./verify-token.js";

const WORKFORCE_EDIT_ROLES = [
  "API_USER",
  "WORKFORCE_MANAGER",
  "HR_MANAGER",
  "TENANT_ADMIN",
  "ADMIN",
  "OWNER",
] as const;
const WORKFORCE_DELETE_ROLES = [
  "WORKFORCE_MANAGER",
  "HR_MANAGER",
  "TENANT_ADMIN",
  "ADMIN",
  "OWNER",
] as const;
const VACATION_DECISION_ROLES = WORKFORCE_DELETE_ROLES;
const SICK_CONFIDENTIAL_ROLES = [
  "HR_MANAGER",
  "TENANT_ADMIN",
  "ADMIN",
  "OWNER",
] as const;

function normalizedRoles(auth: AuthContext): Set<string> {
  return new Set((auth.roles ?? []).map((role) => role.trim().toUpperCase()));
}

function hasAnyRole(auth: AuthContext, roles: readonly string[]): boolean {
  const set = normalizedRoles(auth);
  if (set.size === 0) {
    return false;
  }
  return roles.some((role) => set.has(role));
}

function hasRoleClaims(auth: AuthContext): boolean {
  return normalizedRoles(auth).size > 0;
}

export function canEditEmployees(auth: AuthContext): boolean {
  if (!hasRoleClaims(auth)) {
    return true;
  }
  return hasAnyRole(auth, WORKFORCE_EDIT_ROLES);
}

export function canDeleteEmployees(auth: AuthContext): boolean {
  if (!hasRoleClaims(auth)) {
    return true;
  }
  return hasAnyRole(auth, WORKFORCE_DELETE_ROLES);
}

export function canDecideVacation(auth: AuthContext): boolean {
  if (!hasRoleClaims(auth)) {
    return true;
  }
  return hasAnyRole(auth, VACATION_DECISION_ROLES);
}

export function canViewSickConfidential(auth: AuthContext): boolean {
  return hasAnyRole(auth, SICK_CONFIDENTIAL_ROLES);
}

export function canCreateSickConfidential(auth: AuthContext): boolean {
  return canViewSickConfidential(auth);
}

