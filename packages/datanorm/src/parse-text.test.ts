import assert from "node:assert/strict";
import test from "node:test";

import { parseDatanormText } from "./parse-text.js";

test("parseDatanormText merges W and P rows", () => {
  const sample = [
    "W;4711;A1234567890;GRP01;Farbe Weiss;Liter",
    "P;4711;15,90;L",
  ].join("\n");
  const r = parseDatanormText(sample);
  assert.equal(r.errors.length, 0);
  assert.equal(r.articles.length, 1);
  assert.equal(r.articles[0]?.supplierSku, "4711");
  assert.equal(r.articles[0]?.price, "15.90");
  assert.equal(r.articles[0]?.name, "Farbe Weiss");
});

test("parseDatanormText returns error when empty", () => {
  const r = parseDatanormText("hello\nworld\n");
  assert.ok(r.errors.length > 0);
  assert.equal(r.articles.length, 0);
});
