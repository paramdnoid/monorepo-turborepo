"use client";

import { useEffect, useMemo, useState } from "react";
import {
  salesInvoiceDetailResponseSchema,
  salesQuoteDetailResponseSchema,
  type SalesDocumentLine,
  type SalesPatchQuoteLineInput,
} from "@repo/api-contracts";
import type { z } from "zod";
import { ChevronDown, ChevronUp } from "lucide-react";
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

function minorToEditString(cents: number, locale: Locale): string {
  return (cents / 100).toLocaleString(locale === "en" ? "en-US" : "de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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
  onDocumentUpdated: (
    next: QuoteDetailPayload | InvoiceDetailPayload,
  ) => void;
};

export function SalesLinesSection({
  locale,
  mode,
  documentId,
  lines,
  onDocumentUpdated,
}: SalesLinesSectionProps) {
  const lc = getSalesLinesCopy(locale);
  const fc = getSalesFormCopy(locale);
  const sortedLines = useMemo(() => sortDocumentLines(lines), [lines]);
  const [addOpen, setAddOpen] = useState(false);
  const [busyLineId, setBusyLineId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const interactionLocked = busyLineId !== null || reordering;

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
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {sortedLines.length === 0 ? (
        <p className="text-sm text-muted-foreground">{lc.emptyLines}</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
              <tr>
                <th className="px-1 py-2 w-14 font-medium align-bottom">
                  <span className="sr-only">{lc.moveUp}</span>
                </th>
                <th className="px-3 py-2 font-medium">{lc.description}</th>
                <th className="px-3 py-2 font-medium">{lc.quantity}</th>
                <th className="px-3 py-2 font-medium">{lc.unit}</th>
                <th className="px-3 py-2 font-medium">{lc.unitPrice}</th>
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
  const [lineTotalStr, setLineTotalStr] = useState(() =>
    minorToEditString(line.lineTotalCents, locale),
  );

  useEffect(() => {
    setDescription(line.description);
    setQuantity(line.quantity ?? "");
    setUnit(line.unit ?? "");
    setUnitPriceStr(minorToEditString(line.unitPriceCents, locale));
    setLineTotalStr(minorToEditString(line.lineTotalCents, locale));
  }, [
    line.id,
    line.description,
    line.quantity,
    line.unit,
    line.unitPriceCents,
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
    lineTotalStr !== minorToEditString(line.lineTotalCents, locale);

  async function handleSaveClick() {
    if (!draftDesc) {
      return;
    }
    const unitPriceCents = parseMajorToMinorUnits(unitPriceStr, locale);
    const lineTotalCents = parseMajorToMinorUnits(lineTotalStr, locale);
    if (unitPriceCents === null || lineTotalCents === null) {
      return;
    }
    await onSave({
      description: draftDesc,
      quantity: qtyNorm,
      unit: unitNorm,
      unitPriceCents,
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
      <td className="px-2 py-1.5 align-top min-w-[8rem]">
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={interactionLocked}
          aria-label={lc.description}
          className="min-h-9"
        />
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
      <td className="px-2 py-1.5 align-top min-w-[6rem]">
        <Input
          value={unitPriceStr}
          onChange={(e) => setUnitPriceStr(e.target.value)}
          disabled={interactionLocked}
          inputMode="decimal"
          aria-label={lc.unitPrice}
          className="min-h-9"
        />
      </td>
      <td className="px-2 py-1.5 align-top min-w-[6.5rem]">
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
              const m = parseQuantityAsMultiplier(quantity, locale);
              if (up === null || m === null) return;
              setLineTotalStr(
                minorToEditString(Math.round(m * up), locale),
              );
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
    lineTotalCents: number;
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
  const [lineTotalStr, setLineTotalStr] = useState("");
  const [busy, setBusy] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDescription("");
      setQuantity("");
      setUnit("");
      setUnitPriceStr("");
      setLineTotalStr("");
      setLocalErr(null);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalErr(null);
    if (!description.trim()) {
      setLocalErr(lc.lineSaveFailed);
      return;
    }
    const unitPriceCents = parseMajorToMinorUnits(unitPriceStr, locale);
    const lineTotalCents = parseMajorToMinorUnits(lineTotalStr, locale);
    if (unitPriceCents === null || lineTotalCents === null) {
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
        lineTotalCents,
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
              <Alert variant="destructive">
                <AlertDescription>{localErr}</AlertDescription>
              </Alert>
            ) : null}
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
