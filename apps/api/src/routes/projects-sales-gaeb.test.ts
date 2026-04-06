import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  customerAddresses,
  customers,
  lvDocuments,
  projects,
  salesInvoiceLines,
  salesInvoicePayments,
  salesInvoices,
  salesLifecycleEvents,
  salesQuoteLines,
  salesQuotes,
} from "@repo/db";

import {
  createProjectPatchHandler,
  createProjectsCreateHandler,
} from "./projects.js";
import {
  createSalesInvoiceCancelPostHandler,
  createSalesQuoteArchivePostHandler,
  createSalesQuotePostHandler,
} from "./sales.js";
import { createGaebImportPostHandler } from "./gaeb.js";

type AuthLike = { tenantId: string; sub: string; roles: string[] };

class DbStub {
  private selectQueues = new Map<unknown, unknown[][]>();
  private insertQueues = new Map<unknown, unknown[][]>();
  private updateQueues = new Map<unknown, unknown[][]>();
  private updateSets = new Map<unknown, unknown[]>();
  private insertValues = new Map<unknown, unknown[]>();

  enqueueSelect(table: unknown, rows: unknown[]) {
    const q = this.selectQueues.get(table) ?? [];
    q.push(rows);
    this.selectQueues.set(table, q);
  }

  enqueueInsert(table: unknown, rows: unknown[]) {
    const q = this.insertQueues.get(table) ?? [];
    q.push(rows);
    this.insertQueues.set(table, q);
  }

  enqueueUpdate(table: unknown, rows: unknown[]) {
    const q = this.updateQueues.get(table) ?? [];
    q.push(rows);
    this.updateQueues.set(table, q);
  }

  lastUpdateSet(table: unknown): Record<string, unknown> | null {
    const sets = this.updateSets.get(table) ?? [];
    const last = sets.at(-1);
    if (!last || typeof last !== "object") return null;
    return last as Record<string, unknown>;
  }

  insertedCount(table: unknown): number {
    return (this.insertValues.get(table) ?? []).length;
  }

  lastInserted(table: unknown): Record<string, unknown> | null {
    const list = this.insertValues.get(table) ?? [];
    const last = list.at(-1);
    if (!last || typeof last !== "object") return null;
    return last as Record<string, unknown>;
  }

  private popQueue(source: Map<unknown, unknown[][]>, table: unknown): unknown[] {
    const q = source.get(table) ?? [];
    const next = q.shift() ?? [];
    source.set(table, q);
    return next;
  }

  select = (shape?: unknown) => {
    void shape;
    return {
      from: (table: unknown) => {
        const take = () => this.popQueue(this.selectQueues, table);
        const chain: {
          where: (_cond: unknown) => typeof chain;
          limit: (_n: number) => Promise<unknown[]>;
          orderBy: (..._args: unknown[]) => Promise<unknown[]>;
        } = {
          where: () => chain,
          limit: async () => take(),
          orderBy: async () => take(),
        };
        return chain;
      },
    };
  };

  insert = (table: unknown) => ({
    values: (values: unknown) => {
      const list = this.insertValues.get(table) ?? [];
      list.push(values);
      this.insertValues.set(table, list);
      return {
        returning: async () => this.popQueue(this.insertQueues, table),
      };
    },
  });

  update = (table: unknown) => ({
    set: (setValues: unknown) => {
      const list = this.updateSets.get(table) ?? [];
      list.push(setValues);
      this.updateSets.set(table, list);
      return {
        where: () => ({
          returning: async () => this.popQueue(this.updateQueues, table),
        }),
      };
    },
  });
}

