"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  SALES_INVOICE_STATUS_OPTIONS,
  salesBatchInvoicePaymentsResponseSchema,
  salesOpenInvoicesListResponseSchema,
  type SalesInvoiceStatus,
  type SalesOpenInvoicesSortBy,
} from "@repo/api-contracts";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/alert";
import { Button } from "@repo/ui/button";
import { Checkbox } from "@repo/ui/checkbox";
import { Input } from "@repo/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/table";

import {
  getSalesOpenInvoicesCopy,
  getSalesTableCopy,
} from "@/content/sales-module";
import type { Locale } from "@/lib/i18n/locale";
import {
  dateInputToIsoNoon,
  formatMinorCurrency,
  parseMajorToMinorUnits,
} from "@/lib/money-format";
import {
  aggregatePrefillItemsByInvoice,
  isSalesBatchPrefillBulkPayload,
  SALES_BATCH_PREFILL_EVENT,
  type SalesBatchPrefillEventDetail,
  type SalesBatchPrefillEventPayload,
} from "@/lib/sales-batch-prefill";

const PAGE_SIZE = 25;

function invoiceStatusLabel(locale: Locale, status: string): string {
  if (SALES_INVOICE_STATUS_OPTIONS.includes(status as SalesInvoiceStatus)) {
    const s = status as SalesInvoiceStatus;
    if (locale === "en") {
      const m: Record<SalesInvoiceStatus, string> = {
        draft: "Draft",
        sent: "Sent",
        paid: "Paid",
        overdue: "Overdue",
        cancelled: "Cancelled",
      };
      return m[s];
    }
    const m: Record<SalesInvoiceStatus, string> = {
      draft: "Entwurf",
      sent: "Versendet",
      paid: "Bezahlt",
      overdue: "Ueberfaellig",
      cancelled: "Storniert",
    };
    return m[s];
  }
  return status;
}

type SortField = SalesOpenInvoicesSortBy;

type BatchAllocationDraft = {
  documentNumber: string;
  currency: string;
  balanceCents: number;
  amountInput: string;
};

function formatDateShort(iso: string | null, locale: Locale): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const tag = locale === "en" ? "en-GB" : "de-DE";
  return new Intl.DateTimeFormat(tag, { dateStyle: "medium" }).format(d);
}

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

