import assert from "node:assert/strict";
import { test } from "node:test";

import { createApp } from "./app.js";

test("GET /health", async () => {
  const app = createApp();
  const res = await app.request("http://localhost/health");
  assert.equal(res.status, 200);
  const body = (await res.json()) as { status: string };
  assert.equal(body.status, "ok");
});

test("GET /ready ohne DB", async () => {
  const app = createApp({
    verifyAccessToken: async () => ({ sub: "u1", tenantId: "t1", roles: [] }),
    getDb: () => undefined,
  });
  const res = await app.request("http://localhost/ready");
  assert.equal(res.status, 503);
  const body = (await res.json()) as { ready: boolean; reason: string };
  assert.equal(body.ready, false);
  assert.equal(body.reason, "missing_database_url");
});

test("GET /v1/me ohne Authorization", async () => {
  const app = createApp({
    verifyAccessToken: async () => ({ sub: "u1", tenantId: "t1", roles: [] }),
    getDb: () => undefined,
  });
  const res = await app.request("http://localhost/v1/me");
  assert.equal(res.status, 401);
});

test("GET /v1/me mit Token aber ohne DB", async () => {
  const app = createApp({
    verifyAccessToken: async () => ({ sub: "u1", tenantId: "t1", roles: [] }),
    getDb: () => undefined,
  });
  const res = await app.request("http://localhost/v1/me", {
    headers: { Authorization: "Bearer fake" },
  });
  assert.equal(res.status, 503);
  const body = (await res.json()) as { error: string };
  assert.equal(body.error, "database_unavailable");
});

test("POST /v1/sync ohne Authorization", async () => {
  const app = createApp({
    verifyAccessToken: async () => ({ sub: "u1", tenantId: "t1", roles: [] }),
    getDb: () => undefined,
  });
  const res = await app.request("http://localhost/v1/sync", { method: "POST" });
  assert.equal(res.status, 401);
});

test("GET /v1/employees/export ohne Authorization", async () => {
  const app = createApp({
    verifyAccessToken: async () => ({ sub: "u1", tenantId: "t1", roles: [] }),
    getDb: () => undefined,
  });
  const res = await app.request("http://localhost/v1/employees/export");
  assert.equal(res.status, 401);
});

test("GET /v1/employees/export mit Token aber ohne DB", async () => {
  const app = createApp({
    verifyAccessToken: async () => ({ sub: "u1", tenantId: "t1", roles: [] }),
    getDb: () => undefined,
  });
  const res = await app.request("http://localhost/v1/employees/export", {
    headers: { Authorization: "Bearer fake" },
  });
  assert.equal(res.status, 503);
});

test("POST /v1/employees/batch ohne Authorization", async () => {
  const app = createApp({
    verifyAccessToken: async () => ({ sub: "u1", tenantId: "t1", roles: [] }),
    getDb: () => undefined,
  });
  const res = await app.request("http://localhost/v1/employees/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ employeeIds: [], archived: true }),
  });
  assert.equal(res.status, 401);
});

test("GET /v1/employees/skills/catalog ohne Authorization", async () => {
  const app = createApp({
    verifyAccessToken: async () => ({ sub: "u1", tenantId: "t1", roles: [] }),
    getDb: () => undefined,
  });
  const res = await app.request("http://localhost/v1/employees/skills/catalog");
  assert.equal(res.status, 401);
});

test("GET /v1/employees/:id/profile-image ohne Authorization", async () => {
  const app = createApp({
    verifyAccessToken: async () => ({ sub: "u1", tenantId: "t1", roles: [] }),
    getDb: () => undefined,
  });
  const res = await app.request(
    "http://localhost/v1/employees/00000000-0000-4000-8000-000000000001/profile-image",
  );
  assert.equal(res.status, 401);
});

test("POST /v1/employees/:id/attachments ohne Authorization", async () => {
  const app = createApp({
    verifyAccessToken: async () => ({ sub: "u1", tenantId: "t1", roles: [] }),
    getDb: () => undefined,
  });
  const res = await app.request(
    "http://localhost/v1/employees/00000000-0000-4000-8000-000000000001/attachments",
    { method: "POST" },
  );
  assert.equal(res.status, 401);
});
