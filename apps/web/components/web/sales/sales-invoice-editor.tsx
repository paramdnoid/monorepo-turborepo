"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  SALES_INVOICE_STATUS_OPTIONS,
  type SalesInvoiceStatus,
  salesInvoiceDetailResponseSchema,
  salesInvoiceDetailSchema,
} from "@repo/api-contracts";
import type { z } from "zod";
import { Alert, AlertDescription } from "@repo/ui/alert";
import { Button } from "@repo/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/dialog";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";

import {
  getSalesFormCopy,
  getSalesTableCopy,
} from "@/content/sales-module";
import type { Locale } from "@/lib/i18n/locale";
import {
  dateInputToIsoNoon,
  formatMinorCurrency,
  isoToDateInputValue,
  parseMajorToMinorUnits,
} from "@/lib/money-format";

import {
  fetchSalesCustomerOptions,
  recipientLabelFromCustomerId,
} from "./sales-customer-master";
import {
  fetchSalesProjectOptions,
  fetchSalesQuoteLinkOptions,
} from "./sales-lookups";

type InvoiceDetail = z.infer<typeof salesInvoiceDetailSchema>;

function invoiceStatusLabel(locale: Locale, s: SalesInvoiceStatus): string {
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

type SalesInvoiceCreateDialogProps = {
  locale: Locale;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  /** Beim Öffnen vorausgewähltes Angebot (z. B. von der Angebotsdetailseite). */
  presetQuoteId?: string | null;
  /** Angebotsauswahl nicht änderbar (zusammen mit presetQuoteId). */
  lockQuoteSelection?: boolean;
  onCreatedInvoiceId?: (invoiceId: string) => void;
};

export function SalesInvoiceCreateDialog({
  locale,
  open,
  onOpenChange,
  onCreated,
  presetQuoteId = null,
  lockQuoteSelection = false,
  onCreatedInvoiceId,
}: SalesInvoiceCreateDialogProps) {
  const fc = getSalesFormCopy(locale);
  const tc = getSalesTableCopy(locale);
  const [documentNumber, setDocumentNumber] = useState("");
  const [customerLabel, setCustomerLabel] = useState("");
  const [status, setStatus] = useState<SalesInvoiceStatus>("draft");
  const [totalStr, setTotalStr] = useState("");
  const [quoteId, setQuoteId] = useState<string>("");
  const [projectId, setProjectId] = useState("");
  const [issuedYmd, setIssuedYmd] = useState("");
  const [dueYmd, setDueYmd] = useState("");
  const [paidYmd, setPaidYmd] = useState("");
  const [quoteOptions, setQuoteOptions] = useState<{ id: string; label: string }[]>(
    [],
  );
  const [projectOptions, setProjectOptions] = useState<
    { id: string; title: string }[]
  >([]);
  const [masterCustomerId, setMasterCustomerId] = useState("");
  const [customerStammOptions, setCustomerStammOptions] = useState<
    { id: string; label: string }[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDocumentNumber("");
    setCustomerLabel("");
    setStatus("draft");
    setTotalStr("");
    setQuoteId(presetQuoteId?.trim() ? presetQuoteId : "");
    setProjectId("");
    setIssuedYmd("");
    setDueYmd("");
    setPaidYmd("");
    setMasterCustomerId("");
    setError(null);
    void (async () => {
      const [quotes, projects, customers] = await Promise.all([
        fetchSalesQuoteLinkOptions(),
        fetchSalesProjectOptions(),
        fetchSalesCustomerOptions(),
      ]);
      setQuoteOptions(quotes);
      setProjectOptions(projects);
      setCustomerStammOptions(customers);
    })();
  }, [open, presetQuoteId]);

  useEffect(() => {
    if (!masterCustomerId) {
      return;
    }
    let cancelled = false;
    void recipientLabelFromCustomerId(masterCustomerId).then((t) => {
      if (!cancelled && t) {
        setCustomerLabel(t);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [masterCustomerId]);

  const copyFromQuote = quoteId !== "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (copyFromQuote) {
      if (!documentNumber.trim()) {
        setError(fc.saveFailed);
        return;
      }
      setBusy(true);
      try {
        const res = await fetch(
          `/api/web/sales/quotes/${encodeURIComponent(quoteId)}/invoices`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              documentNumber: documentNumber.trim(),
              status,
              issuedAt: dateInputToIsoNoon(issuedYmd),
              dueAt: dateInputToIsoNoon(dueYmd),
              paidAt: dateInputToIsoNoon(paidYmd),
            }),
          },
        );
        if (res.status === 409) {
          setError(fc.conflictNumber);
          return;
        }
        if (!res.ok) {
          setError(fc.saveFailed);
          return;
        }
        const json: unknown = await res.json();
        const parsed = salesInvoiceDetailResponseSchema.safeParse(json);
        if (!parsed.success) {
          setError(fc.saveFailed);
          return;
        }
        onCreatedInvoiceId?.(parsed.data.invoice.id);
        onCreated();
        onOpenChange(false);
      } finally {
        setBusy(false);
      }
      return;
    }

    const totalCents = parseMajorToMinorUnits(totalStr, locale);
    if (totalCents === null) {
      setError(fc.validationAmount);
      return;
    }
    if (!documentNumber.trim() || !customerLabel.trim()) {
      setError(fc.saveFailed);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/web/sales/invoices", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentNumber: documentNumber.trim(),
          customerLabel: customerLabel.trim(),
          status,
          currency: "EUR",
          totalCents,
          quoteId: null,
          projectId: projectId === "" ? null : projectId,
          issuedAt: dateInputToIsoNoon(issuedYmd),
          dueAt: dateInputToIsoNoon(dueYmd),
          paidAt: dateInputToIsoNoon(paidYmd),
          customerId: masterCustomerId === "" ? null : masterCustomerId,
        }),
      });
      if (res.status === 409) {
        setError(fc.conflictNumber);
        return;
      }
      if (!res.ok) {
        setError(fc.saveFailed);
        return;
      }
      onCreated();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {copyFromQuote ? fc.newInvoiceFromQuote : fc.newInvoice}
            </DialogTitle>
          </DialogHeader>
          <div className="grid max-h-[70vh] gap-4 overflow-y-auto py-4 pr-1">
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            {copyFromQuote ? (
              <p className="text-sm text-muted-foreground">{fc.invoiceFromQuoteHint}</p>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="i-doc">{fc.docNumber}</Label>
              <Input
                id="i-doc"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                required
              />
            </div>
            {copyFromQuote ? null : (
              <>
                <div className="grid gap-2">
                  <Label>{fc.masterCustomer}</Label>
                  <Select
                    value={masterCustomerId === "" ? "__none__" : masterCustomerId}
                    onValueChange={(v) =>
                      setMasterCustomerId(v === "__none__" ? "" : v)
                    }
                  >
                    <SelectTrigger className="w-full" aria-label={fc.masterCustomer}>
                      <SelectValue placeholder={fc.noMasterCustomer} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{fc.noMasterCustomer}</SelectItem>
                      {customerStammOptions.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-fit"
                      disabled={!masterCustomerId}
                      onClick={() => {
                        void recipientLabelFromCustomerId(masterCustomerId).then(
                          (t) => {
                            if (t) {
                              setCustomerLabel(t);
                            }
                          },
                        );
                      }}
                    >
                      {fc.fillLabelFromMaster}
                    </Button>
                    {masterCustomerId ? (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto px-0"
                        asChild
                      >
                        <Link href={`/web/customers/${masterCustomerId}`}>
                          {fc.openMasterCustomer}
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="i-cust">{fc.customer}</Label>
                  <Input
                    id="i-cust"
                    value={customerLabel}
                    onChange={(e) => setCustomerLabel(e.target.value)}
                    required
                  />
                </div>
              </>
            )}
            <div className="grid gap-2">
              <Label>{tc.status}</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as SalesInvoiceStatus)}
              >
                <SelectTrigger className="w-full" aria-label={tc.status}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SALES_INVOICE_STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {invoiceStatusLabel(locale, s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {copyFromQuote ? null : (
              <div className="grid gap-2">
                <Label htmlFor="i-total">{fc.total}</Label>
                <Input
                  id="i-total"
                  placeholder={fc.totalPlaceholder}
                  value={totalStr}
                  onChange={(e) => setTotalStr(e.target.value)}
                  inputMode="decimal"
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label>{fc.linkQuote}</Label>
              <Select
                value={quoteId === "" ? "__none__" : quoteId}
                onValueChange={(v) =>
                  setQuoteId(v === "__none__" ? "" : v)
                }
                disabled={lockQuoteSelection}
              >
                <SelectTrigger className="w-full" aria-label={fc.linkQuote}>
                  <SelectValue placeholder={fc.noneQuote} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{fc.noneQuote}</SelectItem>
                  {quoteOptions.map((q) => (
                    <SelectItem key={q.id} value={q.id}>
                      {q.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {copyFromQuote ? null : (
              <div className="grid gap-2">
                <Label>{fc.linkProject}</Label>
                <Select
                  value={projectId === "" ? "__none__" : projectId}
                  onValueChange={(v) =>
                    setProjectId(v === "__none__" ? "" : v)
                  }
                >
                  <SelectTrigger className="w-full" aria-label={fc.linkProject}>
                    <SelectValue placeholder={fc.noneProject} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{fc.noneProject}</SelectItem>
                    {projectOptions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="i-issued">{fc.issued}</Label>
              <Input
                id="i-issued"
                type="date"
                value={issuedYmd}
                onChange={(e) => setIssuedYmd(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="i-due">{fc.due}</Label>
              <Input
                id="i-due"
                type="date"
                value={dueYmd}
                onChange={(e) => setDueYmd(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="i-paid">{fc.paid}</Label>
              <Input
                id="i-paid"
                type="date"
                value={paidYmd}
                onChange={(e) => setPaidYmd(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              {fc.cancel}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? fc.saving : fc.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type SalesInvoiceEditFormProps = {
  locale: Locale;
  invoice: InvoiceDetail;
  onSaved: (next: InvoiceDetail) => void;
  onCancel: () => void;
};

export function SalesInvoiceEditForm({
  locale,
  invoice,
  onSaved,
  onCancel,
}: SalesInvoiceEditFormProps) {
  const fc = getSalesFormCopy(locale);
  const tc = getSalesTableCopy(locale);
  const [documentNumber, setDocumentNumber] = useState(invoice.documentNumber);
  const [customerLabel, setCustomerLabel] = useState(invoice.customerLabel);
  const [status, setStatus] = useState<SalesInvoiceStatus>(
    invoice.status as SalesInvoiceStatus,
  );
  const [totalStr, setTotalStr] = useState("");
  const [quoteId, setQuoteId] = useState<string>(invoice.quoteId ?? "");
  const [projectId, setProjectId] = useState<string>(invoice.projectId ?? "");
  const [issuedYmd, setIssuedYmd] = useState(
    isoToDateInputValue(invoice.issuedAt),
  );
  const [dueYmd, setDueYmd] = useState(isoToDateInputValue(invoice.dueAt));
  const [paidYmd, setPaidYmd] = useState(isoToDateInputValue(invoice.paidAt));
  const [quoteOptions, setQuoteOptions] = useState<{ id: string; label: string }[]>(
    [],
  );
  const [projectOptions, setProjectOptions] = useState<
    { id: string; title: string }[]
  >([]);
  const [masterCustomerId, setMasterCustomerId] = useState("");
  const [customerStammOptions, setCustomerStammOptions] = useState<
    { id: string; label: string }[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [quotes, projects, customers] = await Promise.all([
        fetchSalesQuoteLinkOptions(),
        fetchSalesProjectOptions(),
        fetchSalesCustomerOptions(),
      ]);
      setQuoteOptions(quotes);
      setProjectOptions(projects);
      setCustomerStammOptions(customers);
    })();
  }, []);

  useEffect(() => {
    setDocumentNumber(invoice.documentNumber);
    setCustomerLabel(invoice.customerLabel);
    setMasterCustomerId(invoice.customerId ?? "");
    setStatus(invoice.status as SalesInvoiceStatus);
    setTotalStr(
      (invoice.totalCents / 100).toLocaleString(
        locale === "en" ? "en-US" : "de-DE",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        },
      ),
    );
    setQuoteId(invoice.quoteId ?? "");
    setProjectId(invoice.projectId ?? "");
    setIssuedYmd(isoToDateInputValue(invoice.issuedAt));
    setDueYmd(isoToDateInputValue(invoice.dueAt));
    setPaidYmd(isoToDateInputValue(invoice.paidAt));
  }, [invoice, locale]);

  const hasLines = invoice.lines.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    let totalCents: number | null = null;
    if (!hasLines) {
      totalCents = parseMajorToMinorUnits(totalStr, locale);
      if (totalCents === null) {
        setError(fc.validationAmount);
        return;
      }
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/web/sales/invoices/${invoice.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentNumber: documentNumber.trim(),
          customerLabel: customerLabel.trim(),
          customerId: masterCustomerId === "" ? null : masterCustomerId,
          status,
          currency: invoice.currency,
          ...(hasLines ? {} : { totalCents }),
          quoteId: quoteId === "" ? null : quoteId,
          projectId: projectId === "" ? null : projectId,
          issuedAt: dateInputToIsoNoon(issuedYmd),
          dueAt: dateInputToIsoNoon(dueYmd),
          paidAt: dateInputToIsoNoon(paidYmd),
        }),
      });
      if (res.status === 409) {
        setError(fc.conflictNumber);
        return;
      }
      if (!res.ok) {
        setError(fc.saveFailed);
        return;
      }
      const json: unknown = await res.json();
      const parsed = salesInvoiceDetailResponseSchema.safeParse(json);
      if (!parsed.success) {
        setError(fc.saveFailed);
        return;
      }
      onSaved(parsed.data.invoice);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-2">
        <Label htmlFor="ie-doc">{fc.docNumber}</Label>
        <Input
          id="ie-doc"
          value={documentNumber}
          onChange={(e) => setDocumentNumber(e.target.value)}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label>{fc.masterCustomer}</Label>
        <Select
          value={masterCustomerId === "" ? "__none__" : masterCustomerId}
          onValueChange={(v) => {
            const id = v === "__none__" ? "" : v;
            setMasterCustomerId(id);
            if (id) {
              void recipientLabelFromCustomerId(id).then((t) => {
                if (t) {
                  setCustomerLabel(t);
                }
              });
            }
          }}
        >
          <SelectTrigger className="w-full" aria-label={fc.masterCustomer}>
            <SelectValue placeholder={fc.noMasterCustomer} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">{fc.noMasterCustomer}</SelectItem>
            {customerStammOptions.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            disabled={!masterCustomerId}
            onClick={() => {
              void recipientLabelFromCustomerId(masterCustomerId).then((t) => {
                if (t) {
                  setCustomerLabel(t);
                }
              });
            }}
          >
            {fc.fillLabelFromMaster}
          </Button>
          {masterCustomerId ? (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto px-0"
              asChild
            >
              <Link href={`/web/customers/${masterCustomerId}`}>
                {fc.openMasterCustomer}
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="ie-cust">{fc.customer}</Label>
        <Input
          id="ie-cust"
          value={customerLabel}
          onChange={(e) => setCustomerLabel(e.target.value)}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label>{tc.status}</Label>
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as SalesInvoiceStatus)}
        >
          <SelectTrigger className="w-full" aria-label={tc.status}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SALES_INVOICE_STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {invoiceStatusLabel(locale, s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={hasLines ? "ie-total-display" : "ie-total"}>
          {hasLines ? fc.totalFromLines : fc.total}
        </Label>
        {hasLines ? (
          <p
            id="ie-total-display"
            className="rounded-md border border-input bg-muted/30 px-3 py-2 text-sm tabular-nums"
          >
            {formatMinorCurrency(invoice.totalCents, invoice.currency, locale)}
          </p>
        ) : (
          <Input
            id="ie-total"
            placeholder={fc.totalPlaceholder}
            value={totalStr}
            onChange={(e) => setTotalStr(e.target.value)}
            inputMode="decimal"
          />
        )}
      </div>
      <div className="grid gap-2">
        <Label>{fc.linkQuote}</Label>
        <Select
          value={quoteId === "" ? "__none__" : quoteId}
          onValueChange={(v) => setQuoteId(v === "__none__" ? "" : v)}
        >
          <SelectTrigger className="w-full" aria-label={fc.linkQuote}>
            <SelectValue placeholder={fc.noneQuote} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">{fc.noneQuote}</SelectItem>
            {quoteOptions.map((q) => (
              <SelectItem key={q.id} value={q.id}>
                {q.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>{fc.linkProject}</Label>
        <Select
          value={projectId === "" ? "__none__" : projectId}
          onValueChange={(v) => setProjectId(v === "__none__" ? "" : v)}
        >
          <SelectTrigger className="w-full" aria-label={fc.linkProject}>
            <SelectValue placeholder={fc.noneProject} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">{fc.noneProject}</SelectItem>
            {projectOptions.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="ie-issued">{fc.issued}</Label>
        <Input
          id="ie-issued"
          type="date"
          value={issuedYmd}
          onChange={(e) => setIssuedYmd(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="ie-due">{fc.due}</Label>
        <Input
          id="ie-due"
          type="date"
          value={dueYmd}
          onChange={(e) => setDueYmd(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="ie-paid">{fc.paid}</Label>
        <Input
          id="ie-paid"
          type="date"
          value={paidYmd}
          onChange={(e) => setPaidYmd(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
          {fc.cancel}
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? fc.saving : fc.save}
        </Button>
      </div>
    </form>
  );
}
