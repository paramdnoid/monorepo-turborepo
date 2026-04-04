import assert from "node:assert/strict";
import test from "node:test";

import { parseBmecatXml } from "./parse-xml.js";

test("parseBmecatXml extracts product with price", () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<BMECAT>
  <T_NEW_CATALOG>
    <PRODUCT>
      <SUPPLIER_PID>SKU-1</SUPPLIER_PID>
      <DESCRIPTION_SHORT>Testfarbe</DESCRIPTION_SHORT>
      <PRICE_DETAILS>
        <ARTICLE_PRICE>
          <PRICE_AMOUNT>12,50</PRICE_AMOUNT>
          <PRICE_CURRENCY>EUR</PRICE_CURRENCY>
        </ARTICLE_PRICE>
      </PRICE_DETAILS>
    </PRODUCT>
  </T_NEW_CATALOG>
</BMECAT>`;

  const r = parseBmecatXml(xml);
  assert.equal(r.errors.length, 0);
  assert.equal(r.articles.length, 1);
  assert.equal(r.articles[0]?.supplierSku, "SKU-1");
  assert.equal(r.articles[0]?.price, "12.50");
  assert.equal(r.articles[0]?.name, "Testfarbe");
});