function createContext(args: {
  auth?: AuthLike;
  params?: Record<string, string | undefined>;
  query?: Record<string, string | undefined>;
  jsonBody?: unknown;
  parseBodyValue?: Record<string, unknown>;
}) {
  const auth = args.auth ?? { tenantId: "tenant-1", sub: "user-1", roles: [] };
  const params = args.params ?? {};
  const query = args.query ?? {};
  return {
    req: {
      param: (key: string) => params[key],
      query: (key: string) => query[key],
      json: async () => args.jsonBody,
      parseBody: async () => args.parseBodyValue ?? {},
    },
    get: (key: string) => (key === "auth" ? auth : undefined),
    json: (payload: unknown, status = 200) =>
      new Response(JSON.stringify(payload), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    header: () => undefined,
  };
}

describe("projects + reference usage tests", () => {
  it("creates a project", async () => {
    const db = new DbStub();
    const now = new Date("2026-04-04T10:00:00.000Z");
    db.enqueueInsert(projects, [
      {
        id: "95ea4cf4-3b30-4fce-a8f1-95f35fce7d11",
        title: "Fassadensanierung Nord",
        projectNumber: "P-100",
        status: "active",
        customerId: null,
        siteAddressId: null,
        customerLabel: "Musterbau GmbH",
        startDate: "2026-05-01",
        endDate: "2026-06-01",
        archivedAt: null,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const handler = createProjectsCreateHandler(() => db as never);
    const res = await handler(
      createContext({
        jsonBody: {
          title: "Fassadensanierung Nord",
          projectNumber: "P-100",
          status: "active",
          customerLabel: "Musterbau GmbH",
          startDate: "2026-05-01",
          endDate: "2026-06-01",
        },
      }) as never,
    );

    assert.equal(res.status, 201);
    const body = (await res.json()) as { project: { projectNumber: string | null } };
    assert.equal(body.project.projectNumber, "P-100");
  });

  it("rejects project create with unknown customer", async () => {
    const db = new DbStub();
    db.enqueueSelect(customers, []);

    const handler = createProjectsCreateHandler(() => db as never);
    const res = await handler(
      createContext({
        jsonBody: {
          title: "Fassadensanierung Nord",
          customerId: "95ea4cf4-3b30-4fce-a8f1-95f35fce7d11",
        },
      }) as never,
    );

    assert.equal(res.status, 400);
    const body = (await res.json()) as { error: string };
    assert.equal(body.error, "invalid_customer");
    assert.equal(db.insertedCount(projects), 0);
  });

  it("rejects project create with site address outside customer", async () => {
    const db = new DbStub();
    db.enqueueSelect(customers, [
      {
        id: "95ea4cf4-3b30-4fce-a8f1-95f35fce7d11",
        displayName: "Musterbau GmbH",
      },
    ]);
    db.enqueueSelect(customerAddresses, []);

    const handler = createProjectsCreateHandler(() => db as never);
    const res = await handler(
      createContext({
        jsonBody: {
          title: "Fassadensanierung Nord",
          customerId: "95ea4cf4-3b30-4fce-a8f1-95f35fce7d11",
          siteAddressId: "2ed5f939-d53f-4b44-92fc-90dbf6e78aa1",
        },
      }) as never,
    );

    assert.equal(res.status, 400);
    const body = (await res.json()) as { error: string };
    assert.equal(body.error, "invalid_site_address");
    assert.equal(db.insertedCount(projects), 0);
  });

  it("archives a project via patch", async () => {
    const db = new DbStub();
    const existing = {
      id: "95ea4cf4-3b30-4fce-a8f1-95f35fce7d11",
      tenantId: "tenant-1",
      title: "Innenausbau",
      projectNumber: "P-101",
      status: "active",
      customerId: null,
      siteAddressId: null,
      customerLabel: "Bauherr KG",
      startDate: null,
      endDate: null,
      archivedAt: null,
      createdAt: new Date("2026-04-01T09:00:00.000Z"),
      updatedAt: new Date("2026-04-01T09:00:00.000Z"),
    };
    const archivedAt = new Date("2026-04-04T11:15:00.000Z");
    db.enqueueSelect(projects, [existing]);
    db.enqueueUpdate(projects, [{ ...existing, archivedAt, updatedAt: archivedAt }]);

    const handler = createProjectPatchHandler(() => db as never);
    const res = await handler(
      createContext({
        params: { id: existing.id },
        jsonBody: { archived: true },
      }) as never,
    );

    assert.equal(res.status, 200);
    const body = (await res.json()) as { project: { archivedAt: string | null } };
    assert.equal(typeof body.project.archivedAt, "string");

    const lastSet = db.lastUpdateSet(projects);
    assert.equal(lastSet !== null, true);
    assert.equal(lastSet?.archivedAt instanceof Date, true);
  });

  it("rejects project patch with unknown customer", async () => {
    const db = new DbStub();
    const existing = {
      id: "95ea4cf4-3b30-4fce-a8f1-95f35fce7d11",
      tenantId: "tenant-1",
      title: "Innenausbau",
      projectNumber: "P-101",
      status: "active",
      customerId: null,
      siteAddressId: null,
      customerLabel: "Bauherr KG",
      startDate: null,
      endDate: null,
      archivedAt: null,
      createdAt: new Date("2026-04-01T09:00:00.000Z"),
      updatedAt: new Date("2026-04-01T09:00:00.000Z"),
    };
    db.enqueueSelect(projects, [existing]);
    db.enqueueSelect(customers, []);

    const handler = createProjectPatchHandler(() => db as never);
    const res = await handler(
      createContext({
        params: { id: existing.id },
        jsonBody: { customerId: "95ea4cf4-3b30-4fce-a8f1-95f35fce7d11" },
      }) as never,
    );

    assert.equal(res.status, 400);
    const body = (await res.json()) as { error: string };
    assert.equal(body.error, "invalid_customer");
  });

  it("rejects sales quote with projectId outside tenant", async () => {
    const db = new DbStub();
    db.enqueueSelect(projects, []);

    const handler = createSalesQuotePostHandler(() => db as never);
    const res = await handler(
      createContext({
        jsonBody: {
          documentNumber: "ANG-2026-001",
          customerLabel: "Malerbetrieb Test",
          status: "draft",
          currency: "EUR",
          totalCents: 10000,
          projectId: "95ea4cf4-3b30-4fce-a8f1-95f35fce7d11",
        },
      }) as never,
    );

    assert.equal(res.status, 400);
    const body = (await res.json()) as { error: string };
    assert.equal(body.error, "invalid_project");
  });

  it("rejects GAEB import with unknown project reference", async () => {
    const db = new DbStub();
    db.enqueueSelect(projects, []);

    const handler = createGaebImportPostHandler(() => db as never);
    const file = new File(["not a valid gaeb"], "lv.xml", {
      type: "application/xml",
    });
    const res = await handler(
      createContext({
        parseBodyValue: {
          file,
          projectId: "95ea4cf4-3b30-4fce-a8f1-95f35fce7d11",
        },
      }) as never,
    );

    assert.equal(res.status, 404);
    const body = (await res.json()) as { error: string };
    assert.equal(body.error, "project_not_found");
  });

  it("keeps sales project reference in quote detail response", async () => {
    const db = new DbStub();
    const quoteId = "3cad5914-4f3d-4c89-aa7b-4d70eb17bfa2";
    const projectId = "95ea4cf4-3b30-4fce-a8f1-95f35fce7d11";
    const now = new Date("2026-04-04T12:00:00.000Z");

    db.enqueueSelect(projects, [{ id: projectId }]);
    db.enqueueInsert(salesQuotes, [
      {
        id: quoteId,
        tenantId: "tenant-1",
        documentNumber: "ANG-2026-002",
        customerLabel: "Referenzkunde",
        customerId: null,
        status: "draft",
        currency: "EUR",
        totalCents: 25000,
        validUntil: null,
        projectId,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    db.enqueueSelect(salesQuotes, [
      {
        id: quoteId,
        tenantId: "tenant-1",
        documentNumber: "ANG-2026-002",
        customerLabel: "Referenzkunde",
        customerId: null,
        status: "draft",
        currency: "EUR",
        totalCents: 25000,
        validUntil: null,
        projectId,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    db.enqueueSelect(salesQuoteLines, []);

    const handler = createSalesQuotePostHandler(() => db as never);
    const res = await handler(
      createContext({
        jsonBody: {
          documentNumber: "ANG-2026-002",
          customerLabel: "Referenzkunde",
          status: "draft",
          currency: "EUR",
          totalCents: 25000,
          projectId,
        },
      }) as never,
    );

    assert.equal(res.status, 201);
    const body = (await res.json()) as { quote: { projectId: string | null } };
    assert.equal(body.quote.projectId, projectId);
  });

  it("stores GAEB import with valid project reference", async () => {
    const db = new DbStub();
    const projectId = "95ea4cf4-3b30-4fce-a8f1-95f35fce7d11";
    db.enqueueSelect(projects, [{ id: projectId }]);
    db.enqueueInsert(lvDocuments, [{ id: "98f031af-33ee-4c87-b648-8d57fba67329" }]);

    const handler = createGaebImportPostHandler(() => db as never);
    const file = new File(["not a valid gaeb"], "lv.xml", {
      type: "application/xml",
    });
    const res = await handler(
      createContext({
        parseBodyValue: {
          file,
          projectId,
        },
      }) as never,
    );

    assert.equal(res.status, 201);
    const body = (await res.json()) as { id: string; status: string };
    assert.equal(typeof body.id, "string");
    assert.equal(body.status, "failed");
  });

  it("writes lifecycle audit event when quote is archived", async () => {
    const db = new DbStub();
    const quoteId = "3cad5914-4f3d-4c89-aa7b-4d70eb17bfa2";
    const now = new Date("2026-04-04T12:00:00.000Z");
    db.enqueueSelect(salesQuotes, [
      {
        id: quoteId,
        tenantId: "tenant-1",
        documentNumber: "ANG-2026-009",
        customerLabel: "Kunde",
        customerId: null,
        status: "draft",
        currency: "EUR",
        totalCents: 1000,
        validUntil: null,
        projectId: null,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    db.enqueueUpdate(salesQuotes, []);
    db.enqueueSelect(salesQuotes, [
      {
        id: quoteId,
        tenantId: "tenant-1",
        documentNumber: "ANG-2026-009",
        customerLabel: "Kunde",
        customerId: null,
        status: "expired",
        currency: "EUR",
        totalCents: 1000,
        validUntil: null,
        projectId: null,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    db.enqueueSelect(salesQuoteLines, []);

    const handler = createSalesQuoteArchivePostHandler(() => db as never);
    const res = await handler(
      createContext({ params: { id: quoteId } }) as never,
    );

    assert.equal(res.status, 200);
    assert.equal(db.insertedCount(salesLifecycleEvents), 1);
    const event = db.lastInserted(salesLifecycleEvents);
    assert.equal(event?.action, "quote_archived");
    assert.equal(event?.entityType, "quote");
    assert.equal(event?.fromStatus, "draft");
    assert.equal(event?.toStatus, "expired");
  });

  it("writes lifecycle audit event when invoice is cancelled", async () => {
    const db = new DbStub();
    const invoiceId = "58f29175-c62f-45eb-bf49-9fd6dafeb350";
    const now = new Date("2026-04-04T13:00:00.000Z");
    db.enqueueSelect(salesInvoices, [
      {
        id: invoiceId,
        tenantId: "tenant-1",
        documentNumber: "RE-2026-011",
        customerLabel: "Kunde",
        customerId: null,
        status: "sent",
        currency: "EUR",
        totalCents: 2200,
        quoteId: null,
        projectId: null,
        issuedAt: null,
        dueAt: null,
        paidAt: null,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    db.enqueueSelect(salesInvoicePayments, [{ c: 0 }]);
    db.enqueueUpdate(salesInvoices, []);
    db.enqueueSelect(salesInvoices, [
      {
        id: invoiceId,
        tenantId: "tenant-1",
        documentNumber: "RE-2026-011",
        customerLabel: "Kunde",
        customerId: null,
        status: "cancelled",
        currency: "EUR",
        totalCents: 2200,
        quoteId: null,
        projectId: null,
        issuedAt: null,
        dueAt: null,
        paidAt: null,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    db.enqueueSelect(salesInvoiceLines, []);
    db.enqueueSelect(salesInvoicePayments, []);

    const handler = createSalesInvoiceCancelPostHandler(() => db as never);
    const res = await handler(
      createContext({ params: { id: invoiceId } }) as never,
    );

    assert.equal(res.status, 200);
    assert.equal(db.insertedCount(salesLifecycleEvents), 1);
    const event = db.lastInserted(salesLifecycleEvents);
    assert.equal(event?.action, "invoice_cancelled");
    assert.equal(event?.entityType, "invoice");
    assert.equal(event?.fromStatus, "sent");
    assert.equal(event?.toStatus, "cancelled");
  });
});
