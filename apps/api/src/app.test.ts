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
    verifyAccessToken: async () => ({ sub: "u1", tenantId: "t1" }),
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
    verifyAccessToken: async () => ({ sub: "u1", tenantId: "t1" }),
    getDb: () => undefined,
  });
  const res = await app.request("http://localhost/v1/me");
  assert.equal(res.status, 401);
});

test("GET /v1/me mit Token aber ohne DB", async () => {
  const app = createApp({
    verifyAccessToken: async () => ({ sub: "u1", tenantId: "t1" }),
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
    verifyAccessToken: async () => ({ sub: "u1", tenantId: "t1" }),
    getDb: () => undefined,
  });
  const res = await app.request("http://localhost/v1/sync", { method: "POST" });
  assert.equal(res.status, 401);
});
