"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  salesInvoiceDetailResponseSchema,
  salesQuoteDetailResponseSchema,
} from "@repo/api-contracts";
import type { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/alert-dialog";
import { Button } from "@repo/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";

import {
  getSalesPrintCopy,
  getSalesFormCopy,
  getSalesLifecycleCopy,
  getSalesTableCopy,
} from "@/content/sales-module";
import type { Locale } from "@/lib/i18n/locale";
import { formatMinorCurrency } from "@/lib/money-format";
import { parseResponseJson } from "@/lib/parse-response-json";
import { toast } from "sonner";

import {
  SalesInvoiceCreateDialog,
  SalesInvoiceEditForm,
} from "./sales-invoice-editor";
import { SalesQuoteEditForm } from "./sales-quote-editor";
import {
  buildProjectTitleMap,
  buildQuoteLinkLabelMap,
} from "./sales-lookups";
import { SalesLinesSection } from "./sales-lines";

type SalesDetailProps = {
  locale: Locale;
  mode: "quotes" | "invoices";
  documentId: string;
};

type LifecycleAction =
  | "archive-quote"
  | "unarchive-quote"
  | "cancel-invoice"
  | "delete-quote"
  | "delete-invoice";

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

export function SalesDetail({
  locale,
  mode,
  documentId,
}: SalesDetailProps) {
  const router = useRouter();
  const copy = getSalesTableCopy(locale);
  const formCopy = getSalesFormCopy(locale);
  const printCopy = getSalesPrintCopy(locale);
  const lifecycleCopy = getSalesLifecycleCopy(locale);
  const listHref =
    mode === "quotes" ? "/web/sales/quotes" : "/web/sales/invoices";
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
  const [invoiceFromQuoteOpen, setInvoiceFromQuoteOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<LifecycleAction | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const fetchDocument = async (
    path: string,
    init?: RequestInit,
  ): Promise<unknown | null> => {
    const res = await fetch(path, { ...init, credentials: "include" });
    if (res.status === 204) return { ok: true };
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
      throw new Error(code);
    }
    return json;
  };

  const lifecycleErrorText = (errCode: string): string => {
    if (errCode === "invalid_state") return lifecycleCopy.actionFailed;
    if (errCode === "quote_has_invoices") return lifecycleCopy.confirmDescDeleteQuote;
    if (errCode === "cannot_cancel_paid") return lifecycleCopy.confirmDescCancelInvoice;
    if (errCode === "not_found") return copy.notFound;
    return lifecycleCopy.actionFailed;
  };

  const runLifecycleAction = async (action: LifecycleAction) => {
    if (actionBusy) return;
    setActionBusy(true);
    try {
      if (action === "archive-quote") {
        const json = await fetchDocument(
          `/api/web/sales/quotes/${encodeURIComponent(documentId)}/archive`,
          { method: "POST" },
        );
        const parsed = salesQuoteDetailResponseSchema.safeParse(json);
        if (!parsed.success) throw new Error("invalid_payload");
        setDetail({ mode: "quotes", data: parsed.data });
        setEditing(false);
        toast.success(lifecycleCopy.actionDone);
        return;
      }
      if (action === "unarchive-quote") {
        const json = await fetchDocument(
          `/api/web/sales/quotes/${encodeURIComponent(documentId)}/unarchive`,
          { method: "POST" },
        );
        const parsed = salesQuoteDetailResponseSchema.safeParse(json);
        if (!parsed.success) throw new Error("invalid_payload");
        setDetail({ mode: "quotes", data: parsed.data });
        setEditing(false);
        toast.success(lifecycleCopy.actionDone);
        return;
      }
      if (action === "cancel-invoice") {
        const json = await fetchDocument(
          `/api/web/sales/invoices/${encodeURIComponent(documentId)}/cancel`,
          { method: "POST" },
        );
        const parsed = salesInvoiceDetailResponseSchema.safeParse(json);
        if (!parsed.success) throw new Error("invalid_payload");
        setDetail({ mode: "invoices", data: parsed.data });
        setEditing(false);
        toast.success(lifecycleCopy.actionDone);
        return;
      }
      if (action === "delete-quote") {
        await fetchDocument(`/api/web/sales/quotes/${encodeURIComponent(documentId)}`, {
          method: "DELETE",
        });
        toast.success(lifecycleCopy.deletedRedirectHint);
        router.push(listHref);
        return;
      }
      await fetchDocument(`/api/web/sales/invoices/${encodeURIComponent(documentId)}`, {
        method: "DELETE",
      });
      toast.success(lifecycleCopy.deletedRedirectHint);
      router.push(listHref);
    } catch (err) {
      const code = err instanceof Error ? err.message : "unknown";
      toast.error(lifecycleErrorText(code));
    } finally {
      setActionBusy(false);
      setConfirmAction(null);
    }
  };

  const confirmTitle =
    confirmAction === "archive-quote"
      ? lifecycleCopy.confirmTitleArchiveQuote
      : confirmAction === "unarchive-quote"
        ? lifecycleCopy.confirmTitleUnarchiveQuote
        : confirmAction === "cancel-invoice"
          ? lifecycleCopy.confirmTitleCancelInvoice
          : confirmAction === "delete-quote"
            ? lifecycleCopy.confirmTitleDeleteQuote
            : lifecycleCopy.confirmTitleDeleteInvoice;

  const confirmDescription =
    confirmAction === "archive-quote"
      ? lifecycleCopy.confirmDescArchiveQuote
      : confirmAction === "unarchive-quote"
        ? lifecycleCopy.confirmDescUnarchiveQuote
        : confirmAction === "cancel-invoice"
          ? lifecycleCopy.confirmDescCancelInvoice
          : confirmAction === "delete-quote"
            ? lifecycleCopy.confirmDescDeleteQuote
            : lifecycleCopy.confirmDescDeleteInvoice;

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
            <Link href={`/web/sales/quotes/${encodeURIComponent(q.id)}/print`}>
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
            variant="default"
            size="sm"
            onClick={() => setInvoiceFromQuoteOpen(true)}
          >
            {formCopy.createInvoiceFromQuote}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setEditing((e) => !e)}
          >
            {editing ? formCopy.cancel : formCopy.edit}
          </Button>
          {q.status === "expired" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmAction("unarchive-quote")}
            >
              {lifecycleCopy.unarchiveQuote}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmAction("archive-quote")}
            >
              {lifecycleCopy.archiveQuote}
            </Button>
          )}
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setConfirmAction("delete-quote")}
          >
            {lifecycleCopy.deleteQuote}
          </Button>
        </div>
        <SalesInvoiceCreateDialog
          locale={locale}
          open={invoiceFromQuoteOpen}
          onOpenChange={setInvoiceFromQuoteOpen}
          onCreated={() => {}}
          presetQuoteId={q.id}
          lockQuoteSelection
          onCreatedInvoiceId={(invoiceId) => {
            router.push(`/web/sales/invoices/${encodeURIComponent(invoiceId)}`);
          }}
        />
        {editing ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{formCopy.edit}</CardTitle>
              <CardDescription>{q.documentNumber}</CardDescription>
            </CardHeader>
            <CardContent>
              <SalesQuoteEditForm
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
        <SalesLinesSection
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
        <AlertDialog
          open={confirmAction !== null}
          onOpenChange={(open) => {
            if (!open && !actionBusy) setConfirmAction(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
              <AlertDialogDescription>{confirmDescription}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={actionBusy}>
                {lifecycleCopy.confirmCancel}
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={actionBusy || confirmAction === null}
                onClick={(event) => {
                  event.preventDefault();
                  if (confirmAction) {
                    void runLifecycleAction(confirmAction);
                  }
                }}
              >
                {actionBusy ? (locale === "en" ? "Working…" : "Bitte warten …") : lifecycleCopy.confirmAction}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
          <Link href={`/web/sales/invoices/${encodeURIComponent(inv.id)}/print`}>
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setConfirmAction("cancel-invoice")}
        >
          {lifecycleCopy.cancelInvoice}
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => setConfirmAction("delete-invoice")}
        >
          {lifecycleCopy.deleteInvoice}
        </Button>
      </div>
      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{formCopy.edit}</CardTitle>
            <CardDescription>{inv.documentNumber}</CardDescription>
          </CardHeader>
          <CardContent>
            <SalesInvoiceEditForm
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
      <SalesLinesSection
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
      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open && !actionBusy) setConfirmAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionBusy}>
              {lifecycleCopy.confirmCancel}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={actionBusy || confirmAction === null}
              onClick={(event) => {
                event.preventDefault();
                if (confirmAction) {
                  void runLifecycleAction(confirmAction);
                }
              }}
            >
              {actionBusy ? (locale === "en" ? "Working…" : "Bitte warten …") : lifecycleCopy.confirmAction}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
