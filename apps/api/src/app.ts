import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { TRADE_SLUGS } from "@repo/api-contracts";

import { createAuthMiddleware } from "./auth/middleware.js";
import { createOrgMiddleware } from "./auth/org-middleware.js";
import { createVerifyOrThrowNotConfigured } from "./auth/verify-token.js";
import type { AuthContext } from "./auth/verify-token.js";
import { loadEnv } from "./env.js";
import { getOptionalDb } from "./db.js";
import { requestContextMiddleware } from "./middleware/request-context.js";
import {
  createCatalogImportDetailHandler,
  createCatalogImportPatchHandler,
  createCatalogImportPostHandler,
  createCatalogImportsListHandler,
  createCatalogSupplierPostHandler,
  createCatalogSuppliersListHandler,
} from "./routes/catalog.js";
import {
  createGaebDetailHandler,
  createGaebExportGetHandler,
  createGaebImportPostHandler,
  createGaebListHandler,
  createGaebPatchHandler,
} from "./routes/gaeb.js";
import { meHandler } from "./routes/me.js";
import {
  createOrganizationLogoGetHandler,
  createOrganizationLogoPostHandler,
  createOrganizationPatchHandler,
} from "./routes/organization.js";
import {
  createProjectAssetDeleteHandler,
  createProjectAssetDownloadHandler,
  createProjectAssetPostHandler,
  createProjectAssetsListHandler,
} from "./routes/project-assets.js";
import { createProjectsListHandler } from "./routes/projects.js";
import {
  createSalesInvoiceDetailHandler,
  createSalesInvoiceLineDeleteHandler,
  createSalesInvoiceLinePatchHandler,
  createSalesInvoiceLinePostHandler,
  createSalesInvoiceLinesReorderHandler,
  createSalesInvoicePatchHandler,
  createSalesInvoicePdfHandler,
  createSalesInvoiceFromQuotePostHandler,
  createSalesInvoicePostHandler,
  createSalesInvoicesListHandler,
  createSalesQuoteDetailHandler,
  createSalesQuoteLineDeleteHandler,
  createSalesQuoteLinePatchHandler,
  createSalesQuoteLinePostHandler,
  createSalesQuoteLinesReorderHandler,
  createSalesQuotePatchHandler,
  createSalesQuotePdfHandler,
  createSalesQuotePostHandler,
  createSalesQuotesListHandler,
} from "./routes/sales.js";
import {
  createSchedulingAssignmentDeleteHandler,
  createSchedulingAssignmentPostHandler,
  createSchedulingAssignmentsIcsHandler,
  createSchedulingAssignmentsListHandler,
  createSchedulingDayHandler,
} from "./routes/scheduling.js";
import {
  createCustomerAddressDeleteHandler,
  createCustomerAddressPatchHandler,
  createCustomerAddressPostHandler,
  createCustomerDetailHandler,
  createCustomerPatchHandler,
  createCustomerPostHandler,
  createCustomerAddressesListHandler,
  createCustomersListHandler,
} from "./routes/customers.js";
import { createEmployeeActivityListHandler } from "./routes/employee-activity-log.js";
import {
  createEmployeeAttachmentDeleteHandler,
  createEmployeeAttachmentDownloadHandler,
  createEmployeeAttachmentPostHandler,
  createEmployeeAttachmentsListHandler,
  createEmployeeDeleteHandler,
  createEmployeeDetailHandler,
  createEmployeePatchHandler,
  createEmployeeProfileImageDeleteHandler,
  createEmployeeProfileImageGetHandler,
  createEmployeeProfileImagePostHandler,
  createEmployeeRelationshipDeleteHandler,
  createEmployeeRelationshipsListHandler,
  createEmployeeRelationshipUpsertHandler,
  createEmployeeSkillCatalogListHandler,
  createEmployeeSkillCatalogPostHandler,
  createEmployeeSkillLinksGetHandler,
  createEmployeeSkillLinksPutHandler,
  createEmployeePostHandler,
  createEmployeeSickListHandler,
  createEmployeeSickPostHandler,
  createEmployeeVacationDecisionPatchHandler,
  createEmployeeVacationListHandler,
  createEmployeeVacationPostHandler,
  createEmployeesBatchArchiveHandler,
  createEmployeesExportHandler,
  createEmployeesListHandler,
} from "./routes/employees.js";
import {
  createDatevBookingsExportHandler,
  createDatevSettingsGetHandler,
  createDatevSettingsPatchHandler,
} from "./routes/datev.js";
import { createSyncHandler } from "./routes/sync.js";

