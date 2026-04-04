import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getWebModuleFromPath,
  getWebRouteGuardDecision,
  resolveWebPermissionMatrix,
  routeRequiresEditPermission,
} from "./web-permissions";

describe("resolveWebPermissionMatrix", () => {
  it("grants full access when role claims are missing", () => {
    const matrix = resolveWebPermissionMatrix([]);
    assert.equal(matrix.sales.canView, true);
    assert.equal(matrix.sales.canEdit, true);
    assert.equal(matrix.customers.canBatch, true);
    assert.equal(matrix.settings.canEdit, true);
  });

  it("keeps reader roles in view mode only", () => {
    const matrix = resolveWebPermissionMatrix(["reader"]);
    assert.equal(matrix.sales.canView, true);
    assert.equal(matrix.sales.canEdit, false);
    assert.equal(matrix.projects.canDelete, false);
    assert.equal(matrix.settings.canEdit, false);
  });

  it("allows editor roles for operational modules but not settings admin", () => {
    const matrix = resolveWebPermissionMatrix(["WORKFORCE_MANAGER"]);
    assert.equal(matrix.sales.canEdit, true);
    assert.equal(matrix.customers.canEdit, true);
    assert.equal(matrix.workforce.canEdit, true);
    assert.equal(matrix.settings.canEdit, false);
  });

  it("allows admin roles for settings", () => {
    const matrix = resolveWebPermissionMatrix(["TENANT_ADMIN"]);
    assert.equal(matrix.settings.canEdit, true);
  });
});

describe("route mapping and guard decisions", () => {
  it("maps known route groups to the expected module", () => {
    assert.equal(getWebModuleFromPath("/web"), "overview");
    assert.equal(getWebModuleFromPath("/web/sales/quotes"), "sales");
    assert.equal(getWebModuleFromPath("/web/customers/list"), "customers");
    assert.equal(getWebModuleFromPath("/web/scheduling"), "workforce");
    assert.equal(getWebModuleFromPath("/web/projects"), "projects");
    assert.equal(getWebModuleFromPath("/web/settings"), "settings");
  });

  it("marks edit-sensitive paths as requiring edit permission", () => {
    assert.equal(routeRequiresEditPermission("/web/projects"), true);
    assert.equal(routeRequiresEditPermission("/web/scheduling"), true);
    assert.equal(
      routeRequiresEditPermission("/web/customers/9ea40c51-b286-4b1e-9501-dcf0f4e3db2e"),
      true,
    );
    assert.equal(routeRequiresEditPermission("/web/customers/list"), false);
    assert.equal(routeRequiresEditPermission("/web/sales/quotes"), false);
  });

  it("redirects readers away from edit-sensitive routes", () => {
    const matrix = resolveWebPermissionMatrix(["reader"]);
    const result = getWebRouteGuardDecision("/web/projects", matrix);
    assert.equal(result.allowed, false);
    if (!result.allowed) {
      assert.equal(result.reason, "edit");
      assert.equal(result.redirectHref, "/web");
      assert.equal(result.moduleKey, "projects");
    }
  });
});
