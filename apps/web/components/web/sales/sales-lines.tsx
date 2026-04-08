"use client";

import { useEffect, useMemo, useState } from "react";
import {
  salesInvoiceDetailResponseSchema,
  salesQuoteDetailResponseSchema,
  type CatalogArticleListItem,
  type SalesDocumentLine,
  type SalesPatchQuoteLineInput,
} from "@repo/api-contracts";
import type { z } from "zod";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
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
  getSalesFormCopy,
  getSalesLinesCopy,
} from "@/content/sales-module";
import type { Locale } from "@/lib/i18n/locale";
import {
  parseMajorToMinorUnits,
  parseQuantityAsMultiplier,
} from "@/lib/money-format";

type QuoteDetailPayload = z.infer<typeof salesQuoteDetailResponseSchema>;
type InvoiceDetailPayload = z.infer<typeof salesInvoiceDetailResponseSchema>;

function sortDocumentLines(lines: SalesDocumentLine[]): SalesDocumentLine[] {
  return [...lines].sort(
    (a, b) =>
      a.sortIndex - b.sortIndex || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}

/** Katalog-API liefert Preis oft als Punkt-Dezimal (`12.50`); Formularparser erwartet Locale-Format. */
function catalogPriceTextToMinorUnits(
  raw: string | null | undefined,
  locale: Locale,
): number | null {
  if (raw == null || !String(raw).trim()) return null;
  const t = String(raw).trim();
  if (/^\d+(\.\d+)?$/.test(t)) {
    const n = Number(t);
    return Number.isFinite(n) ? Math.round(n * 100) : null;
  }
  return parseMajorToMinorUnits(t, locale);
}

function minorToEditString(cents: number, locale: Locale): string {
  return (cents / 100).toLocaleString(locale === "en" ? "en-US" : "de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function bpsToPercentEditString(bps: number, locale: Locale): string {
  return (bps / 100).toLocaleString(locale === "en" ? "en-US" : "de-DE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function parsePercentToBps(raw: string, locale: Locale): number | null {
  const n = parseQuantityAsMultiplier(raw, locale);
  if (n === null) return null;
  const bps = Math.round(n * 100);
  if (bps < 0 || bps > 10_000) return null;
  return bps;
}

function computeDiscountedLineTotalCents(
  args: {
    unitPriceCents: number;
    quantity: string;
    discountPercent: string;
  },
  locale: Locale,
): number | null {
  const unitPrice = args.unitPriceCents;
  const multiplier = parseQuantityAsMultiplier(args.quantity, locale);
  const discountBps = parsePercentToBps(args.discountPercent, locale);
  if (multiplier === null || discountBps === null) return null;
  const base = Math.round(multiplier * unitPrice);
  return Math.max(0, Math.round((base * (10_000 - discountBps)) / 10_000));
}

function swapAdjacentLineIds(
  orderedIds: string[],
  index: number,
  direction: "up" | "down",
): string[] {
  const next = [...orderedIds];
  if (direction === "up" && index > 0) {
    const t = next[index - 1];
    next[index - 1] = next[index]!;
    next[index] = t!;
  } else if (direction === "down" && index < next.length - 1) {
    const t = next[index + 1];
    next[index + 1] = next[index]!;
    next[index] = t!;
  }
  return next;
}

type SalesLinesSectionProps = {
  locale: Locale;
  mode: "quotes" | "invoices";
  documentId: string;
  lines: SalesDocumentLine[];
  readOnly?: boolean;
  onDocumentUpdated: (
    next: QuoteDetailPayload | InvoiceDetailPayload,
  ) => void;
};

export function SalesLinesSection({
  locale,
  mode,
  documentId,
  lines,
  readOnly = false,
  onDocumentUpdated,
}: SalesLinesSectionProps) {
  const lc = getSalesLinesCopy(locale);
  const fc = getSalesFormCopy(locale);
  const sortedLines = useMemo(() => sortDocumentLines(lines), [lines]);
  const [addOpen, setAddOpen] = useState(false);
  const [busyLineId, setBusyLineId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const interactionLocked = readOnly || busyLineId !== null || reordering;

  useEffect(() => {
    if (!addOpen) {
      setError(null);
    }
  }, [addOpen]);

  function basePath(): string {
    return mode === "quotes"
      ? `/api/web/sales/quotes/${encodeURIComponent(documentId)}`
      : `/api/web/sales/invoices/${encodeURIComponent(documentId)}`;
  }

  async function applyDetailResponse(res: Response): Promise<boolean> {
    const json: unknown = await res.json();
    if (mode === "quotes") {
      const parsed = salesQuoteDetailResponseSchema.safeParse(json);
      if (!parsed.success) return false;
      onDocumentUpdated(parsed.data);
      return true;
    }
    const parsed = salesInvoiceDetailResponseSchema.safeParse(json);
    if (!parsed.success) return false;
    onDocumentUpdated(parsed.data);
    return true;
  }

  async function patchLine(
    lineId: string,
    body: SalesPatchQuoteLineInput,
  ): Promise<Response> {
    return fetch(`${basePath()}/lines/${encodeURIComponent(lineId)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function handleDelete(lineId: string) {
    setBusyLineId(lineId);
    setError(null);
    try {
      const res = await fetch(`${basePath()}/lines/${encodeURIComponent(lineId)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok || !(await applyDetailResponse(res))) {
        setError(lc.lineSaveFailed);
      }
    } finally {
      setBusyLineId(null);
    }
  }

  async function handleSaveLine(
    lineId: string,
    body: SalesPatchQuoteLineInput,
  ): Promise<boolean> {
    setBusyLineId(lineId);
    setError(null);
    try {
      const res = await patchLine(lineId, body);
      if (!res.ok || !(await applyDetailResponse(res))) {
        setError(lc.lineSaveFailed);
        return false;
      }
      return true;
    } finally {
      setBusyLineId(null);
    }
  }

  async function reorderWithPayload(lineIds: string[]) {
    setReordering(true);
    setError(null);
    try {
      const res = await fetch(`${basePath()}/lines/reorder`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineIds }),
      });
      if (!res.ok || !(await applyDetailResponse(res))) {
        setError(lc.lineSaveFailed);
      }
    } finally {
      setReordering(false);
    }
  }

  async function handleMoveUp(index: number) {
    if (index <= 0 || reordering || busyLineId) return;
    const orderedIds = sortedLines.map((l) => l.id);
    await reorderWithPayload(swapAdjacentLineIds(orderedIds, index, "up"));
  }

  async function handleMoveDown(index: number) {
    if (index >= sortedLines.length - 1 || reordering || busyLineId) return;
    const orderedIds = sortedLines.map((l) => l.id);
    await reorderWithPayload(swapAdjacentLineIds(orderedIds, index, "down"));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">{lc.heading}</h2>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={interactionLocked}
          onClick={() => setAddOpen(true)}
        >
          {lc.addLine}
        </Button>
      </div>
      {error ? (
        <Alert variant="destructive" role="status" aria-live="polite">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {sortedLines.length === 0 ? (
        <p className="text-sm text-muted-foreground">{lc.emptyLines}</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-160 text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
              <tr>
                <th className="px-1 py-2 w-14 font-medium align-bottom">
                  <span className="sr-only">{lc.moveUp}</span>
                </th>
                <th className="px-3 py-2 font-medium">{lc.description}</th>
                <th className="px-3 py-2 font-medium">{lc.quantity}</th>
                <th className="px-3 py-2 font-medium">{lc.unit}</th>
                <th className="px-3 py-2 font-medium">{lc.unitPrice}</th>
                <th className="px-3 py-2 font-medium">
                  {locale === "en" ? "VAT %" : "MwSt %"}
                </th>
                <th className="px-3 py-2 font-medium">
                  {locale === "en" ? "Discount %" : "Rabatt %"}
                </th>
                <th className="px-3 py-2 font-medium">{lc.lineTotal}</th>
                <th className="px-3 py-2 font-medium w-28">{fc.save}</th>
                <th className="px-2 py-2 font-medium w-24" aria-label={lc.deleteLine} />
              </tr>
            </thead>
            <tbody>
              {sortedLines.map((line, index) => (
                <SalesLineRow
                  key={line.id}
                  line={line}
                  locale={locale}
                  lc={lc}
                  fc={fc}
                  interactionLocked={interactionLocked}
                  busyLineId={busyLineId}
                  canMoveUp={index > 0}
                  canMoveDown={index < sortedLines.length - 1}
                  onMoveUp={() => void handleMoveUp(index)}
                  onMoveDown={() => void handleMoveDown(index)}
                  onSave={(body) => handleSaveLine(line.id, body)}
                  onDelete={() => void handleDelete(line.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <SalesLineAddDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        locale={locale}
        lc={lc}
        onSubmit={async (body) => {
          setError(null);
          const res = await fetch(`${basePath()}/lines`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (!res.ok || !(await applyDetailResponse(res))) {
            setError(lc.lineSaveFailed);
            return false;
          }
          return true;
        }}
      />
    </div>
  );
}

type LineAddCopy = ReturnType<typeof getSalesLinesCopy>;
type FormCopy = ReturnType<typeof getSalesFormCopy>;

type SalesLineRowProps = {
  line: SalesDocumentLine;
  locale: Locale;
  lc: LineAddCopy;
  fc: FormCopy;
  interactionLocked: boolean;
  busyLineId: string | null;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSave: (body: SalesPatchQuoteLineInput) => Promise<boolean>;
  onDelete: () => void;
};

function SalesLineRow({
  line,
  locale,
  lc,
  fc,
  interactionLocked,
  busyLineId,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onSave,
  onDelete,
}: SalesLineRowProps) {
  const [description, setDescription] = useState(line.description);
  const [quantity, setQuantity] = useState(line.quantity ?? "");
  const [unit, setUnit] = useState(line.unit ?? "");
  const [unitPriceStr, setUnitPriceStr] = useState(() =>
    minorToEditString(line.unitPriceCents, locale),
  );
  const [taxRatePercentStr, setTaxRatePercentStr] = useState(() =>
    bpsToPercentEditString(line.taxRateBps, locale),
  );
  const [discountPercentStr, setDiscountPercentStr] = useState(() =>
    bpsToPercentEditString(line.discountBps, locale),
  );
  const [lineTotalStr, setLineTotalStr] = useState(() =>
    minorToEditString(line.lineTotalCents, locale),
  );

  useEffect(() => {
    setDescription(line.description);
    setQuantity(line.quantity ?? "");
    setUnit(line.unit ?? "");
    setUnitPriceStr(minorToEditString(line.unitPriceCents, locale));
    setTaxRatePercentStr(bpsToPercentEditString(line.taxRateBps, locale));
    setDiscountPercentStr(bpsToPercentEditString(line.discountBps, locale));
    setLineTotalStr(minorToEditString(line.lineTotalCents, locale));
  }, [
    line.id,
    line.description,
    line.quantity,
    line.unit,
    line.unitPriceCents,
    line.taxRateBps,
    line.discountBps,
    line.lineTotalCents,
    line.sortIndex,
    locale,
  ]);

  const rowBusy = busyLineId === line.id;
  const qtyNorm = quantity.trim() ? quantity.trim() : null;
  const unitNorm = unit.trim() ? unit.trim() : null;
  const draftDesc = description.trim();

  const isDirty =
    draftDesc !== line.description ||
    qtyNorm !== (line.quantity ?? null) ||
    unitNorm !== (line.unit ?? null) ||
    unitPriceStr !== minorToEditString(line.unitPriceCents, locale) ||
    taxRatePercentStr !== bpsToPercentEditString(line.taxRateBps, locale) ||
    discountPercentStr !== bpsToPercentEditString(line.discountBps, locale) ||
    lineTotalStr !== minorToEditString(line.lineTotalCents, locale);

  async function handleSaveClick() {
    if (!draftDesc) {
      return;
    }
    const unitPriceCents = parseMajorToMinorUnits(unitPriceStr, locale);
    const taxRateBps = parsePercentToBps(taxRatePercentStr, locale);
    const discountBps = parsePercentToBps(discountPercentStr, locale);
    const lineTotalCents = parseMajorToMinorUnits(lineTotalStr, locale);
    if (
      unitPriceCents === null ||
      taxRateBps === null ||
      discountBps === null ||
      lineTotalCents === null
    ) {
      return;
    }
    await onSave({
      description: draftDesc,
      quantity: qtyNorm,
      unit: unitNorm,
      unitPriceCents,
      taxRateBps,
      discountBps,
      lineTotalCents,
    });
  }

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-1 py-1.5 align-top">
        <div className="flex flex-col gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            disabled={!canMoveUp || interactionLocked}
            aria-label={lc.moveUp}
            onClick={onMoveUp}
          >
            <ChevronUp className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            disabled={!canMoveDown || interactionLocked}
            aria-label={lc.moveDown}
            onClick={onMoveDown}
          >
            <ChevronDown className="size-4" />
          </Button>
        </div>
      </td>
      <td className="px-2 py-1.5 align-top min-w-32">
        <div className="space-y-1">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={interactionLocked}
            aria-label={lc.description}
            className="min-h-9"
          />
          {line.catalogArticleId ? (
            <span className="text-xs text-muted-foreground">
              {lc.catalogLineLinked}
            </span>
          ) : null}
        </div>
      </td>
      <td className="px-2 py-1.5 align-top w-20">
        <Input
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          disabled={interactionLocked}
          aria-label={lc.quantity}
          className="min-h-9"
        />
      </td>
      <td className="px-2 py-1.5 align-top w-20">
        <Input
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          disabled={interactionLocked}
          aria-label={lc.unit}
          className="min-h-9"
        />
      </td>
      <td className="px-2 py-1.5 align-top min-w-24">
        <Input
          value={unitPriceStr}
          onChange={(e) => setUnitPriceStr(e.target.value)}
          disabled={interactionLocked}
          inputMode="decimal"
          aria-label={lc.unitPrice}
          className="min-h-9"
        />
      </td>
      <td className="px-2 py-1.5 align-top w-28">
        <div className="flex flex-col gap-1">
          <Input
            value={taxRatePercentStr}
            onChange={(e) => setTaxRatePercentStr(e.target.value)}
            disabled={interactionLocked}
            inputMode="decimal"
            aria-label={locale === "en" ? "VAT percent" : "MwSt Prozent"}
            className="min-h-9"
          />
          <div className="flex gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 flex-1 px-1 text-xs"
              disabled={interactionLocked}
              onClick={() =>
                setTaxRatePercentStr(bpsToPercentEditString(700, locale))
              }
            >
              7%
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 flex-1 px-1 text-xs"
              disabled={interactionLocked}
              onClick={() =>
                setTaxRatePercentStr(bpsToPercentEditString(1900, locale))
              }
            >
              19%
            </Button>
          </div>
        </div>
      </td>
      <td className="px-2 py-1.5 align-top w-20">
        <Input
          value={discountPercentStr}
          onChange={(e) => setDiscountPercentStr(e.target.value)}
          disabled={interactionLocked}
          inputMode="decimal"
          aria-label={locale === "en" ? "Discount percent" : "Rabatt Prozent"}
          className="min-h-9"
        />
      </td>
      <td className="px-2 py-1.5 align-top min-w-26">
        <div className="flex flex-col gap-1">
          <Input
            value={lineTotalStr}
            onChange={(e) => setLineTotalStr(e.target.value)}
            disabled={interactionLocked}
            inputMode="decimal"
            aria-label={lc.lineTotal}
            className="min-h-9"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto justify-start px-1 py-0 text-xs font-normal text-muted-foreground hover:text-foreground"
            disabled={interactionLocked}
            onClick={() => {
              const up = parseMajorToMinorUnits(unitPriceStr, locale);
              if (up === null) return;
              const computed = computeDiscountedLineTotalCents(
                {
                  unitPriceCents: up,
                  quantity,
                  discountPercent: discountPercentStr,
                },
                locale,
              );
              if (computed === null) return;
              setLineTotalStr(minorToEditString(computed, locale));
            }}
          >
            {lc.lineCalcFromQty}
          </Button>
        </div>
      </td>
      <td className="px-2 py-1.5 align-top">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={!isDirty || interactionLocked || rowBusy || !draftDesc}
          onClick={() => void handleSaveClick()}
        >
          {rowBusy ? fc.saving : fc.save}
        </Button>
      </td>
      <td className="px-1 py-1.5 align-top">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          disabled={interactionLocked || rowBusy}
          onClick={onDelete}
        >
          {lc.deleteLine}
        </Button>
      </td>
    </tr>
  );
}

type SalesLineAddDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: Locale;
  lc: LineAddCopy;
  onSubmit: (body: {
    description: string;
    quantity: string | null;
    unit: string | null;
    unitPriceCents: number;
    taxRateBps: number;
    discountBps: number;
    lineTotalCents: number;
    catalogArticleId?: string;
  }) => Promise<boolean>;
};

function SalesLineAddDialog({
  open,
  onOpenChange,
  locale,
  lc,
  onSubmit,
}: SalesLineAddDialogProps) {
  const fc = getSalesFormCopy(locale);
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [unitPriceStr, setUnitPriceStr] = useState("");
  const [taxRatePercentStr, setTaxRatePercentStr] = useState("19");
  const [discountPercentStr, setDiscountPercentStr] = useState("0");
  const [lineTotalStr, setLineTotalStr] = useState("");
  const [busy, setBusy] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [catalogArticleId, setCatalogArticleId] = useState<string | null>(null);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogHits, setCatalogHits] = useState<CatalogArticleListItem[]>([]);
  const [catalogSearchBusy, setCatalogSearchBusy] = useState(false);
  const [catalogDidSearch, setCatalogDidSearch] = useState(false);

  useEffect(() => {
    if (open) {
      setDescription("");
      setQuantity("");
      setUnit("");
      setUnitPriceStr("");
      setTaxRatePercentStr("19");
      setDiscountPercentStr("0");
      setLineTotalStr("");
      setLocalErr(null);
      setCatalogArticleId(null);
      setCatalogQuery("");
      setCatalogHits([]);
      setCatalogDidSearch(false);
    }
  }, [open]);

  async function searchCatalog() {
    setCatalogSearchBusy(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "30");
      if (catalogQuery.trim()) params.set("q", catalogQuery.trim());
      const res = await fetch(`/api/web/catalog/articles?${params}`, {
        credentials: "include",
      });
      if (!res.ok) {
        setCatalogHits([]);
        setCatalogDidSearch(true);
        return;
      }
      const data = (await res.json()) as {
        articles?: CatalogArticleListItem[];
      };
      setCatalogHits(data.articles ?? []);
      setCatalogDidSearch(true);
    } finally {
      setCatalogSearchBusy(false);
    }
  }

  function applyCatalogArticle(a: CatalogArticleListItem) {
    setCatalogArticleId(a.id);
    setDescription(a.name?.trim() ? a.name.trim() : a.supplierSku);
    setUnit(a.unit ?? "");
    setQuantity("1");
    const cents = catalogPriceTextToMinorUnits(a.price, locale);
    if (cents !== null) {
      setUnitPriceStr(minorToEditString(cents, locale));
      setLineTotalStr(minorToEditString(cents, locale));
    } else {
      setUnitPriceStr("");
      setLineTotalStr("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalErr(null);
    if (!description.trim()) {
      setLocalErr(lc.lineSaveFailed);
      return;
    }
    const unitPriceCents = parseMajorToMinorUnits(unitPriceStr, locale);
    const taxRateBps = parsePercentToBps(taxRatePercentStr, locale);
    const discountBps = parsePercentToBps(discountPercentStr, locale);
    const lineTotalCents = parseMajorToMinorUnits(lineTotalStr, locale);
    if (
      unitPriceCents === null ||
      taxRateBps === null ||
      discountBps === null ||
      lineTotalCents === null
    ) {
      setLocalErr(lc.lineSaveFailed);
      return;
    }
    setBusy(true);
    try {
      const ok = await onSubmit({
        description: description.trim(),
        quantity: quantity.trim() ? quantity.trim() : null,
        unit: unit.trim() ? unit.trim() : null,
        unitPriceCents,
        taxRateBps,
        discountBps,
        lineTotalCents,
        ...(catalogArticleId ? { catalogArticleId } : {}),
      });
      if (ok) {
        onOpenChange(false);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={(e) => void handleSubmit(e)}>
          <DialogHeader>
            <DialogTitle>{lc.newLineTitle}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {localErr ? (
              <Alert variant="destructive" role="status" aria-live="polite">
                <AlertDescription>{localErr}</AlertDescription>
              </Alert>
            ) : null}
            <fieldset className="space-y-3 rounded-md border border-border p-3">
              <legend className="px-1 text-sm font-medium">{lc.catalogSectionTitle}</legend>
              <p className="text-xs text-muted-foreground">{lc.catalogLinkedHint}</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="grid min-w-0 flex-1 gap-2">
                  <Label htmlFor="ln-catalog-q">{lc.catalogSearchLabel}</Label>
                  <Input
                    id="ln-catalog-q"
                    value={catalogQuery}
                    onChange={(e) => setCatalogQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void searchCatalog();
                      }
                    }}
                    placeholder={lc.catalogSearchPlaceholder}
                    autoComplete="off"
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={catalogSearchBusy}
                  onClick={() => void searchCatalog()}
                >
                  {catalogSearchBusy ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : null}
                  {lc.catalogSearchButton}
                </Button>
              </div>
              {catalogHits.length > 0 ? (
                <ul
                  className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-border p-1"
                  role="list"
                  aria-label={lc.catalogSectionTitle}
                >
                  {catalogHits.map((a) => (
                    <li key={a.id} role="listitem">
                      <button
                        type="button"
                        className="flex w-full flex-col items-start gap-0.5 rounded px-2 py-1.5 text-left text-sm hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => applyCatalogArticle(a)}
                      >
                        <span className="font-mono text-xs text-muted-foreground">
                          {a.supplierSku}
                        </span>
                        <span className="line-clamp-2">{a.name ?? "—"}</span>
                        <span className="text-xs text-muted-foreground">
                          {a.price ?? "—"} {a.currency} · {a.supplierName}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : catalogDidSearch && !catalogSearchBusy ? (
                <p className="text-xs text-muted-foreground">{lc.catalogNoResults}</p>
              ) : null}
              {catalogArticleId ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-foreground">
                    {lc.catalogLineLinked}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => {
                      setCatalogArticleId(null);
                    }}
                  >
                    {lc.catalogClear}
                  </Button>
                </div>
              ) : null}
            </fieldset>
            <div className="grid gap-2">
              <Label htmlFor="ln-desc">{lc.description}</Label>
              <Input
                id="ln-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="ln-qty">{lc.quantity}</Label>
                <Input
                  id="ln-qty"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ln-unit">{lc.unit}</Label>
                <Input
                  id="ln-unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ln-up">{lc.unitPrice}</Label>
              <Input
                id="ln-up"
                value={unitPriceStr}
                onChange={(e) => setUnitPriceStr(e.target.value)}
                inputMode="decimal"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="ln-tax">{locale === "en" ? "VAT %" : "MwSt %"}</Label>
                <Input
                  id="ln-tax"
                  value={taxRatePercentStr}
                  onChange={(e) => setTaxRatePercentStr(e.target.value)}
                  inputMode="decimal"
                />
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 flex-1 px-1 text-xs"
                    onClick={() =>
                      setTaxRatePercentStr(bpsToPercentEditString(700, locale))
                    }
                  >
                    7%
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 flex-1 px-1 text-xs"
                    onClick={() =>
                      setTaxRatePercentStr(bpsToPercentEditString(1900, locale))
                    }
                  >
                    19%
                  </Button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ln-discount">
                  {locale === "en" ? "Discount %" : "Rabatt %"}
                </Label>
                <Input
                  id="ln-discount"
                  value={discountPercentStr}
                  onChange={(e) => setDiscountPercentStr(e.target.value)}
                  inputMode="decimal"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ln-lt">{lc.lineTotal}</Label>
              <Input
                id="ln-lt"
                value={lineTotalStr}
                onChange={(e) => setLineTotalStr(e.target.value)}
                inputMode="decimal"
                required
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
