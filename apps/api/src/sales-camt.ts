import { XMLParser } from "fast-xml-parser";

export type CamtCdtDbtInd = "CRDT" | "DBIT" | "UNKNOWN";

export type CamtParsedStatementLine = {
  lineIndex: number;
  cdtDbtInd: CamtCdtDbtInd;
  amountCents: number;
  currency: string;
  bookingDate: string | null;
  /** ISO-8601 Mittag UTC wenn bookingDate gesetzt. */
  paidAtIso: string | null;
  remittanceInfo: string;
  debtorName: string;
};

export function normalizeForMatch(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function includesNormalized(haystack: string, needle: string): boolean {
  if (!needle) return false;
  return normalizeForMatch(haystack).includes(normalizeForMatch(needle));
}

export function scoreCamtCandidate(args: {
  remittanceInfo: string;
  debtorName: string;
  amountCents: number;
  documentNumber: string;
  customerLabel: string;
  balanceCents: number;
}): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  if (includesNormalized(args.remittanceInfo, args.documentNumber)) {
    score += 120;
    reasons.push("document_number_match");
  }
  if (
    args.debtorName &&
    includesNormalized(args.customerLabel, args.debtorName)
  ) {
    score += 40;
    reasons.push("debtor_name_match");
  }
  const customerWords = args.customerLabel
    .split(/\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 4);
  if (
    customerWords.some((w) => includesNormalized(args.remittanceInfo, w))
  ) {
    score += 30;
    reasons.push("customer_text_match");
  }
  if (args.amountCents === args.balanceCents) {
    score += 60;
    reasons.push("exact_balance_match");
  } else if (args.amountCents < args.balanceCents) {
    score += 20;
    reasons.push("partial_balance_match");
  } else {
    score -= 40;
    reasons.push("amount_exceeds_balance");
  }
  return { score, reasons };
}

export function camtConfidence(score: number): "high" | "medium" | "low" {
  if (score >= 130) return "high";
  if (score >= 70) return "medium";
  return "low";
}

export type OpenInvoiceCamtRow = {
  id: string;
  documentNumber: string;
  customerLabel: string;
  currency: string;
  dueAt: Date | null;
  balanceCents: number;
};

export type CamtRankedMatch = {
  invoiceId: string;
  documentNumber: string;
  customerLabel: string;
  currency: string;
  balanceCents: number;
  dueAt: string | null;
  score: number;
  confidence: "high" | "medium" | "low";
  reasons: string[];
};

