"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  salesInvoicesListResponseSchema,
  salesQuotesListResponseSchema,
} from "@repo/api-contracts";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/alert";
import { Button } from "@repo/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/table";

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

export function SalesList({ locale, mode }: SalesListProps) {
  const copy = getSalesTableCopy(locale);
  const formCopy = getSalesFormCopy(locale);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ListRow[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);

  const loadRows = useCallback(async () => {
    const path =
      mode === "quotes" ? "/api/web/sales/quotes" : "/api/web/sales/invoices";
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(path, { credentials: "include" });
      const text = await res.text();
      if (!res.ok) {
        setError(copy.loadError);
        setRows([]);
        return;
      }
      const json: unknown = JSON.parse(text);
      if (mode === "quotes") {
        const parsed = salesQuotesListResponseSchema.safeParse(json);
        if (!parsed.success) {
          setError(copy.loadError);
          setRows([]);
          return;
        }
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
        return;
      }
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
    } finally {
      setLoading(false);
    }
  }, [mode, copy.loadError]);

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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-sm text-muted-foreground">{copy.listHint}</p>
        {mode === "quotes" ? (
          <>
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
              {formCopy.newQuote}
            </Button>
            <SalesQuoteCreateDialog
              locale={locale}
              open={createOpen}
              onOpenChange={setCreateOpen}
              onCreated={bumpRefresh}
            />
          </>
        ) : (
          <>
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
              {formCopy.newInvoice}
            </Button>
            <SalesInvoiceCreateDialog
              locale={locale}
              open={createOpen}
              onOpenChange={setCreateOpen}
              onCreated={bumpRefresh}
            />
          </>
        )}
      </div>

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
      ) : null}

      {!loading && !error && rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {mode === "quotes" ? copy.emptyQuotes : copy.emptyInvoices}
        </p>
      ) : null}

      {!loading && rows.length > 0 ? (
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{copy.docNumber}</TableHead>
                <TableHead>{copy.customer}</TableHead>
                <TableHead>{copy.status}</TableHead>
                <TableHead className="text-right">{copy.total}</TableHead>
                <TableHead>{extraHead}</TableHead>
                <TableHead>{copy.date}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`${baseHref}/${r.id}`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {r.documentNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{r.customerLabel}</TableCell>
                  <TableCell className="capitalize">{r.status}</TableCell>
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
    </div>
  );
}
