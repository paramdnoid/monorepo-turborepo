import test from "node:test";
import assert from "node:assert/strict";

import { parseCamtBankToCustomerXml, rankOpenInvoicesForCamt } from "./sales-camt.js";

const SAMPLE_CAMT = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.02">
  <BkToCstmrStmt>
    <Stmt>
      <Ntry>
        <Amt Ccy="EUR">150.00</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <BookgDt><Dt>2026-04-01</Dt></BookgDt>
        <NtryDtls>
          <TxDtls>
            <RltdPties>
              <Dbtr><Nm>Test Kunde GmbH</Nm></Dbtr>
            </RltdPties>
            <RmtInf>
              <Ustrd>RE-2026-001</Ustrd>
            </RmtInf>
          </TxDtls>
        </NtryDtls>
      </Ntry>
      <Ntry>
        <Amt Ccy="EUR">25.00</Amt>
        <CdtDbtInd>DBIT</CdtDbtInd>
        <BookgDt><Dt>2026-04-02</Dt></BookgDt>
      </Ntry>
    </Stmt>
  </BkToCstmrStmt>
</Document>`;

test("parseCamtBankToCustomerXml extracts credit and debit lines", () => {
  const { warnings, lines } = parseCamtBankToCustomerXml(SAMPLE_CAMT);
  assert.equal(warnings.length, 0);
  assert.equal(lines.length, 2);
  assert.equal(lines[0]?.cdtDbtInd, "CRDT");
  assert.equal(lines[0]?.amountCents, 15_000);
  assert.equal(lines[0]?.currency, "EUR");
  assert.equal(lines[0]?.bookingDate, "2026-04-01");
  assert.equal(lines[0]?.paidAtIso, "2026-04-01T12:00:00.000Z");
  assert.ok(lines[0]?.remittanceInfo.includes("RE-2026-001"));
  assert.equal(lines[0]?.debtorName, "Test Kunde GmbH");
  assert.equal(lines[1]?.cdtDbtInd, "DBIT");
  assert.equal(lines[1]?.amountCents, 2500);
});

test("rankOpenInvoicesForCamt ranks by document number in remittance", () => {
  const ranked = rankOpenInvoicesForCamt(
    [
      {
        id: "123e4567-e89b-12d3-a456-426614174000",
        documentNumber: "RE-2026-001",
        customerLabel: "Test Kunde GmbH",
        currency: "EUR",
        dueAt: null,
        balanceCents: 15_000,
      },
    ],
    {
      amountCents: 15_000,
      remittanceInfo: "Verwendung RE-2026-001",
      debtorName: "",
      candidateLimit: 5,
    },
  );
  assert.equal(ranked.matches[0]?.documentNumber, "RE-2026-001");
  assert.equal(ranked.suggestedInvoiceId, "123e4567-e89b-12d3-a456-426614174000");
});