export function rankOpenInvoicesForCamt(
  rows: OpenInvoiceCamtRow[],
  params: {
    amountCents: number;
    remittanceInfo: string;
    debtorName: string;
    candidateLimit: number;
  },
): { matches: CamtRankedMatch[]; suggestedInvoiceId: string | null } {
  const remittanceInfo = params.remittanceInfo;
  const debtorName = params.debtorName;
  const ranked = rows
    .map((r) => {
      const rankedResult = scoreCamtCandidate({
        remittanceInfo,
        debtorName,
        amountCents: params.amountCents,
        documentNumber: r.documentNumber,
        customerLabel: r.customerLabel,
        balanceCents: r.balanceCents,
      });
      return {
        invoiceId: r.id,
        documentNumber: r.documentNumber,
        customerLabel: r.customerLabel,
        currency: r.currency,
        balanceCents: r.balanceCents,
        dueAt: r.dueAt ? r.dueAt.toISOString() : null,
        score: rankedResult.score,
        confidence: camtConfidence(rankedResult.score),
        reasons: rankedResult.reasons,
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score || a.documentNumber.localeCompare(b.documentNumber),
    );

  const limited = ranked.slice(0, params.candidateLimit);
  const suggested = limited[0];
  return {
    matches: limited,
    suggestedInvoiceId:
      suggested && suggested.score >= 70 ? suggested.invoiceId : null,
  };
}

function ensureArray<T>(x: T | T[] | undefined | null): T[] {
  if (x == null) return [];
  return Array.isArray(x) ? x : [x];
}

function pickText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (typeof v === "object" && "#text" in (v as object)) {
    return String((v as { "#text": unknown })["#text"]);
  }
  return "";
}

function parseAmtNode(amt: unknown): { cents: number; currency: string } {
  if (amt == null) return { cents: 0, currency: "EUR" };
  if (typeof amt === "string" || typeof amt === "number") {
    const n = Number(String(amt).replace(",", "."));
    return {
      cents: Number.isFinite(n) ? Math.round(n * 100) : 0,
      currency: "EUR",
    };
  }
  if (typeof amt === "object") {
    const o = amt as Record<string, unknown>;
    const raw = pickText(o["#text"] ?? o);
    const n = Number(String(raw).replace(",", "."));
    const ccy =
      typeof o["@_Ccy"] === "string" && o["@_Ccy"].length === 3
        ? o["@_Ccy"]
        : "EUR";
    return {
      cents: Number.isFinite(n) ? Math.round(n * 100) : 0,
      currency: ccy,
    };
  }
  return { cents: 0, currency: "EUR" };
}

function pickIsoDate(d: unknown): string | null {
  if (d == null) return null;
  if (typeof d === "string") {
    const s = d.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    if (s.length >= 10 && s[4] === "-" && s[7] === "-") return s.slice(0, 10);
    return null;
  }
  if (typeof d === "object") {
    const o = d as Record<string, unknown>;
    if (typeof o.Dt === "string") return pickIsoDate(o.Dt);
    if (typeof o.DtTm === "string") return pickIsoDate(o.DtTm);
  }
  return null;
}

function bookingDateFromNtry(ntry: Record<string, unknown>): string | null {
  const bookg = pickIsoDate(ntry.BookgDt);
  if (bookg) return bookg;
  const val = pickIsoDate(ntry.ValDt);
  if (val) return val;
  return null;
}

function deepCollectUstrd(node: unknown): string[] {
  const parts: string[] = [];
  const walk = (n: unknown): void => {
    if (n == null) return;
    if (Array.isArray(n)) {
      for (const x of n) walk(x);
      return;
    }
    if (typeof n === "object") {
      const o = n as Record<string, unknown>;
      if ("Ustrd" in o) {
        for (const x of ensureArray(o.Ustrd)) {
          const t = String(x).trim();
          if (t) parts.push(t);
        }
      }
      for (const [k, v] of Object.entries(o)) {
        if (k === "Ustrd") continue;
        walk(v);
      }
    }
  };
  walk(node);
  return parts;
}

function findDebtorName(ntry: Record<string, unknown>): string {
  const tryRp = (rp: unknown): string => {
    if (!rp || typeof rp !== "object") return "";
    const o = rp as Record<string, unknown>;
    const dbtr = o.Dbtr;
    if (dbtr && typeof dbtr === "object") {
      const nm = (dbtr as Record<string, unknown>).Nm;
      if (typeof nm === "string" && nm.trim()) return nm.trim();
    }
    return "";
  };

  const top = tryRp(ntry.RltdPties);
  if (top) return top;

  for (const nd of ensureArray(ntry.NtryDtls)) {
    if (!nd || typeof nd !== "object") continue;
    const ndo = nd as Record<string, unknown>;
    for (const tx of ensureArray(ndo.TxDtls)) {
      if (!tx || typeof tx !== "object") continue;
      const txo = tx as Record<string, unknown>;
      const n = tryRp(txo.RltdPties);
      if (n) return n;
    }
  }
  return "";
}

function parseCdtDbtInd(raw: unknown): CamtCdtDbtInd {
  const s = String(raw ?? "").toUpperCase().trim();
  if (s === "CRDT") return "CRDT";
  if (s === "DBIT") return "DBIT";
  return "UNKNOWN";
}

function ymdToPaidAtIso(ymd: string | null): string | null {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  return new Date(`${ymd}T12:00:00.000Z`).toISOString();
}

const MAX_CAMT_STATEMENT_LINES = 500;

/**
 * Extrahiert Buchungssaetze aus CAMT.052/053-aehnlichem XML (ISO 20022, Namespace-prefixes entfernt).
 * Keine vollstaendige Schema-Validierung — pragmatischer Import fuer OP-Zuordnung.
 */
export function parseCamtBankToCustomerXml(xml: string): {
  warnings: string[];
  lines: CamtParsedStatementLine[];
} {
  const warnings: string[] = [];
  const trimmed = xml.trim();
  if (!trimmed) {
    warnings.push("empty_xml");
    return { warnings, lines: [] };
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    removeNSPrefix: true,
    trimValues: true,
  });

  let parsed: unknown;
  try {
    parsed = parser.parse(trimmed);
  } catch {
    warnings.push("xml_parse_error");
    return { warnings, lines: [] };
  }

  const root = parsed as Record<string, unknown>;
  const doc = (root.Document ?? root) as Record<string, unknown>;
  const stmtContainer =
    (doc.BkToCstmrStmt as Record<string, unknown> | undefined) ??
    (doc.BkToCstmrAcctRpt as Record<string, unknown> | undefined);

  if (!stmtContainer) {
    warnings.push("no_camt_statement_block");
    return { warnings, lines: [] };
  }

  const stmts = ensureArray(
    stmtContainer.Stmt ?? stmtContainer.Rpt,
  ) as Record<string, unknown>[];

  const lines: CamtParsedStatementLine[] = [];
  let lineIndex = 0;

  for (const stmt of stmts) {
    if (!stmt || typeof stmt !== "object") continue;
    const ntries = ensureArray(
      (stmt as Record<string, unknown>).Ntry,
    ) as Record<string, unknown>[];

    for (const ntry of ntries) {
      if (lines.length >= MAX_CAMT_STATEMENT_LINES) {
        warnings.push("max_entries_truncated");
        return { warnings, lines };
      }
      if (!ntry || typeof ntry !== "object") continue;

      const { cents, currency } = parseAmtNode(ntry.Amt);
      const cdtDbtInd = parseCdtDbtInd(ntry.CdtDbtInd);
      const bookingDate = bookingDateFromNtry(ntry);
      const remittanceParts = deepCollectUstrd(ntry);
      const remittanceInfo = remittanceParts.join(" ").trim();
      const debtorName = findDebtorName(ntry);

      lines.push({
        lineIndex,
        cdtDbtInd,
        amountCents: cents,
        currency,
        bookingDate,
        paidAtIso: ymdToPaidAtIso(bookingDate),
        remittanceInfo,
        debtorName,
      });
      lineIndex += 1;
    }
  }

  if (lines.length === 0) {
    warnings.push("no_ntry_found");
  }

  return { warnings, lines };
}
