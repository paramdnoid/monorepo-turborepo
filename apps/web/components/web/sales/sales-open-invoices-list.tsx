"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  SALES_INVOICE_STATUS_OPTIONS,
  salesOpenInvoicesListResponseSchema,
  type SalesInvoiceStatus,
  type SalesOpenInvoicesSortBy,
} from "@repo/api-contracts";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/alert";
import { Button } from "@repo/ui/button";
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
import { formatMinorCurrency } from "@/lib/money-format";

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

function formatDateShort(iso: string | null, locale: Locale): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const tag = locale === "en" ? "en-GB" : "de-DE";
  return new Intl.DateTimeFormat(tag, { dateStyle: "medium" }).format(d);
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

  const maxPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);
  const csvParams = new URLSearchParams({
    lang: locale === "en" ? "en" : "de",
  });
  if (projectId?.trim()) csvParams.set("projectId", projectId.trim());
  const csvHref = `/api/web/sales/invoices/open-items/export?${csvParams.toString()}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1 space-y-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="open-inv-q">
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
          />
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={applySearch}>
          {locale === "en" ? "Search" : "Suchen"}
        </Button>
        <Button type="button" size="sm" variant="outline" asChild>
          <a href={csvHref}>{oc.csvDownload}</a>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{oc.exportMaxHint}</p>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>{copy.loadError}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">
          {locale === "en" ? "Loading…" : "Laden …"}
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{oc.empty}</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[1%] whitespace-nowrap">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-medium hover:underline"
                      onClick={() => toggleSort("documentNumber")}
                    >
                      {copy.docNumber} {sortGlyph("documentNumber")}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-medium hover:underline"
                      onClick={() => toggleSort("customerLabel")}
                    >
                      {copy.customer} {sortGlyph("customerLabel")}
                    </button>
                  </TableHead>
                  <TableHead className="w-[1%] whitespace-nowrap">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-medium hover:underline"
                      onClick={() => toggleSort("dueAt")}
                    >
                      {copy.dueDate} {sortGlyph("dueAt")}
                    </button>
                  </TableHead>
                  <TableHead className="w-[1%] whitespace-nowrap text-right">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-medium hover:underline"
                      onClick={() => toggleSort("totalCents")}
                    >
                      {copy.total} {sortGlyph("totalCents")}
                    </button>
                  </TableHead>
                  <TableHead className="w-[1%] whitespace-nowrap text-right">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-medium hover:underline"
                      onClick={() => toggleSort("balanceCents")}
                    >
                      {oc.balance} {sortGlyph("balanceCents")}
                    </button>
                  </TableHead>
                  <TableHead className="w-[1%] whitespace-nowrap text-right">
                    {oc.paidTotal}
                  </TableHead>
                  <TableHead className="w-[1%] whitespace-nowrap">
                    {copy.status}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      <Link
                        className="text-primary underline-offset-4 hover:underline"
                        href={`/web/sales/invoices/${encodeURIComponent(r.id)}`}
                      >
                        {r.documentNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{r.customerLabel}</TableCell>
                    <TableCell>{formatDateShort(r.dueAt, locale)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMinorCurrency(r.totalCents, r.currency, locale)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMinorCurrency(r.balanceCents, r.currency, locale)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMinorCurrency(r.paidTotalCents, r.currency, locale)}
                    </TableCell>
                    <TableCell>{invoiceStatusLabel(locale, r.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {total}{" "}
              {locale === "en" ? "rows" : "Eintraege"}
            </p>
            <div className="flex gap-2">
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