function minorToEditString(cents: number, locale: Locale): string {
  return (cents / 100).toLocaleString(locale === "en" ? "en-US" : "de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function SalesOpenInvoicesList({
  locale,
  projectId,
}: {
  locale: Locale;
  projectId?: string;
}) {
  const copy = getSalesTableCopy(locale);
  const oc = getSalesOpenInvoicesCopy(locale);
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("dueAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<
    {
      id: string;
      documentNumber: string;
      customerLabel: string;
      status: string;
      currency: string;
      totalCents: number;
      dueAt: string | null;
      paidTotalCents: number;
      balanceCents: number;
    }[]
  >([]);
  const [selectedAllocations, setSelectedAllocations] = useState<
    Record<string, BatchAllocationDraft>
  >({});
  const [batchDateYmd, setBatchDateYmd] = useState(todayYmd());
  const [batchNote, setBatchNote] = useState("");
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchMessage, setBatchMessage] = useState<string | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);

  const loadRows = useCallback(async () => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (projectId?.trim()) params.set("projectId", projectId.trim());
    params.set("sortBy", sortBy);
    params.set("sortDir", sortDir);
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String(page * PAGE_SIZE));
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/web/sales/invoices/open-items?${params.toString()}`,
        { credentials: "include" },
      );
      const text = await res.text();
      if (!res.ok) {
        setError(copy.loadError);
        setRows([]);
        setTotal(0);
        return;
      }
      const json: unknown = JSON.parse(text);
      const parsed = salesOpenInvoicesListResponseSchema.safeParse(json);
      if (!parsed.success) {
        setError(copy.loadError);
        setRows([]);
        setTotal(0);
        return;
      }
      setTotal(parsed.data.total);
      setRows(
        parsed.data.invoices.map((i) => ({
          id: i.id,
          documentNumber: i.documentNumber,
          customerLabel: i.customerLabel,
          status: i.status,
          currency: i.currency,
          totalCents: i.totalCents,
          dueAt: i.dueAt,
          paidTotalCents: i.paidTotalCents,
          balanceCents: i.balanceCents,
        })),
      );
    } catch {
      setError(copy.loadError);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [copy.loadError, page, projectId, query, sortBy, sortDir]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  useEffect(() => {
    setSelectedAllocations((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const row of rows) {
        const existing = next[row.id];
        if (!existing) continue;
        if (
          existing.documentNumber !== row.documentNumber ||
          existing.currency !== row.currency ||
          existing.balanceCents !== row.balanceCents
        ) {
          next[row.id] = {
            ...existing,
            documentNumber: row.documentNumber,
            currency: row.currency,
            balanceCents: row.balanceCents,
          };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [rows]);

  useEffect(() => {
    const onPrefill = (event: Event) => {
      const raw = (event as CustomEvent<SalesBatchPrefillEventPayload>).detail;
      if (!raw) return;
      setBatchError(null);
      setBatchMessage(null);
      setPage(0);

      const items: SalesBatchPrefillEventDetail[] = isSalesBatchPrefillBulkPayload(
        raw,
      )
        ? raw.items
        : [raw];
      if (items.length === 0) return;

      const isBulk = isSalesBatchPrefillBulkPayload(raw);
      if (isBulk) {
        setQueryInput("");
        setQuery("");
      } else {
        const single = items[0];
        if (single) {
          setQueryInput(single.documentNumber);
          setQuery(single.documentNumber);
        }
      }

      const aggregated = aggregatePrefillItemsByInvoice(items);

      setSelectedAllocations((prev) => {
        const next = { ...prev };
        for (const agg of aggregated) {
          next[agg.invoiceId] = {
            documentNumber: agg.documentNumber,
            currency: agg.currency,
            balanceCents: agg.balanceCents,
            amountInput: minorToEditString(agg.amountCents, locale),
          };
        }
        return next;
      });

      const bookingDates = aggregated
        .map((a) => a.bookingDate)
        .filter((d): d is string => Boolean(d));
      if (bookingDates.length > 0) {
        setBatchDateYmd(bookingDates.sort().at(-1)!);
      }

      const uniqueRemittance = [
        ...new Set(aggregated.flatMap((a) => a.remittanceParts)),
      ];
      if (uniqueRemittance.length > 0) {
        setBatchNote((prev) =>
          prev.trim().length > 0 ? prev : `CAMT: ${uniqueRemittance.join(" · ")}`,
        );
      }
    };

    window.addEventListener(SALES_BATCH_PREFILL_EVENT, onPrefill as EventListener);
    return () => {
      window.removeEventListener(
        SALES_BATCH_PREFILL_EVENT,
        onPrefill as EventListener,
      );
    };
  }, [locale]);

  const applySearch = () => {
    setPage(0);
    setQuery(queryInput);
  };

  const toggleSort = (field: SortField) => {
    setPage(0);
    setSortBy((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir(
        field === "updatedAt" || field === "totalCents" || field === "balanceCents"
          ? "desc"
          : "asc",
      );
      return field;
    });
  };

  const sortGlyph = (field: SortField) =>
    sortBy === field ? (sortDir === "asc" ? "↑" : "↓") : "↕";

  const selectedEntries = Object.entries(selectedAllocations).map(
    ([invoiceId, draft]) => ({
      invoiceId,
      ...draft,
    }),
  );

  const toggleRowSelection = (row: (typeof rows)[number], checked: boolean) => {
    setBatchError(null);
    setBatchMessage(null);
    setSelectedAllocations((prev) => {
      if (!checked) {
        const next = { ...prev };
        delete next[row.id];
        return next;
      }
      return {
        ...prev,
        [row.id]: {
          documentNumber: row.documentNumber,
          currency: row.currency,
          balanceCents: row.balanceCents,
          amountInput:
            prev[row.id]?.amountInput ?? minorToEditString(row.balanceCents, locale),
        },
      };
    });
  };

  const clearBatchSelection = () => {
    setSelectedAllocations({});
    setBatchError(null);
    setBatchMessage(null);
  };

  const runBatchPayment = async () => {
    if (batchBusy) return;
    if (selectedEntries.length === 0) {
      setBatchError(oc.batchPaymentNoSelection);
      setBatchMessage(null);
      return;
    }
    const paidAtIso = dateInputToIsoNoon(batchDateYmd);
    if (!paidAtIso) {
      setBatchError(oc.batchPaymentFailed);
      setBatchMessage(null);
      return;
    }
    const allocations: { invoiceId: string; amountCents: number }[] = [];
    for (const entry of selectedEntries) {
      const raw = entry.amountInput;
      const cents = parseMajorToMinorUnits(raw, locale);
      if (cents === null || cents < 1) {
        setBatchError(oc.batchPaymentInvalidAmount);
        setBatchMessage(null);
        return;
      }
      if (cents > entry.balanceCents) {
        setBatchError(oc.batchPaymentExceedsBalance);
        setBatchMessage(null);
        return;
      }
      allocations.push({ invoiceId: entry.invoiceId, amountCents: cents });
    }

    setBatchBusy(true);
    setBatchError(null);
    setBatchMessage(null);
    try {
      const res = await fetch("/api/web/sales/invoices/payments/batch", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paidAt: paidAtIso,
          note: batchNote.trim() === "" ? null : batchNote.trim(),
          allocations,
        }),
      });
      const text = await res.text();
      let json: unknown = null;
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }
      if (!res.ok) {
        const code =
          json &&
          typeof json === "object" &&
          "error" in json &&
          typeof (json as { error: unknown }).error === "string"
            ? (json as { error: string }).error
            : "unknown";
        if (code === "payment_exceeds_balance") {
          setBatchError(oc.batchPaymentExceedsBalance);
        } else {
          setBatchError(`${oc.batchPaymentFailed} (${code})`);
        }
        return;
      }
      const parsed = salesBatchInvoicePaymentsResponseSchema.safeParse(json);
      if (!parsed.success) {
        setBatchError(oc.batchPaymentFailed);
        return;
      }

      setBatchMessage(oc.batchPaymentSuccess);
      setSelectedAllocations({});
      setBatchNote("");
      setBatchDateYmd(todayYmd());
      await loadRows();
    } catch {
      setBatchError(oc.batchPaymentFailed);
    } finally {
      setBatchBusy(false);
    }
  };

  const maxPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);
  const csvParams = new URLSearchParams({
    lang: locale === "en" ? "en" : "de",
  });
  if (projectId?.trim()) csvParams.set("projectId", projectId.trim());
  const csvHref = `/api/web/sales/invoices/open-items/export?${csvParams.toString()}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="min-w-0 flex-1 sm:min-w-48">
          <div className="flex items-center gap-2">
            <label
              className="shrink-0 max-w-28 truncate text-[11px] font-medium text-muted-foreground leading-none"
              htmlFor="open-inv-q"
            >
              {copy.docNumber} / {copy.customer}
            </label>
            <Input
              id="open-inv-q"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applySearch();
              }}
              placeholder={oc.searchPlaceholder}
              className="min-w-0 flex-1"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5 sm:flex-row sm:shrink-0">
          <Button type="button" size="sm" variant="secondary" className="w-full sm:w-auto" onClick={applySearch}>
            {locale === "en" ? "Search" : "Suchen"}
          </Button>
          <Button type="button" size="sm" variant="outline" className="w-full sm:w-auto" asChild>
            <a href={csvHref}>{oc.csvDownload}</a>
          </Button>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">{oc.exportMaxHint}</p>

      <div className="space-y-2 rounded-md border border-border p-2">
        <div className="space-y-0.5">
          <p className="text-xs font-medium">{oc.batchPaymentTitle}</p>
          <p className="text-[11px] text-muted-foreground">{oc.batchPaymentHint}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <label className="shrink-0 text-[11px] font-medium text-muted-foreground leading-none whitespace-nowrap">
              {oc.batchPaymentDate}
            </label>
            <Input
              type="date"
              value={batchDateYmd}
              onChange={(e) => setBatchDateYmd(e.target.value)}
              disabled={batchBusy}
              className="min-w-0 flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="shrink-0 text-[11px] font-medium text-muted-foreground leading-none whitespace-nowrap">
              {oc.batchPaymentNote}
            </label>
            <Input
              value={batchNote}
              onChange={(e) => setBatchNote(e.target.value)}
              disabled={batchBusy}
              placeholder={oc.batchPaymentNote}
              className="min-w-0 flex-1"
            />
          </div>
        </div>
        {selectedEntries.length > 0 ? (
          <div className="space-y-1.5">
            {selectedEntries.map((entry) => (
              <div
                key={`batch-${entry.invoiceId}`}
                className="grid grid-cols-[1fr,auto] items-center gap-1.5"
              >
                <p className="min-w-0 truncate text-[11px] text-muted-foreground">
                  {entry.documentNumber} ·{" "}
                  {formatMinorCurrency(entry.balanceCents, entry.currency, locale)}
                </p>
                <Input
                  value={entry.amountInput}
                  onChange={(e) =>
                    setSelectedAllocations((prev) => {
                      const current = prev[entry.invoiceId];
                      if (!current) return prev;
                      return {
                        ...prev,
                        [entry.invoiceId]: {
                          ...current,
                          amountInput: e.target.value,
                        },
                      };
                    })
                  }
                  disabled={batchBusy}
                  className="w-28"
                  aria-label={`${oc.batchPaymentAmount} ${entry.documentNumber}`}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">{oc.batchPaymentNoSelection}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => {
              void runBatchPayment();
            }}
            disabled={batchBusy || selectedEntries.length === 0}
          >
            {batchBusy ? oc.batchPaymentBusy : oc.batchPaymentRun}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={clearBatchSelection}
            disabled={batchBusy || selectedEntries.length === 0}
          >
            {oc.batchPaymentClear}
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>{copy.loadError}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {batchError ? (
        <Alert variant="destructive">
          <AlertTitle>{oc.batchPaymentFailed}</AlertTitle>
          <AlertDescription>{batchError}</AlertDescription>
        </Alert>
      ) : null}

      {batchMessage ? (
        <Alert>
          <AlertTitle>{oc.batchPaymentSuccess}</AlertTitle>
          <AlertDescription>{batchMessage}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <p className="text-xs text-muted-foreground">
          {locale === "en" ? "Loading…" : "Laden …"}
        </p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">{oc.empty}</p>
      ) : (
        <>
          <div className="min-w-0 overflow-x-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-9 w-[1%] px-1.5 whitespace-nowrap">
                    {oc.batchPaymentSelect}
                  </TableHead>
                  <TableHead className="h-9 w-[1%] whitespace-nowrap">
                    <button
                      type="button"
                      className="inline-flex items-center gap-0.5 font-medium hover:underline"
                      onClick={() => toggleSort("documentNumber")}
                    >
                      {copy.docNumber} {sortGlyph("documentNumber")}
                    </button>
                  </TableHead>
                  <TableHead className="h-9 min-w-0 max-xl:whitespace-normal">
                    <button
                      type="button"
                      className="inline-flex max-w-full items-center gap-0.5 text-left font-medium hover:underline xl:whitespace-nowrap"
                      onClick={() => toggleSort("customerLabel")}
                    >
                      {copy.customer} {sortGlyph("customerLabel")}
                    </button>
                  </TableHead>
                  <TableHead className="h-9 w-[1%] whitespace-nowrap">
                    <button
                      type="button"
                      className="inline-flex items-center gap-0.5 font-medium hover:underline"
                      onClick={() => toggleSort("dueAt")}
                    >
                      {copy.dueDate} {sortGlyph("dueAt")}
                    </button>
                  </TableHead>
                  <TableHead className="h-9 w-[1%] whitespace-nowrap text-right">
                    <button
                      type="button"
                      className="inline-flex items-center gap-0.5 font-medium hover:underline"
                      onClick={() => toggleSort("totalCents")}
                    >
                      {copy.total} {sortGlyph("totalCents")}
                    </button>
                  </TableHead>
                  <TableHead className="h-9 w-[1%] whitespace-nowrap text-right">
                    <button
                      type="button"
                      className="inline-flex items-center gap-0.5 font-medium hover:underline"
                      onClick={() => toggleSort("balanceCents")}
                    >
                      {oc.balance} {sortGlyph("balanceCents")}
                    </button>
                  </TableHead>
                  <TableHead className="h-9 w-[1%] whitespace-nowrap text-right">
                    {oc.paidTotal}
                  </TableHead>
                  <TableHead className="h-9 w-[1%] whitespace-nowrap">
                    {copy.status}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="w-[1%] p-1.5 whitespace-nowrap">
                      <Checkbox
                        checked={selectedAllocations[r.id] !== undefined}
                        onCheckedChange={(checked) => {
                          toggleRowSelection(r, checked === true);
                        }}
                        aria-label={`${oc.batchPaymentSelect} ${r.documentNumber}`}
                      />
                    </TableCell>
                    <TableCell className="p-1.5 font-medium">
                      <Link
                        className="text-primary underline-offset-4 hover:underline"
                        href={`/web/sales/invoices/${encodeURIComponent(r.id)}`}
                      >
                        {r.documentNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="p-1.5 min-w-0 max-w-[min(100%,20rem)] whitespace-normal wrap-break-word xl:max-w-none xl:whitespace-nowrap">
                      {r.customerLabel}
                    </TableCell>
                    <TableCell className="p-1.5">{formatDateShort(r.dueAt, locale)}</TableCell>
                    <TableCell className="p-1.5 text-right tabular-nums">
                      {formatMinorCurrency(r.totalCents, r.currency, locale)}
                    </TableCell>
                    <TableCell className="p-1.5 text-right tabular-nums">
                      {formatMinorCurrency(r.balanceCents, r.currency, locale)}
                    </TableCell>
                    <TableCell className="p-1.5 text-right tabular-nums">
                      {formatMinorCurrency(r.paidTotalCents, r.currency, locale)}
                    </TableCell>
                    <TableCell className="p-1.5">{invoiceStatusLabel(locale, r.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <p className="text-[11px] text-muted-foreground">
              {total}{" "}
              {locale === "en" ? "rows" : "Eintraege"}
            </p>
            <div className="flex gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                {locale === "en" ? "Previous" : "Zurueck"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= maxPage}
                onClick={() => setPage((p) => p + 1)}
              >
                {locale === "en" ? "Next" : "Weiter"}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
