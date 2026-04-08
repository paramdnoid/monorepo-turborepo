import { Buffer } from "node:buffer";

import { expect, test, type BrowserContext } from "@playwright/test";

import {
  buildPlaywrightWebAccessToken,
  E2E_ACCESS_TOKEN_COOKIE_NAME,
  E2E_LOCALE_COOKIE_NAME,
} from "./helpers/e2e-access-token";

const SUPPLIER_ID = "11111111-1111-1111-1111-111111111111";
const BATCH_ID = "22222222-2222-2222-2222-222222222222";
const LINE_ID = "33333333-3333-3333-3333-333333333333";

async function addWebSessionCookie(context: BrowserContext): Promise<void> {
  await context.addCookies([
    {
      name: E2E_ACCESS_TOKEN_COOKIE_NAME,
      value: buildPlaywrightWebAccessToken(),
      domain: "127.0.0.1",
      path: "/",
    },
    {
      name: E2E_LOCALE_COOKIE_NAME,
      value: "de",
      domain: "127.0.0.1",
      path: "/",
    },
  ]);
}

type BatchSummary = {
  id: string;
  supplierId: string;
  filename: string;
  sourceFormat: string;
  status: "pending_review" | "approved";
  fileSha256: string;
  articleCount: number;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  purgeAfterAt: string;
  parseErrors: null;
  warnings: null;
};

test.describe("Ressourcenmanagement & Grosshandel (Katalog-UI)", () => {
  test("Lieferant, Upload, Vorschau und Freigabe (BFF gemockt)", async ({
    page,
    context,
  }) => {
    let batchSummaries: BatchSummary[] = [];
    let batchDetailStatus: "pending_review" | "approved" = "pending_review";

    await addWebSessionCookie(context);

    await page.route("**/api/web/catalog/**", async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const path = url.pathname;
      const method = req.method();

      if (path.endsWith("/api/web/catalog/suppliers") && method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            suppliers: [
              {
                id: SUPPLIER_ID,
                name: "E2E Lieferant",
                sourceKind: "datanorm",
                createdAt: "2026-01-01T00:00:00.000Z",
              },
            ],
          }),
        });
      }

      if (path.endsWith("/api/web/catalog/suppliers") && method === "POST") {
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: SUPPLIER_ID,
            name: "E2E Lieferant",
            sourceKind: "datanorm",
            createdAt: "2026-01-01T00:00:00.000Z",
          }),
        });
      }

      if (path.endsWith("/api/web/catalog/imports") && method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ batches: batchSummaries }),
        });
      }

      if (path.endsWith("/api/web/catalog/imports") && method === "POST") {
        batchDetailStatus = "pending_review";
        batchSummaries = [
          {
            id: BATCH_ID,
            supplierId: SUPPLIER_ID,
            filename: "e2e.txt",
            sourceFormat: "datanorm",
            status: "pending_review",
            fileSha256: "aa".repeat(32),
            articleCount: 1,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
            approvedAt: null,
            purgeAfterAt: "2030-01-01T00:00:00.000Z",
            parseErrors: null,
            warnings: null,
          },
        ];
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ id: BATCH_ID, status: "pending_review" }),
        });
      }

      if (
        path.includes(`/api/web/catalog/imports/${BATCH_ID}`) &&
        method === "GET"
      ) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: BATCH_ID,
            supplierId: SUPPLIER_ID,
            filename: "e2e.txt",
            sourceFormat: "datanorm",
            status: batchDetailStatus,
            fileSha256: "aa".repeat(32),
            articleCount: 1,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
            approvedAt:
              batchDetailStatus === "approved"
                ? "2026-01-02T00:00:00.000Z"
                : null,
            purgeAfterAt: "2030-01-01T00:00:00.000Z",
            parseErrors: null,
            warnings: null,
            lines: [
              {
                id: LINE_ID,
                sortIndex: 0,
                supplierSku: "4711",
                name: "Testfarbe",
                unit: "L",
                price: "15.90",
                currency: "EUR",
                ean: null,
                groupKey: null,
              },
            ],
            lineTotal: 1,
            linesTruncated: false,
          }),
        });
      }

      if (
        path.includes(`/api/web/catalog/imports/${BATCH_ID}`) &&
        method === "PATCH"
      ) {
        batchDetailStatus = "approved";
        batchSummaries = [
          {
            id: BATCH_ID,
            supplierId: SUPPLIER_ID,
            filename: "e2e.txt",
            sourceFormat: "datanorm",
            status: "approved",
            fileSha256: "aa".repeat(32),
            articleCount: 1,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-02T00:00:00.000Z",
            approvedAt: "2026-01-02T00:00:00.000Z",
            purgeAfterAt: "2030-01-01T00:00:00.000Z",
            parseErrors: null,
            warnings: null,
          },
        ];
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      }

      return route.continue();
    });

    await page.goto("/web/painter/resource-management-wholesale");

    await expect(
      page.getByRole("heading", {
        name: /Ressourcenmanagement\s*&\s*Grosshandel/i,
      }),
    ).toBeVisible();

    await page.getByLabel(/Anzeigename/i).fill("E2E Lieferant");
    await page.getByRole("button", { name: /Lieferant speichern/i }).click();

    await page.locator("#cat-supplier-pick").selectOption(SUPPLIER_ID);

    const fileInput = page.locator("#cat-file");
    await fileInput.setInputFiles({
      name: "e2e.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("W;4711;;;;Testfarbe\nP;4711;15,90;L\n"),
    });

    await page.getByRole("button", { name: /Hochladen und parsen/i }).click();

    await expect(page.getByText("e2e.txt").first()).toBeVisible();
    await expect(page.getByRole("cell", { name: "4711" })).toBeVisible();

    await page.getByRole("button", { name: /Import freigeben/i }).click();

    await expect(
      page.getByRole("button", { name: /Import freigeben/i }),
    ).toHaveCount(0);

    await expect(page.getByText("Freigegeben").first()).toBeVisible();
  });
});
