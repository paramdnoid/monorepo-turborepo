export type WebModuleKey =
  | "overview"
  | "projects"
  | "sales"
  | "customers"
  | "workforce"
  | "painter"
  | "settings";

export type WebModulePermissions = {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
  canBatch: boolean;
};

export type WebPermissionMatrix = Record<WebModuleKey, WebModulePermissions>;

const EDIT_ROLES = [
  "API_USER",
  "WORKFORCE_MANAGER",
  "HR_MANAGER",
  "TENANT_ADMIN",
  "ADMIN",
  "OWNER",
] as const;

const ADMIN_ROLES = ["TENANT_ADMIN", "ADMIN", "OWNER"] as const;

function normalizeRoles(roles: string[]): Set<string> {
  return new Set(roles.map((role) => role.trim().toUpperCase()).filter(Boolean));
}

function hasAnyRole(set: Set<string>, allowed: readonly string[]): boolean {
  return allowed.some((role) => set.has(role));
}

function modulePerm(
  canView: boolean,
  canEdit: boolean,
): WebModulePermissions {
  return {
    canView,
    canEdit,
    canDelete: canEdit,
    canExport: canEdit,
    canBatch: canEdit,
  };
}

function normalizePath(pathname: string): string {
  const base = pathname.split("?")[0] ?? "/web";
  if (base.length > 1 && base.endsWith("/")) {
    return base.slice(0, -1);
  }
  return base;
}

export function resolveWebPermissionMatrix(rolesRaw: string[]): WebPermissionMatrix {
  const roles = normalizeRoles(rolesRaw);
  const hasClaims = roles.size > 0;
  const canViewBase = !hasClaims || roles.size > 0;
  const canEditCore = !hasClaims || hasAnyRole(roles, EDIT_ROLES);
  const canEditAdmin = !hasClaims || hasAnyRole(roles, ADMIN_ROLES);

  return {
    overview: modulePerm(true, true),
    projects: modulePerm(canViewBase, canEditCore),
    sales: modulePerm(canViewBase, canEditCore),
    customers: modulePerm(canViewBase, canEditCore),
    workforce: modulePerm(canViewBase, canEditCore),
    painter: modulePerm(canViewBase, canEditCore),
    settings: modulePerm(true, canEditAdmin),
  };
}

export function getWebModuleFromPath(pathname: string): WebModuleKey {
  const normalized = normalizePath(pathname);
  if (normalized === "/web") {
    return "overview";
  }
  if (normalized.startsWith("/web/projects")) {
    return "projects";
  }
  if (normalized.startsWith("/web/sales")) {
    return "sales";
  }
  if (normalized.startsWith("/web/customers")) {
    return "customers";
  }
  if (
    normalized.startsWith("/web/employees") ||
    normalized.startsWith("/web/scheduling") ||
    normalized.startsWith("/web/work-time")
  ) {
    return "workforce";
  }
  if (normalized.startsWith("/web/painter")) {
    return "painter";
  }
  if (normalized.startsWith("/web/settings")) {
    return "settings";
  }
  return "overview";
}

export function routeRequiresEditPermission(pathname: string): boolean {
  const normalized = normalizePath(pathname);
  if (normalized === "/web/projects") {
    return true;
  }
  if (normalized === "/web/scheduling" || normalized === "/web/work-time") {
    return true;
  }
  if (/^\/web\/sales\/(quotes|invoices)\/[^/]+$/.test(normalized)) {
    return true;
  }
  if (/^\/web\/customers\/[0-9a-f-]{36}$/i.test(normalized)) {
    return true;
  }
  if (/^\/web\/employees\/[0-9a-f-]{36}$/i.test(normalized)) {
    return true;
  }
  return false;
}

export function getWebModuleFallbackHref(moduleKey: WebModuleKey): string {
  if (moduleKey === "projects") return "/web";
  if (moduleKey === "sales") return "/web/sales/quotes";
  if (moduleKey === "customers") return "/web/customers/list";
  if (moduleKey === "workforce") return "/web/employees/list";
  if (moduleKey === "painter") return "/web";
  if (moduleKey === "settings") return "/web";
  return "/web";
}

export type WebRouteGuardDecision =
  | { allowed: true; moduleKey: WebModuleKey }
  | {
      allowed: false;
      moduleKey: WebModuleKey;
      reason: "view" | "edit";
      redirectHref: string;
    };

export function getWebRouteGuardDecision(
  pathname: string,
  permissions: WebPermissionMatrix,
): WebRouteGuardDecision {
  const normalized = normalizePath(pathname);
  const moduleKey = getWebModuleFromPath(normalized);
  const modulePermissions = permissions[moduleKey];
  const fallback = getWebModuleFallbackHref(moduleKey);

  if (!modulePermissions.canView) {
    return {
      allowed: false,
      moduleKey,
      reason: "view",
      redirectHref: fallback,
    };
  }

  if (routeRequiresEditPermission(normalized) && !modulePermissions.canEdit) {
    return {
      allowed: false,
      moduleKey,
      reason: "edit",
      redirectHref: fallback,
    };
  }

  return { allowed: true, moduleKey };
}
