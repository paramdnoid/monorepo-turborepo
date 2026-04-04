import assert from "node:assert/strict";
import test from "node:test";
import { strToU8, zipSync } from "fflate";

import { parseDatanormBuffer } from "./parse-buffer.js";

test("parseDatanormBuffer reads zip with datanorm file", () => {
  const inner = "W;X1;;;Testartikel;\nP;X1;9.99;ST\n";
  const zip = zipSync({ "PREIS.TXT": strToU8(inner) });
  const r = parseDatanormBuffer(zip);
  assert.equal(r.errors.length, 0);
  assert.equal(r.articles.length, 1);
  assert.equal(r.articles[0]?.supplierSku, "X1");
});
