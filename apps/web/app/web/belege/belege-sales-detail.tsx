"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  salesInvoiceDetailResponseSchema,
  salesQuoteDetailResponseSchema,
} from "@repo/api-contracts";
import type { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/alert";
import { Button } from "@repo/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";

import {
  getBelegePrintCopy,
  getBelegeSalesFormCopy,
  getBelegeSalesTableCopy,
} from "@/content/belege-module";
import type { Locale } from "@/lib/i18n/locale";
import { formatMinorCurrency } from "@/lib/money-format";

import { BelegeInvoiceEditForm } from "./belege-invoice-editor";
import { BelegeQuoteEditForm } from "./belege-quote-editor";
import {
  buildProjectTitleMap,
  buildQuoteLinkLabelMap,
} from "./belege-sales-lookups";
import { BelegeSalesLinesSection } from "./belege-sales-lines";

type BelegeSalesDetailProps = {
  locale: Locale;
  mode: "quotes" | "invoices";
  documentId: string;
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

function DetailLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-1 sm:grid-cols-[minmax(0,12rem)_1fr] sm:gap-4">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}

export function BelegeSalesDetail({
  locale,
  mode,
  documentId,
}: BelegeSalesDetailProps) {
  const copy = getBelegeSalesTableCopy(locale);
  const formCopy = getBelegeSalesFormCopy(locale);
  const printCopy = getBelegePrintCopy(locale);
  const listHref =
    mode === "quotes" ? "/web/belege/angebote" : "/web/belege/rechnungen";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);

  type QuoteDetailPayload = z.infer<typeof salesQuoteDetailResponseSchema>;
  type InvoiceDetailPayload = z.infer<typeof salesInvoiceDetailResponseSchema>;

  type DetailState =
    | { mode: "quotes"; data: QuoteDetailPayload }
    | { mode: "invoices"; data: InvoiceDetailPayload };

  const [detail, setDetail] = useState<DetailState | null>(null);
  const [projectTitles, setProjectTitles] = useState<Map<string, string>>(
    () => new Map(),
  );
  const [quoteLabels, setQuoteLabels] = useState<Map<string, string>>(
    () => new Map(),
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [pm, qm] = await Promise.all([
        buildProjectTitleMap(),
        buildQuoteLinkLabelMap(),
      ]);
      if (!cancelled) {
        setProjectTitles(pm);
        setQuoteLabels(qm);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [documentId, mode]);

  useEffect(() => {
    let cancelled = false;
    const path =
      mode === "quotes"
        ? `/api/web/sales/quotes/${encodeURIComponent(documentId)}`
        : `/api/web/sales/invoices/${encodeURIComponent(documentId)}`;

    void (async () => {
      setLoading(true);
      setError(null);
      setNotFound(false);
      setDetail(null);
      try {
        const res = await fetch(path, { credentials: "include" });
        const text = await res.text();
        if (cancelled) return;
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) {
          setError(copy.loadError);
          return;
        }
        const json: unknown = JSON.parse(text);
        if (mode === "quotes") {
          const parsed = salesQuoteDetailResponseSchema.safeParse(json);
          if (!parsed.success) {
            setError(copy.loadError);
            return;
          }
          setDetail({ mode: "quotes", data: parsed.data });
          return;
        }
        const parsed = salesInvoiceDetailResponseSchema.safeParse(json);
        if (!parsed.success) {
          setError(copy.loadError);
          return;
        }
        setDetail({ mode: "invoices", data: parsed.data });
      } catch {
        if (!cancelled) setError(copy.loadError);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mode, documentId, copy.loadError]);

  useEffect(() => {
    setEditing(false);
  }, [documentId, mode]);

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">
        {locale === "en" ? "Loading…" : "Laden …"}
      </p>
    );
  }

  if (notFound) {
    return (
      <Alert variant="destructive">
        <AlertTitle>{copy.notFound}</AlertTitle>
        <AlertDescription>
          <Button variant="outline" size="sm" className="mt-2" asChild>
            <Link href={listHref}>{copy.backToList}</Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (error || !detail) {
    return (
      <Alert variant="destructive">
        <AlertTitle>{copy.loadError}</AlertTitle>
        <AlertDescription>{error ?? ""}</AlertDescription>
      </Alert>
    );
  }

  if (detail.mode === "quotes") {
    const q = detail.data.quote;
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={listHref}>{copy.backToList}</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/web/belege/angebote/${encodeURIComponent(q.id)}/druck`}>
              {copy.previewPrint}
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={`/api/web/sales/quotes/${encodeURIComponent(q.id)}/pdf`}>
              {printCopy.downloadPdf}
            </a>
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setEditing((e) => !e)}
          >
            {editing ? formCopy.cancel : formCopy.edit}
          </Button>
        </div>
        {editing ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{formCopy.edit}</CardTitle>
              <CardDescription>{q.documentNumber}</CardDescription>
            </CardHeader>
            <CardContent>
              <BelegeQuoteEditForm
                locale={locale}
                quote={q}
                onSaved={(next) => {
                  setDetail({ mode: "quotes", data: { quote: next } });
                  setEditing(false);
                }}
                onCancel={() => setEditing(false)}
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{q.documentNumber}</CardTitle>
              <CardDescription>{q.customerLabel}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <dl className="space-y-3">
                <DetailLine label={copy.status} value={q.status} />
                <DetailLine
                  label={copy.total}
                  value={formatMinorCurrency(q.totalCents, q.currency, locale)}
                />
                <DetailLine
                  label={copy.validUntil}
                  value={formatDate(q.validUntil, locale)}
                />
                <DetailLine
                  label={copy.date}
                  value={formatDate(q.updatedAt, locale)}
                />
                <DetailLine
                  label={copy.project}
                  value={
                    q.projectId
                      ? (projectTitles.get(q.projectId) ?? q.projectId)
                      : "—"
                  }
                />
              </dl>
            </CardContent>
          </Card>
        )}
        <BelegeSalesLinesSection
          locale={locale}
          mode="quotes"
          documentId={q.id}
          lines={q.lines}
          onDocumentUpdated={(next) =>
            setDetail(
              "quote" in next
                ? { mode: "quotes", data: next }
                : { mode: "invoices", data: next },
            )
          }
        />
      </div>
    );
  }

  const inv = detail.data.invoice;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={listHref}>{copy.backToList}</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/web/belege/rechnungen/${encodeURIComponent(inv.id)}/druck`}>
            {copy.previewPrint}
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href={`/api/web/sales/invoices/${encodeURIComponent(inv.id)}/pdf`}>
            {printCopy.downloadPdf}
          </a>
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setEditing((e) => !e)}
        >
          {editing ? formCopy.cancel : formCopy.edit}
        </Button>
      </div>
      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{formCopy.edit}</CardTitle>
            <CardDescription>{inv.documentNumber}</CardDescription>
          </CardHeader>
          <CardContent>
            <BelegeInvoiceEditForm
              locale={locale}
              invoice={inv}
              onSaved={(next) => {
                setDetail({ mode: "invoices", data: { invoice: next } });
                setEditing(false);
              }}
              onCancel={() => setEditing(false)}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{inv.documentNumber}</CardTitle>
            <CardDescription>{inv.customerLabel}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <dl className="space-y-3">
              <DetailLine label={copy.status} value={inv.status} />
              <DetailLine
                label={copy.total}
                value={formatMinorCurrency(
                  inv.totalCents,
                  inv.currency,
                  locale,
                )}
              />
              <DetailLine
                label={copy.issued}
                value={formatDate(inv.issuedAt, locale)}
              />
              <DetailLine
                label={copy.dueDate}
                value={formatDate(inv.dueAt, locale)}
              />
              <DetailLine
                label={copy.paidAt}
                value={formatDate(inv.paidAt, locale)}
              />
              <DetailLine
                label={copy.quoteRef}
                value={
                  inv.quoteId
                    ? (quoteLabels.get(inv.quoteId) ?? inv.quoteId)
                    : "—"
                }
              />
              <DetailLine
                label={copy.project}
                value={
                  inv.projectId
                    ? (projectTitles.get(inv.projectId) ?? inv.projectId)
                    : "—"
                }
              />
              <DetailLine
                label={copy.date}
                value={formatDate(inv.updatedAt, locale)}
              />
            </dl>
          </CardContent>
        </Card>
      )}
      <BelegeSalesLinesSection
        locale={locale}
        mode="invoices"
        documentId={inv.id}
        lines={inv.lines}
        onDocumentUpdated={(next) =>
          setDetail(
            "quote" in next
              ? { mode: "quotes", data: next }
              : { mode: "invoices", data: next },
          )
        }
      />
    </div>
  );
}