function isDevEnv(): boolean {
  return process.env.NODE_ENV === "development";
}

export type CreateAppOptions = {
  /** Test: eigene JWT-Prüfung (z. B. lokaler JWKS). */
  verifyAccessToken?: (token: string) => Promise<AuthContext>;
  /** Test / Worker: DB-Factory. */
  getDb?: () => ReturnType<typeof getOptionalDb>;
};

export function createApp(options?: CreateAppOptions) {
  const env = loadEnv();
  const verify =
    options?.verifyAccessToken ?? createVerifyOrThrowNotConfigured(env);

  const getDb = options?.getDb ?? getOptionalDb;
  const authMiddleware = createAuthMiddleware(verify);
  const orgMiddleware = createOrgMiddleware(getDb);
  const syncHandler = createSyncHandler(getDb);
  const projectsListHandler = createProjectsListHandler(getDb);
  const gaebImportPost = createGaebImportPostHandler(getDb);
  const gaebListHandler = createGaebListHandler(getDb);
  const gaebDetailHandler = createGaebDetailHandler(getDb);
  const gaebPatchHandler = createGaebPatchHandler(getDb);
  const gaebExportGet = createGaebExportGetHandler(getDb);
  const projectAssetsList = createProjectAssetsListHandler(getDb);
  const projectAssetPost = createProjectAssetPostHandler(getDb);
  const projectAssetDownload = createProjectAssetDownloadHandler(getDb);
  const projectAssetDelete = createProjectAssetDeleteHandler(getDb);
  const catalogSuppliersList = createCatalogSuppliersListHandler(getDb);
  const catalogSupplierPost = createCatalogSupplierPostHandler(getDb);
  const catalogImportPost = createCatalogImportPostHandler(getDb);
  const catalogImportsList = createCatalogImportsListHandler(getDb);
  const catalogImportDetail = createCatalogImportDetailHandler(getDb);
  const catalogImportPatch = createCatalogImportPatchHandler(getDb);
  const salesQuotesList = createSalesQuotesListHandler(getDb);
  const salesQuotePost = createSalesQuotePostHandler(getDb);
  const salesInvoiceFromQuotePost =
    createSalesInvoiceFromQuotePostHandler(getDb);
  const salesQuoteLinePost = createSalesQuoteLinePostHandler(getDb);
  const salesQuoteLinesReorder = createSalesQuoteLinesReorderHandler(getDb);
  const salesQuoteLinePatch = createSalesQuoteLinePatchHandler(getDb);
  const salesQuoteLineDelete = createSalesQuoteLineDeleteHandler(getDb);
  const salesQuoteDetail = createSalesQuoteDetailHandler(getDb);
  const salesQuotePdf = createSalesQuotePdfHandler(getDb);
  const salesQuotePatch = createSalesQuotePatchHandler(getDb);
  const salesInvoicesList = createSalesInvoicesListHandler(getDb);
  const salesInvoicePost = createSalesInvoicePostHandler(getDb);
  const salesInvoiceLinePost = createSalesInvoiceLinePostHandler(getDb);
  const salesInvoiceLinesReorder = createSalesInvoiceLinesReorderHandler(getDb);
  const salesInvoiceLinePatch = createSalesInvoiceLinePatchHandler(getDb);
  const salesInvoiceLineDelete = createSalesInvoiceLineDeleteHandler(getDb);
  const salesInvoiceDetail = createSalesInvoiceDetailHandler(getDb);
  const salesInvoicePdf = createSalesInvoicePdfHandler(getDb);
  const salesInvoicePatch = createSalesInvoicePatchHandler(getDb);
  const organizationPatch = createOrganizationPatchHandler(getDb);
  const organizationLogoPost = createOrganizationLogoPostHandler(getDb);
  const organizationLogoGet = createOrganizationLogoGetHandler();
  const datevSettingsGet = createDatevSettingsGetHandler(getDb);
  const datevSettingsPatch = createDatevSettingsPatchHandler(getDb);
  const datevBookingsExport = createDatevBookingsExportHandler(getDb);
  const customersList = createCustomersListHandler(getDb);
  const customerAddressesList = createCustomerAddressesListHandler(getDb);
  const customerPost = createCustomerPostHandler(getDb);
  const customerDetail = createCustomerDetailHandler(getDb);
  const customerPatch = createCustomerPatchHandler(getDb);
  const customerAddressPost = createCustomerAddressPostHandler(getDb);
  const customerAddressPatch = createCustomerAddressPatchHandler(getDb);
  const customerAddressDelete = createCustomerAddressDeleteHandler(getDb);
  const employeesList = createEmployeesListHandler(getDb);
  const employeesExport = createEmployeesExportHandler(getDb);
  const employeesBatchArchive = createEmployeesBatchArchiveHandler(getDb);
  const employeePost = createEmployeePostHandler(getDb);
  const employeeDetail = createEmployeeDetailHandler(getDb);
  const employeePatch = createEmployeePatchHandler(getDb);
  const employeeDelete = createEmployeeDeleteHandler(getDb);
  const employeeSkillCatalogList = createEmployeeSkillCatalogListHandler(getDb);
  const employeeSkillCatalogPost = createEmployeeSkillCatalogPostHandler(getDb);
  const employeeSkillLinksGet = createEmployeeSkillLinksGetHandler(getDb);
  const employeeSkillLinksPut = createEmployeeSkillLinksPutHandler(getDb);
  const employeeRelationshipsList = createEmployeeRelationshipsListHandler(getDb);
  const employeeRelationshipUpsert = createEmployeeRelationshipUpsertHandler(getDb);
  const employeeRelationshipDelete = createEmployeeRelationshipDeleteHandler(getDb);
  const employeeProfileImageGet = createEmployeeProfileImageGetHandler(getDb);
  const employeeProfileImagePost = createEmployeeProfileImagePostHandler(getDb);
  const employeeProfileImageDelete = createEmployeeProfileImageDeleteHandler(getDb);
  const employeeAttachmentsList = createEmployeeAttachmentsListHandler(getDb);
  const employeeAttachmentPost = createEmployeeAttachmentPostHandler(getDb);
  const employeeAttachmentDownload = createEmployeeAttachmentDownloadHandler(getDb);
  const employeeAttachmentDelete = createEmployeeAttachmentDeleteHandler(getDb);
  const employeeVacationList = createEmployeeVacationListHandler(getDb);
  const employeeVacationPost = createEmployeeVacationPostHandler(getDb);
  const employeeVacationDecisionPatch =
    createEmployeeVacationDecisionPatchHandler(getDb);
  const employeeSickList = createEmployeeSickListHandler(getDb);
  const employeeSickPost = createEmployeeSickPostHandler(getDb);
  const employeeActivityList = createEmployeeActivityListHandler(getDb);
  const schedulingDay = createSchedulingDayHandler(getDb);
  const schedulingAssignmentsList = createSchedulingAssignmentsListHandler(getDb);
  const schedulingAssignmentPost = createSchedulingAssignmentPostHandler(getDb);
  const schedulingAssignmentDelete = createSchedulingAssignmentDeleteHandler(getDb);
  const schedulingAssignmentsIcs = createSchedulingAssignmentsIcsHandler(getDb);

  const app = new Hono();

  /** Desktop (Vite :5173) und Web (:3000) rufen die API cross-origin auf — sonst „Failed to fetch“ (CORS). */
  const corsOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    ...(process.env.API_CORS_ORIGINS?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? []),
  ];
  app.use(
    "*",
    cors({
      origin: corsOrigins,
      allowHeaders: ["Authorization", "Content-Type"],
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
      maxAge: 86400,
    }),
  );

  app.use("*", requestContextMiddleware());

  app.onError((err, c) => {
    const requestId = c.get("requestId");
    console.error(
      JSON.stringify({
        level: "error",
        service: "zunftgewerk-api",
        requestId,
        msg: err instanceof Error ? err.message : String(err),
        ...(isDevEnv() && err instanceof Error && err.stack
          ? { stack: err.stack }
          : {}),
      }),
    );
    return c.json(
      { error: "internal_server_error", code: "INTERNAL_SERVER_ERROR" },
      500,
    );
  });

  app.get("/health", (c) =>
    c.json({
      status: "ok",
      service: "zunftgewerk-api",
      trades: TRADE_SLUGS,
    }),
  );

  app.get("/v1/health/db", async (c) => {
    const db = getDb();
    if (!db) {
      return c.json({ ok: false, reason: "missing_database_url" }, 503);
    }
    try {
      await db.execute(sql`select 1`);
      return c.json({ ok: true });
    } catch {
      return c.json({ ok: false, reason: "database_unreachable" }, 503);
    }
  });

  /** Kubernetes/Loadbalancer: 200 nur wenn DB erreichbar (Auth nicht nötig). */
  app.get("/ready", async (c) => {
    const db = getDb();
    if (!db) {
      return c.json({ ready: false, reason: "missing_database_url" }, 503);
    }
    try {
      await db.execute(sql`select 1`);
      return c.json({ ready: true });
    } catch {
      return c.json({ ready: false, reason: "database_unreachable" }, 503);
    }
  });

  const v1 = new Hono();
  v1.use("*", authMiddleware);
  v1.get("/me", orgMiddleware, meHandler);
  v1.get("/organization/logo", orgMiddleware, organizationLogoGet);
  v1.post("/organization/logo", orgMiddleware, organizationLogoPost);
  v1.patch("/organization", orgMiddleware, organizationPatch);
  v1.get("/customers", orgMiddleware, customersList);
  v1.get("/customers/addresses", orgMiddleware, customerAddressesList);
  v1.post("/customers", orgMiddleware, customerPost);
  v1.get("/customers/:id", orgMiddleware, customerDetail);
  v1.patch("/customers/:id", orgMiddleware, customerPatch);
  v1.post("/customers/:id/addresses", orgMiddleware, customerAddressPost);
  v1.patch(
    "/customers/:id/addresses/:addressId",
    orgMiddleware,
    customerAddressPatch,
  );
  v1.delete(
    "/customers/:id/addresses/:addressId",
    orgMiddleware,
    customerAddressDelete,
  );
  v1.get("/employees", orgMiddleware, employeesList);
  v1.get("/employees/export", orgMiddleware, employeesExport);
  v1.post("/employees/batch", orgMiddleware, employeesBatchArchive);
  v1.get("/employees/skills/catalog", orgMiddleware, employeeSkillCatalogList);
  v1.post("/employees/skills/catalog", orgMiddleware, employeeSkillCatalogPost);
  v1.post("/employees", orgMiddleware, employeePost);
  v1.get("/employees/:id/activity", orgMiddleware, employeeActivityList);
  v1.get("/employees/:id", orgMiddleware, employeeDetail);
  v1.patch("/employees/:id", orgMiddleware, employeePatch);
  v1.delete("/employees/:id", orgMiddleware, employeeDelete);
  v1.get("/employees/:id/skills", orgMiddleware, employeeSkillLinksGet);
  v1.put("/employees/:id/skills", orgMiddleware, employeeSkillLinksPut);
  v1.get("/employees/:id/relationships", orgMiddleware, employeeRelationshipsList);
  v1.post("/employees/:id/relationships", orgMiddleware, employeeRelationshipUpsert);
  v1.delete(
    "/employees/:id/relationships/:relationshipId",
    orgMiddleware,
    employeeRelationshipDelete,
  );
  v1.get("/employees/:id/profile-image", orgMiddleware, employeeProfileImageGet);
  v1.post("/employees/:id/profile-image", orgMiddleware, employeeProfileImagePost);
  v1.delete("/employees/:id/profile-image", orgMiddleware, employeeProfileImageDelete);
  v1.get("/employees/:id/attachments", orgMiddleware, employeeAttachmentsList);
  v1.post("/employees/:id/attachments", orgMiddleware, employeeAttachmentPost);
  v1.get(
    "/employees/:id/attachments/:attachmentId",
    orgMiddleware,
    employeeAttachmentDownload,
  );
  v1.delete(
    "/employees/:id/attachments/:attachmentId",
    orgMiddleware,
    employeeAttachmentDelete,
  );
  v1.get("/employees/:id/vacation", orgMiddleware, employeeVacationList);
  v1.post("/employees/:id/vacation", orgMiddleware, employeeVacationPost);
  v1.patch(
    "/employees/:id/vacation/:vacationId",
    orgMiddleware,
    employeeVacationDecisionPatch,
  );
  v1.get("/employees/:id/sick", orgMiddleware, employeeSickList);
  v1.post("/employees/:id/sick", orgMiddleware, employeeSickPost);
  v1.get("/scheduling/day", orgMiddleware, schedulingDay);
  v1.get("/scheduling/assignments", orgMiddleware, schedulingAssignmentsList);
  v1.post("/scheduling/assignments", orgMiddleware, schedulingAssignmentPost);
  v1.delete(
    "/scheduling/assignments/:id",
    orgMiddleware,
    schedulingAssignmentDelete,
  );
  v1.get("/scheduling/assignments.ics", orgMiddleware, schedulingAssignmentsIcs);
  v1.get("/datev/settings", orgMiddleware, datevSettingsGet);
  v1.patch("/datev/settings", orgMiddleware, datevSettingsPatch);
  v1.get("/datev/export/bookings.csv", orgMiddleware, datevBookingsExport);
  v1.post("/sync", orgMiddleware, syncHandler);
  v1.get("/projects", orgMiddleware, projectsListHandler);
  v1.get(
    "/projects/:projectId/assets/:assetId",
    orgMiddleware,
    projectAssetDownload,
  );
  v1.delete(
    "/projects/:projectId/assets/:assetId",
    orgMiddleware,
    projectAssetDelete,
  );
  v1.get("/projects/:projectId/assets", orgMiddleware, projectAssetsList);
  v1.post("/projects/:projectId/assets", orgMiddleware, projectAssetPost);
  v1.post("/gaeb/imports", orgMiddleware, gaebImportPost);
  v1.get("/gaeb/imports", orgMiddleware, gaebListHandler);
  v1.get("/gaeb/imports/:id", orgMiddleware, gaebDetailHandler);
  v1.patch("/gaeb/imports/:id", orgMiddleware, gaebPatchHandler);
  v1.get("/gaeb/imports/:id/export", orgMiddleware, gaebExportGet);
  v1.get("/catalog/suppliers", orgMiddleware, catalogSuppliersList);
  v1.post("/catalog/suppliers", orgMiddleware, catalogSupplierPost);
  v1.post("/catalog/imports", orgMiddleware, catalogImportPost);
  v1.get("/catalog/imports", orgMiddleware, catalogImportsList);
  v1.get("/catalog/imports/:id", orgMiddleware, catalogImportDetail);
  v1.patch("/catalog/imports/:id", orgMiddleware, catalogImportPatch);
  v1.get("/sales/quotes", orgMiddleware, salesQuotesList);
  v1.post("/sales/quotes", orgMiddleware, salesQuotePost);
  v1.post(
    "/sales/quotes/:id/invoices",
    orgMiddleware,
    salesInvoiceFromQuotePost,
  );
  v1.post("/sales/quotes/:id/lines", orgMiddleware, salesQuoteLinePost);
  v1.put(
    "/sales/quotes/:id/lines/reorder",
    orgMiddleware,
    salesQuoteLinesReorder,
  );
  v1.patch(
    "/sales/quotes/:id/lines/:lineId",
    orgMiddleware,
    salesQuoteLinePatch,
  );
  v1.delete(
    "/sales/quotes/:id/lines/:lineId",
    orgMiddleware,
    salesQuoteLineDelete,
  );
  v1.get("/sales/quotes/:id/pdf", orgMiddleware, salesQuotePdf);
  v1.get("/sales/quotes/:id", orgMiddleware, salesQuoteDetail);
  v1.patch("/sales/quotes/:id", orgMiddleware, salesQuotePatch);
  v1.get("/sales/invoices", orgMiddleware, salesInvoicesList);
  v1.post("/sales/invoices", orgMiddleware, salesInvoicePost);
  v1.post("/sales/invoices/:id/lines", orgMiddleware, salesInvoiceLinePost);
  v1.put(
    "/sales/invoices/:id/lines/reorder",
    orgMiddleware,
    salesInvoiceLinesReorder,
  );
  v1.patch(
    "/sales/invoices/:id/lines/:lineId",
    orgMiddleware,
    salesInvoiceLinePatch,
  );
  v1.delete(
    "/sales/invoices/:id/lines/:lineId",
    orgMiddleware,
    salesInvoiceLineDelete,
  );
  v1.get("/sales/invoices/:id/pdf", orgMiddleware, salesInvoicePdf);
  v1.get("/sales/invoices/:id", orgMiddleware, salesInvoiceDetail);
  v1.patch("/sales/invoices/:id", orgMiddleware, salesInvoicePatch);

  app.route("/v1", v1);

  return app;
}
