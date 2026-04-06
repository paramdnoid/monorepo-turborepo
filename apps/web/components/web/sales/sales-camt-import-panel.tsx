"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  salesCamtImportBatchDetailResponseSchema,
  salesCamtImportBatchesListResponseSchema,
  salesCamtImportResponseSchema,
  type SalesCamtImportBatchSummary,
  type SalesCamtImportResponse,
} from "@repo/api-contracts";

import { getSalesOpenInvoicesCopy } from "@/content/sales-module";
import type { Locale } from "@/lib/i18n/locale";
import { formatMinorCurrency } from "@/lib/money-format";
import { parseResponseJson } from "@/lib/parse-response-json";
import {
  dispatchSalesBatchPrefill,
  dispatchSalesBatchPrefillMany,
  type SalesBatchPrefillEventDetail,
} from "@/lib/sales-batch-prefill";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/alert";
import { Button } from "@repo/ui/button";
import { Checkbox } from "@repo/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";
import { Input } from "@repo/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/table";

type SalesCamtImportPanelProps = {
  locale: Locale;
};

export function SalesCamtImportPanel({ locale }: SalesCamtImportPanelProps) {
  const oc = getSalesOpenInvoicesCopy(locale);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SalesCamtImportResponse | null>(null);
  const [history, setHistory] = useState<SalesCamtImportBatchSummary[]>([]);
  const [historyBusy, setHistoryBusy] = useState(true);
  const [historyLoadFailed, setHistoryLoadFailed] = useState(false);
  const [historyDetailBusyId, setHistoryDetailBusyId] = useState<string | null>(null);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [selectedCamtLines, setSelectedCamtLines] = useState<Set<number>>(
    () => new Set(),
  );

  const loadHistory = useCallback(async () => {
    setHistoryBusy(true);
    setHistoryLoadFailed(false);
    try {
      const res = await fetch("/api/web/sales/invoices/camt-imports?limit=20", {
        credentials: "include",
        cache: "no-store",
      });
      const text = await res.text();
      const json = parseResponseJson(text);
      if (!res.ok) throw new Error("history_failed");
      const parsed = salesCamtImportBatchesListResponseSchema.safeParse(json);
      if (!parsed.success) throw new Error("history_payload");
      setHistory(parsed.data.batches);
    } catch {
      setHistory([]);
      setHistoryLoadFailed(true);
    } finally {
      setHistoryBusy(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    setSelectedCamtLines(new Set());
  }, [result]);

  const matchableLineCount = useMemo(() => {
    if (!result) return 0;
    return result.entries.filter((e) => !e.skipped && e.matches[0]).length;
  }, [result]);

  const toggleCamtLine = (lineIndex: number, checked: boolean) => {
    setSelectedCamtLines((prev) => {
      const next = new Set(prev);
      if (checked) next.add(lineIndex);
      else next.delete(lineIndex);
      return next;
    });
  };

  const selectAllMatchedCamtLines = () => {
    if (!result) return;
    const next = new Set<number>();
    for (const row of result.entries) {
      if (!row.skipped && row.matches[0]) next.add(row.lineIndex);
    }
    setSelectedCamtLines(next);
  };

  const clearCamtLineSelection = () => {
    setSelectedCamtLines(new Set());
  };

  const applySelectedCamtLinesToBatch = () => {
    if (!result) return;
    const items: SalesBatchPrefillEventDetail[] = [];
    for (const row of result.entries) {
      if (!selectedCamtLines.has(row.lineIndex)) continue;
      const top = row.matches[0];
      if (!top || row.skipped) continue;
      items.push({
        invoiceId: top.invoiceId,
        documentNumber: top.documentNumber,
        amountCents: row.amountCents,
        currency: top.currency,
        balanceCents: top.balanceCents,
        bookingDate: row.bookingDate,
        remittanceInfo: row.remittanceInfo,
      });
    }
    if (items.length === 0) return;
    dispatchSalesBatchPrefillMany(items);
  };

  const runImport = async (file: File | null) => {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/web/sales/invoices/camt-import", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const text = await res.text();
      const json = parseResponseJson(text);
      if (!res.ok) {
        const code =
          json &&
          typeof json === "object" &&
          "error" in json &&
          typeof (json as { error: unknown }).error === "string"
            ? (json as { error: string }).error
            : "unknown";
        setError(`${oc.camtImportError} (${code})`);
        return;
      }
      const parsed = salesCamtImportResponseSchema.safeParse(json);
      if (!parsed.success) {
        setError(oc.camtImportError);
        return;
      }
      setResult(parsed.data);
      setActiveBatchId(null);
      await loadHistory();
    } catch {
      setError(oc.camtImportError);
    } finally {
      setBusy(false);
    }
  };

  const loadBatchDetail = async (batchId: string) => {
    if (historyDetailBusyId) return;
    setHistoryDetailBusyId(batchId);
    setError(null);
    try {
      const res = await fetch(
        `/api/web/sales/invoices/camt-imports/${encodeURIComponent(batchId)}`,
        {
          credentials: "include",
          cache: "no-store",
        },
      );
      const text = await res.text();
      const json = parseResponseJson(text);
      if (!res.ok) {
        const code =
          json &&
          typeof json === "object" &&
          "error" in json &&
          typeof (json as { error: unknown }).error === "string"
            ? (json as { error: string }).error
            : "unknown";
        setError(`${oc.camtImportError} (${code})`);
        return;
      }
      const parsed = salesCamtImportBatchDetailResponseSchema.safeParse(json);
      if (!parsed.success) {
        setError(oc.camtImportError);
        return;
      }
      setResult({
        parseWarnings: parsed.data.parseWarnings,
        candidateLimit: parsed.data.candidateLimit,
        entries: parsed.data.entries,
      });
      setActiveBatchId(parsed.data.batch.id);
    } catch {
      setError(oc.camtImportError);
    } finally {
      setHistoryDetailBusyId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{oc.camtImportTitle}</CardTitle>
        <CardDescription>{oc.camtImportHint}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="file"
            accept=".xml,text/xml,application/xml"
            disabled={busy}
            className="max-w-sm"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              void runImport(f);
              e.target.value = "";
            }}
          />
          <span className="text-xs text-muted-foreground">
            {busy ? oc.camtImportBusy : oc.camtImportRun}
          </span>
        </div>

        <div className="space-y-2 rounded-md border border-border p-3">
          <p className="text-xs font-medium text-muted-foreground">
            {oc.camtImportHistoryTitle}
          </p>
          {historyBusy ? (
            <p className="text-xs text-muted-foreground">{oc.camtImportHistoryLoading}</p>
          ) : history.length === 0 ? (
            <p className="text-xs text-muted-foreground">{oc.camtImportHistoryEmpty}</p>
          ) : (
            <div className="space-y-2">
              {history.map((batch) => (
                <div
                  key={batch.id}
                  className={`flex items-center justify-between gap-3 rounded-md border p-2 ${
                    activeBatchId === batch.id ? "bg-muted/40" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {batch.filename || oc.camtImportHistoryUnknownFile}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(batch.createdAt).toLocaleString(locale)} · {batch.entryCount}{" "}
                      {oc.camtImportHistoryRows}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void loadBatchDetail(batch.id);
                    }}
                    disabled={historyDetailBusyId !== null}
                  >
                    {historyDetailBusyId === batch.id
                      ? oc.camtImportBusy
                      : oc.camtImportHistoryOpen}
                  </Button>
                </div>
              ))}
            </div>
          )}
          {historyLoadFailed ? (
            <p className="text-xs text-destructive">{oc.camtImportHistoryError}</p>
          ) : null}
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>{oc.camtImportError}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {result && result.parseWarnings.length > 0 ? (
          <Alert>
            <AlertTitle>{oc.camtImportWarnings}</AlertTitle>
            <AlertDescription>
              {result.parseWarnings.join(" · ")}
            </AlertDescription>
          </Alert>
        ) : null}

        {result && result.entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">{oc.camtImportNoRows}</p>
        ) : null}

        {result && result.entries.length > 0 ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={selectAllMatchedCamtLines}
                disabled={matchableLineCount === 0}
              >
                {oc.camtImportSelectAllMatched}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearCamtLineSelection}
                disabled={selectedCamtLines.size === 0}
              >
                {oc.camtImportClearCamtSelection}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={applySelectedCamtLinesToBatch}
                disabled={selectedCamtLines.size === 0}
              >
                {oc.camtImportPrefillBatchSelected} ({selectedCamtLines.size})
              </Button>
            </div>
            <div className="overflow-x-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[1%] whitespace-nowrap">
                    {oc.camtImportColSelect}
                  </TableHead>
                  <TableHead>#</TableHead>
                  <TableHead className="text-right">{oc.camtImportColAmount}</TableHead>
                  <TableHead>{oc.camtImportColDate}</TableHead>
                  <TableHead className="max-w-56">
                    {oc.camtImportColRemittance}
                  </TableHead>
                  <TableHead>{oc.camtImportColSuggestion}</TableHead>
                  <TableHead>{oc.camtImportColConfidence}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.entries.map((row) => {
                  const top = row.matches[0];
                  const suggestion =
                    row.skipped || !top
                      ? oc.camtImportSkipped
                      : `${top.documentNumber} · ${formatMinorCurrency(
                          top.balanceCents,
                          top.currency,
                          locale,
                        )}`;
                  return (
                    <TableRow key={row.lineIndex}>
                      <TableCell className="w-[1%] whitespace-nowrap">
                        {!row.skipped && top ? (
                          <Checkbox
                            checked={selectedCamtLines.has(row.lineIndex)}
                            onCheckedChange={(checked) => {
                              toggleCamtLine(row.lineIndex, checked === true);
                            }}
                            aria-label={`${oc.camtImportColSelect} ${row.lineIndex}`}
                          />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="tabular-nums">{row.lineIndex}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMinorCurrency(
                          row.amountCents,
                          row.currency,
                          locale,
                        )}
                      </TableCell>
                      <TableCell>{row.bookingDate ?? "—"}</TableCell>
                      <TableCell className="max-w-56 truncate text-xs">
                        {row.remittanceInfo || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.skipped ? (
                          <span className="text-muted-foreground">
                            {row.skipReason === "not_credit"
                              ? "DBIT / —"
                              : oc.camtImportSkipped}
                          </span>
                        ) : top ? (
                          <div className="flex flex-col items-start gap-1">
                            <Button variant="link" size="sm" className="h-auto p-0" asChild>
                              <Link
                                href={`/web/sales/invoices/${encodeURIComponent(top.invoiceId)}`}
                              >
                                {suggestion}
                              </Link>
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => {
                                dispatchSalesBatchPrefill({
                                  invoiceId: top.invoiceId,
                                  documentNumber: top.documentNumber,
                                  amountCents: row.amountCents,
                                  currency: top.currency,
                                  balanceCents: top.balanceCents,
                                  bookingDate: row.bookingDate,
                                  remittanceInfo: row.remittanceInfo,
                                });
                              }}
                            >
                              {oc.camtImportPrefillBatch}
                            </Button>
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {row.skipped || !top ? (
                          "—"
                        ) : (
                          <span>
                            {top.confidence} ({top.score})
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
