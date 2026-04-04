"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  SALES_INVOICE_STATUS_OPTIONS,
  SALES_QUOTE_STATUS_OPTIONS,
  type SalesInvoiceStatus,
  type SalesQuoteStatus,
  salesInvoicesListResponseSchema,
  salesQuotesListResponseSchema,
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
import { toast } from "sonner";

import { getSalesFormCopy, getSalesTableCopy } from "@/content/sales-module";
import type { Locale } from "@/lib/i18n/locale";
import { formatMinorCurrency } from "@/lib/money-format";

import {
  SalesInvoiceCreateDialog,
} from "./sales-invoice-editor";
import { SalesQuoteCreateDialog } from "./sales-quote-editor";

type SalesListProps = {
  locale: Locale;
  mode: "quotes" | "invoices";
};

type SortField =
  | "documentNumber"
  | "customerLabel"
  | "status"
  | "totalCents"
  | "extraDate"
  | "updatedAt";

type ListRow = {
  id: string;
  documentNumber: string;
  customerLabel: string;
  status: string;
  currency: string;
  totalCents: number;
  extra: string | null;
  updatedAt: string;
};

function formatDate(iso: string | null, locale: Locale): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const tag = locale === "en" ? "en-GB" : "de-DE";
  return new Intl.DateTimeFormat(tag, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function quoteStatusLabel(locale: Locale, status: SalesQuoteStatus): string {
  if (locale === "en") {
    const m: Record<SalesQuoteStatus, string> = {
      draft: "Draft",
      sent: "Sent",
      accepted: "Accepted",
      rejected: "Rejected",
      expired: "Expired",
    };
    return m[status];
  }
  const m: Record<SalesQuoteStatus, string> = {
    draft: "Entwurf",
    sent: "Versendet",
    accepted: "Akzeptiert",
    rejected: "Abgelehnt",
    expired: "Abgelaufen",
  };
  return m[status];
}

function invoiceStatusLabel(locale: Locale, status: SalesInvoiceStatus): string {
  if (locale === "en") {
    const m: Record<SalesInvoiceStatus, string> = {
      draft: "Draft",
      sent: "Sent",
      paid: "Paid",
      overdue: "Overdue",
      cancelled: "Cancelled",
    };
    return m[status];
  }
  const m: Record<SalesInvoiceStatus, string> = {
    draft: "Entwurf",
    sent: "Versendet",
    paid: "Bezahlt",
    overdue: "Ueberfaellig",
    cancelled: "Storniert",
  };
  return m[status];
}

function csvEscapeCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function SalesList({ locale, mode }: SalesListProps) {
  const copy = getSalesTableCopy(locale);
  const formCopy = getSalesFormCopy(locale);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [refreshToken, setRefreshToken] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("updatedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchBusy, setBatchBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [permissions, setPermissions] = useState({
    canEdit: false,
    canArchive: false,
    canExport: false,
    canBatch: false,
  });
  const [batchStatusTarget, setBatchStatusTarget] = useState<string>(
    mode === "quotes" ? "sent" : "sent",
  );

  const pageSize = 20;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = queryInput.trim();
      setQuery((prev) => (prev === next ? prev : next));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [queryInput]);

  useEffect(() => {
    setPage(0);
  }, [query, statusFilter, dateFrom, dateTo, sortBy, sortDir, mode]);

  useEffect(() => {
    setSelectedIds([]);
  }, [mode, query, statusFilter, dateFrom, dateTo, sortBy, sortDir, page, rows.length]);

  useEffect(() => {
    if (!permissions.canBatch && selectedIds.length > 0) {
      setSelectedIds([]);
    }
  }, [permissions.canBatch, selectedIds.length]);

  useEffect(() => {
    setBatchStatusTarget(mode === "quotes" ? "sent" : "sent");
  }, [mode]);

  const ui = useMemo(
    () =>
      locale === "en"
        ? {
            searchPlaceholder: "Search number or customer",
            statusAll: "All statuses",
            from: "From",
            to: "To",
            clear: "Reset filters",
            noFilteredResults: "No results match the current filters.",
            prev: "Previous",
            next: "Next",
            exportCsv: "Export CSV",
            exportPdfReport: "Export PDF report",
            exportBusy: "Exporting…",
            reportBusy: "Preparing report…",
            exportFailed: "CSV export failed.",
            exportReady: "CSV export is ready.",
            reportReadyHint: "Print dialog opened. Use Save as PDF.",
            reportFailed: "PDF report export failed.",
            selectAllOnPage: "Select all rows on this page",
            selectRow: "Select row",
            selectedCount: "{n} selected",
            targetStatus: "Target status",
            applyBatch: "Apply to selection",
            batchBusy: "Updating…",
            batchResult: "Updated {ok} entries ({fail} failed).",
            batchFailed: "Batch update failed.",
            readonlyHint: "You have read-only access to this module.",
          }
        : {
            searchPlaceholder: "Nummer oder Kunde suchen",
            statusAll: "Alle Status",
            from: "Von",
            to: "Bis",
            clear: "Filter zuruecksetzen",
            noFilteredResults: "Keine Treffer fuer die aktuellen Filter.",
            prev: "Zurueck",
            next: "Weiter",
            exportCsv: "CSV exportieren",
            exportPdfReport: "PDF-Listenreport",
            exportBusy: "Export laeuft …",
            reportBusy: "Report wird erstellt …",
            exportFailed: "CSV-Export fehlgeschlagen.",
            exportReady: "CSV-Export bereit.",
            reportReadyHint:
              "Druckdialog geoeffnet. Dort 'Als PDF speichern' waehlen.",
            reportFailed: "PDF-Listenreport fehlgeschlagen.",
            selectAllOnPage: "Alle Zeilen auf dieser Seite auswaehlen",
            selectRow: "Zeile auswaehlen",
            selectedCount: "{n} ausgewaehlt",
            targetStatus: "Zielstatus",
            applyBatch: "Auf Auswahl anwenden",
            batchBusy: "Aktualisiere …",
            batchResult: "{ok} Eintraege aktualisiert ({fail} fehlgeschlagen).",
            batchFailed: "Massenaktion fehlgeschlagen.",
            readonlyHint: "Sie haben nur Leserechte fuer dieses Modul.",
          },
    [locale],
  );

  const buildListParams = useCallback(
    (limit: number, offset: number) => {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      params.set(
        "sortBy",
        sortBy === "extraDate" ? (mode === "quotes" ? "validUntil" : "dueAt") : sortBy,
      );
      params.set("sortDir", sortDir);
      params.set("limit", String(limit));
      params.set("offset", String(offset));
      return params;
    },
    [dateFrom, dateTo, mode, query, sortBy, sortDir, statusFilter],
  );

  const loadRows = useCallback(async () => {
    const path = mode === "quotes" ? "/api/web/sales/quotes" : "/api/web/sales/invoices";
    const params = buildListParams(pageSize, page * pageSize);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${path}?${params.toString()}`, {
        credentials: "include",
      });
      const text = await res.text();
      if (!res.ok) {
        setError(copy.loadError);
        setRows([]);
        setTotal(0);
        setPermissions({
          canEdit: false,
          canArchive: false,
          canExport: false,
          canBatch: false,
        });
        return;
      }
      const json: unknown = JSON.parse(text);
      if (mode === "quotes") {
        const parsed = salesQuotesListResponseSchema.safeParse(json);
        if (!parsed.success) {
          setError(copy.loadError);
          setRows([]);
          setTotal(0);
          setPermissions({
            canEdit: false,
            canArchive: false,
            canExport: false,
            canBatch: false,
          });
          return;
        }
        setTotal(parsed.data.total);
        setPermissions(parsed.data.permissions);
        setRows(
          parsed.data.quotes.map((q) => ({
            id: q.id,
            documentNumber: q.documentNumber,
            customerLabel: q.customerLabel,
            status: q.status,
            currency: q.currency,
            totalCents: q.totalCents,
            extra: q.validUntil,
            updatedAt: q.updatedAt,
          })),
        );
        return;
      }
      const invParsed = salesInvoicesListResponseSchema.safeParse(json);
      if (!invParsed.success) {
        setError(copy.loadError);
        setRows([]);
        setTotal(0);
        setPermissions({
          canEdit: false,
          canArchive: false,
          canExport: false,
          canBatch: false,
        });
        return;
      }
      setTotal(invParsed.data.total);
      setPermissions(invParsed.data.permissions);
      setRows(
        invParsed.data.invoices.map((i) => ({
          id: i.id,
          documentNumber: i.documentNumber,
          customerLabel: i.customerLabel,
          status: i.status,
          currency: i.currency,
          totalCents: i.totalCents,
          extra: i.dueAt,
          updatedAt: i.updatedAt,
        })),
      );
    } catch {
      setError(copy.loadError);
      setRows([]);
      setTotal(0);
      setPermissions({
        canEdit: false,
        canArchive: false,
        canExport: false,
        canBatch: false,
      });
    } finally {
      setLoading(false);
    }
  }, [mode, copy.loadError, buildListParams, page]);

  useEffect(() => {
    void loadRows();
  }, [loadRows, refreshToken]);

  const bumpRefresh = useCallback(() => {
    setRefreshToken((t) => t + 1);
  }, []);

  const baseHref =
    mode === "quotes" ? "/web/sales/quotes" : "/web/sales/invoices";

  const extraHead =
    mode === "quotes" ? copy.validUntil : copy.dueDate;

  const statusOptions =
    mode === "quotes" ? SALES_QUOTE_STATUS_OPTIONS : SALES_INVOICE_STATUS_OPTIONS;
  const canEdit = permissions.canEdit;
  const canArchive = permissions.canArchive;
  const canExport = permissions.canExport;
  const canBatch = permissions.canBatch;

  const pageIds = rows.map((r) => r.id);
  const allOnPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
  const someOnPageSelected = pageIds.some((id) => selectedIds.includes(id));

  const statusLabel = useCallback(
    (s: string) => {
      if (mode === "quotes") {
        if (SALES_QUOTE_STATUS_OPTIONS.includes(s as SalesQuoteStatus)) {
          return quoteStatusLabel(locale, s as SalesQuoteStatus);
        }
        return s;
      }
      if (SALES_INVOICE_STATUS_OPTIONS.includes(s as SalesInvoiceStatus)) {
        return invoiceStatusLabel(locale, s as SalesInvoiceStatus);
      }
      return s;
    },
    [locale, mode],
  );

  const ariaSort = (field: SortField): "ascending" | "descending" | "none" =>
    sortBy === field ? (sortDir === "asc" ? "ascending" : "descending") : "none";

  const toggleSort = (field: SortField) => {
    setSortBy((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir(field === "updatedAt" || field === "extraDate" ? "desc" : "asc");
      return field;
    });
  };

  const sortGlyph = (field: SortField) =>
    sortBy === field ? (sortDir === "asc" ? "↑" : "↓") : "↕";

  const sortSrText = (field: SortField) => {
    if (sortBy !== field) {
      return locale === "en"
        ? "Not sorted by this column"
        : "Nicht nach dieser Spalte sortiert";
    }
    if (sortDir === "asc") {
      return locale === "en"
        ? "Sorted ascending"
        : "Aufsteigend sortiert";
    }
    return locale === "en" ? "Sorted descending" : "Absteigend sortiert";
  };

  const onResetFilters = () => {
    setQueryInput("");
    setQuery("");
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
    setSortBy("updatedAt");
    setSortDir("desc");
    setPage(0);
  };

  const toggleSelectAllOnPage = () => {
    if (allOnPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
      return;
    }
    setSelectedIds((prev) => [...new Set([...prev, ...pageIds])]);
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleExportCsv = async () => {
    if (exportBusy || !canExport) return;
    setExportBusy(true);
    try {
      const path = mode === "quotes" ? "/api/web/sales/quotes" : "/api/web/sales/invoices";
      const allRows: ListRow[] = [];
      let offset = 0;
      const step = 200;
      let totalRows = 0;
      while (true) {
        const params = buildListParams(step, offset);
        const res = await fetch(`${path}?${params.toString()}`, {
          credentials: "include",
        });
        const text = await res.text();
        if (!res.ok) {
          throw new Error("export_list_failed");
        }
        const json: unknown = JSON.parse(text);
        if (mode === "quotes") {
          const parsed = salesQuotesListResponseSchema.safeParse(json);
          if (!parsed.success) throw new Error("export_parse_failed");
          totalRows = parsed.data.total;
          allRows.push(
            ...parsed.data.quotes.map((q) => ({
              id: q.id,
              documentNumber: q.documentNumber,
              customerLabel: q.customerLabel,
              status: q.status,
              currency: q.currency,
              totalCents: q.totalCents,
              extra: q.validUntil,
              updatedAt: q.updatedAt,
            })),
          );
        } else {
          const parsed = salesInvoicesListResponseSchema.safeParse(json);
          if (!parsed.success) throw new Error("export_parse_failed");
          totalRows = parsed.data.total;
          allRows.push(
            ...parsed.data.invoices.map((i) => ({
              id: i.id,
              documentNumber: i.documentNumber,
              customerLabel: i.customerLabel,
              status: i.status,
              currency: i.currency,
              totalCents: i.totalCents,
              extra: i.dueAt,
              updatedAt: i.updatedAt,
            })),
          );
        }
        offset += step;
        if (allRows.length >= totalRows || totalRows === 0) break;
      }

      const header = [
        "id",
        "documentNumber",
        "customerLabel",
        "status",
        "currency",
        "totalCents",
        mode === "quotes" ? "validUntil" : "dueAt",
        "updatedAt",
      ].join(",");
      const lines = allRows.map((r) =>
        [
          csvEscapeCell(r.id),
          csvEscapeCell(r.documentNumber),
          csvEscapeCell(r.customerLabel),
          csvEscapeCell(r.status),
          csvEscapeCell(r.currency),
          String(r.totalCents),
          csvEscapeCell(r.extra ?? ""),
          csvEscapeCell(r.updatedAt),
        ].join(","),
      );
      const csv = "\ufeff" + [header, ...lines].join("\r\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download =
        mode === "quotes" ? "sales-quotes-export.csv" : "sales-invoices-export.csv";
      a.rel = "noopener";
      a.click();
      URL.revokeObjectURL(href);
      toast.success(ui.exportReady);
    } catch {
      toast.error(ui.exportFailed);
    } finally {
      setExportBusy(false);
    }
  };

  const handleExportPdfReport = async () => {
    if (reportBusy || !canExport) return;
    setReportBusy(true);
    try {
      const path = mode === "quotes" ? "/api/web/sales/quotes" : "/api/web/sales/invoices";
      const allRows: ListRow[] = [];
      let offset = 0;
      const step = 200;
      let totalRows = 0;
      while (true) {
        const params = buildListParams(step, offset);
        const res = await fetch(`${path}?${params.toString()}`, {
          credentials: "include",
        });
        const text = await res.text();
        if (!res.ok) {
          throw new Error("report_list_failed");
        }
        const json: unknown = JSON.parse(text);
        if (mode === "quotes") {
          const parsed = salesQuotesListResponseSchema.safeParse(json);
          if (!parsed.success) throw new Error("report_parse_failed");
          totalRows = parsed.data.total;
          allRows.push(
            ...parsed.data.quotes.map((q) => ({
              id: q.id,
              documentNumber: q.documentNumber,
              customerLabel: q.customerLabel,
              status: q.status,
              currency: q.currency,
              totalCents: q.totalCents,
              extra: q.validUntil,
              updatedAt: q.updatedAt,
            })),
          );
        } else {
          const parsed = salesInvoicesListResponseSchema.safeParse(json);
          if (!parsed.success) throw new Error("report_parse_failed");
          totalRows = parsed.data.total;
          allRows.push(
            ...parsed.data.invoices.map((i) => ({
              id: i.id,
              documentNumber: i.documentNumber,
              customerLabel: i.customerLabel,
              status: i.status,
              currency: i.currency,
              totalCents: i.totalCents,
              extra: i.dueAt,
              updatedAt: i.updatedAt,
            })),
          );
        }
        offset += step;
        if (allRows.length >= totalRows || totalRows === 0) break;
      }

      const win = window.open("", "_blank", "noopener,noreferrer");
      if (!win) {
        throw new Error("report_window_blocked");
      }
      const rowsHtml = allRows
        .map(
          (r) => `<tr>
  <td>${escapeHtml(r.documentNumber)}</td>
  <td>${escapeHtml(r.customerLabel)}</td>
  <td>${escapeHtml(statusLabel(r.status))}</td>
  <td style="text-align:right">${escapeHtml(
            formatMinorCurrency(r.totalCents, r.currency, locale),
          )}</td>
  <td>${escapeHtml(formatDate(r.extra, locale))}</td>
  <td>${escapeHtml(formatDate(r.updatedAt, locale))}</td>
</tr>`,
        )
        .join("");
      const reportTitle =
        mode === "quotes"
          ? locale === "en"
            ? "Quotes list report"
            : "Angebotsliste"
          : locale === "en"
            ? "Invoices list report"
            : "Rechnungsliste";
      const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(reportTitle)}</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; padding: 24px; color: #111; }
    h1 { margin: 0 0 8px; font-size: 20px; }
    .meta { margin-bottom: 14px; color: #444; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #d5d5d5; padding: 6px 8px; vertical-align: top; }
    th { background: #f5f5f5; text-align: left; }
  </style>
</head>
<body>
  <h1>${escapeHtml(reportTitle)}</h1>
  <div class="meta">${escapeHtml(
    locale === "en"
      ? `Generated: ${new Date().toLocaleString("en-GB")}`
      : `Erstellt: ${new Date().toLocaleString("de-DE")}`,
  )}</div>
  <table>
    <thead>
      <tr>
        <th>${escapeHtml(copy.docNumber)}</th>
        <th>${escapeHtml(copy.customer)}</th>
        <th>${escapeHtml(copy.status)}</th>
        <th style="text-align:right">${escapeHtml(copy.total)}</th>
        <th>${escapeHtml(extraHead)}</th>
        <th>${escapeHtml(copy.date)}</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
</body>
</html>`;
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.focus();
      win.print();
      toast.success(ui.reportReadyHint);
    } catch {
      toast.error(ui.reportFailed);
    } finally {
      setReportBusy(false);
    }
  };

  const handleApplyBatchStatus = async () => {
    if (batchBusy || selectedIds.length === 0 || !canBatch || !canArchive) return;
    setBatchBusy(true);
    let successCount = 0;
    let failCount = 0;
    try {
      for (const id of selectedIds) {
        const targetPath =
          mode === "quotes"
            ? `/api/web/sales/quotes/${encodeURIComponent(id)}`
            : `/api/web/sales/invoices/${encodeURIComponent(id)}`;
        try {
          const res = await fetch(targetPath, {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: batchStatusTarget }),
          });
          if (res.ok) {
            successCount += 1;
          } else {
            failCount += 1;
          }
        } catch {
          failCount += 1;
        }
      }
      if (successCount > 0) {
        toast.success(
          ui.batchResult
            .replace("{ok}", String(successCount))
            .replace("{fail}", String(failCount)),
        );
      } else {
        toast.error(ui.batchFailed);
      }
      setSelectedIds([]);
      bumpRefresh();
    } finally {
      setBatchBusy(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 0;
  const canNext = (page + 1) * pageSize < total;
  const rangeFrom = total === 0 ? 0 : page * pageSize + 1;
  const rangeTo = total === 0 ? 0 : Math.min(total, page * pageSize + rows.length);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{copy.listHint}</p>
          {!canEdit ? (
            <p className="text-xs text-muted-foreground">{ui.readonlyHint}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canExport ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void handleExportCsv()}
                disabled={loading || total === 0 || exportBusy}
              >
                {exportBusy ? ui.exportBusy : ui.exportCsv}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void handleExportPdfReport()}
                disabled={loading || total === 0 || reportBusy}
              >
                {reportBusy ? ui.reportBusy : ui.exportPdfReport}
              </Button>
            </>
          ) : null}
          {mode === "quotes" ? (
            <>
              {canEdit ? (
                <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
                  {formCopy.newQuote}
                </Button>
              ) : null}
              <SalesQuoteCreateDialog
                locale={locale}
                open={createOpen}
                onOpenChange={setCreateOpen}
                onCreated={bumpRefresh}
              />
            </>
          ) : (
            <>
              {canEdit ? (
                <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
                  {formCopy.newInvoice}
                </Button>
              ) : null}
              <SalesInvoiceCreateDialog
                locale={locale}
                open={createOpen}
                onOpenChange={setCreateOpen}
                onCreated={bumpRefresh}
              />
            </>
          )}
        </div>
      </div>

      <div className="grid gap-2 rounded-md border bg-card p-3 md:grid-cols-[minmax(0,1fr)_220px_160px_160px_auto] md:items-end">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor={`sales-search-${mode}`}>
            {copy.customer}
          </label>
          <Input
            id={`sales-search-${mode}`}
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const next = queryInput.trim();
                setQuery(next);
                setPage(0);
              }
            }}
            placeholder={ui.searchPlaceholder}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor={`sales-status-${mode}`}>
            {copy.status}
          </label>
          <select
            id={`sales-status-${mode}`}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">{ui.statusAll}</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor={`sales-date-from-${mode}`}>
            {ui.from}
          </label>
          <Input
            id={`sales-date-from-${mode}`}
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor={`sales-date-to-${mode}`}>
            {ui.to}
          </label>
          <Input
            id={`sales-date-to-${mode}`}
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        <Button type="button" variant="outline" onClick={onResetFilters}>
          {ui.clear}
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>{copy.loadError}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!loading && rows.length > 0 && canBatch && canArchive ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-card p-3">
          <span className="text-xs text-muted-foreground">
            {ui.selectedCount.replace("{n}", String(selectedIds.length))}
          </span>
          <label className="text-xs text-muted-foreground" htmlFor={`sales-batch-status-${mode}`}>
            {ui.targetStatus}
          </label>
          <select
            id={`sales-batch-status-${mode}`}
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={batchStatusTarget}
            onChange={(e) => setBatchStatusTarget(e.target.value)}
            disabled={batchBusy}
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={selectedIds.length === 0 || batchBusy}
            onClick={() => void handleApplyBatchStatus()}
          >
            {batchBusy ? ui.batchBusy : ui.applyBatch}
          </Button>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">
          {locale === "en" ? "Loading…" : "Laden …"}
        </p>
      ) : null}

      {!loading && !error && rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {query || statusFilter !== "all" || dateFrom || dateTo
            ? ui.noFilteredResults
            : mode === "quotes"
              ? copy.emptyQuotes
              : copy.emptyInvoices}
        </p>
      ) : null}

      {!loading && rows.length > 0 ? (
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                {canBatch ? (
                  <TableHead className="w-[1%] p-2">
                    <Checkbox
                      checked={
                        allOnPageSelected
                          ? true
                          : someOnPageSelected
                            ? "indeterminate"
                            : false
                      }
                      onCheckedChange={() => toggleSelectAllOnPage()}
                      aria-label={ui.selectAllOnPage}
                    />
                  </TableHead>
                ) : null}
                <TableHead aria-sort={ariaSort("documentNumber")}>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 hover:text-foreground"
                    onClick={() => toggleSort("documentNumber")}
                  >
                    {copy.docNumber} <span aria-hidden>{sortGlyph("documentNumber")}</span>
                    <span className="sr-only">{sortSrText("documentNumber")}</span>
                  </button>
                </TableHead>
                <TableHead aria-sort={ariaSort("customerLabel")}>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 hover:text-foreground"
                    onClick={() => toggleSort("customerLabel")}
                  >
                    {copy.customer} <span aria-hidden>{sortGlyph("customerLabel")}</span>
                    <span className="sr-only">{sortSrText("customerLabel")}</span>
                  </button>
                </TableHead>
                <TableHead aria-sort={ariaSort("status")}>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 hover:text-foreground"
                    onClick={() => toggleSort("status")}
                  >
                    {copy.status} <span aria-hidden>{sortGlyph("status")}</span>
                    <span className="sr-only">{sortSrText("status")}</span>
                  </button>
                </TableHead>
                <TableHead className="text-right" aria-sort={ariaSort("totalCents")}>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 hover:text-foreground"
                    onClick={() => toggleSort("totalCents")}
                  >
                    {copy.total} <span aria-hidden>{sortGlyph("totalCents")}</span>
                    <span className="sr-only">{sortSrText("totalCents")}</span>
                  </button>
                </TableHead>
                <TableHead aria-sort={ariaSort("extraDate")}>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 hover:text-foreground"
                    onClick={() => toggleSort("extraDate")}
                  >
                    {extraHead} <span aria-hidden>{sortGlyph("extraDate")}</span>
                    <span className="sr-only">{sortSrText("extraDate")}</span>
                  </button>
                </TableHead>
                <TableHead aria-sort={ariaSort("updatedAt")}>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 hover:text-foreground"
                    onClick={() => toggleSort("updatedAt")}
                  >
                    {copy.date} <span aria-hidden>{sortGlyph("updatedAt")}</span>
                    <span className="sr-only">{sortSrText("updatedAt")}</span>
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  {canBatch ? (
                    <TableCell className="w-[1%] p-2 align-middle">
                      <Checkbox
                        checked={selectedIds.includes(r.id)}
                        onCheckedChange={() => toggleRow(r.id)}
                        aria-label={`${ui.selectRow}: ${r.documentNumber}`}
                      />
                    </TableCell>
                  ) : null}
                  <TableCell className="font-medium">
                    <Link
                      href={`${baseHref}/${r.id}`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {r.documentNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{r.customerLabel}</TableCell>
                  <TableCell>{statusLabel(r.status)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMinorCurrency(r.totalCents, r.currency, locale)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(r.extra, locale)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(r.updatedAt, locale)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            {locale === "en"
              ? `${rangeFrom}-${rangeTo} of ${total}`
              : `${rangeFrom}-${rangeTo} von ${total}`}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={!canPrev}
            >
              {ui.prev}
            </Button>
            <span>
              {locale === "en"
                ? `Page ${Math.min(page + 1, totalPages)} / ${totalPages}`
                : `Seite ${Math.min(page + 1, totalPages)} / ${totalPages}`}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!canNext}
            >
              {ui.next}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
