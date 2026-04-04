import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { parseGaebString } from "./parse-da-xml.js";
import { serializeDaXml } from "./serialize-da-xml.js";

const dir = dirname(fileURLToPath(import.meta.url));
const fixture = readFileSync(join(dir, "__fixtures__/minimal-da.xml"), "utf8");

test("parse minimal GAEB DA XML extracts items", () => {
  const r = parseGaebString(fixture);
  assert.equal(r.errors.length, 0);
  assert.ok(r.nodes.length >= 2);
  assert.equal(r.nodes[0]?.outlineNumber, "1");
  assert.equal(r.nodes[0]?.shortText, "Deckenfarbe");
  assert.equal(r.nodes[1]?.quantity, "120");
  assert.equal(r.nodes[1]?.unit, "m2");
});

test("roundtrip preserves line items", () => {
  const r = parseGaebString(fixture);
  assert.equal(r.errors.length, 0);
  const xml = serializeDaXml(r.nodes);
  const again = parseGaebString(xml);
  assert.equal(again.errors.length, 0);
  assert.equal(again.nodes.length, r.nodes.length);
  assert.equal(again.nodes[0]?.shortText, r.nodes[0]?.shortText);
});
