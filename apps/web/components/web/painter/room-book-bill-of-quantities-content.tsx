"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Info, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { Locale } from "@/lib/i18n/locale";
import {
  computeRoomBookTotals,
  parseNumberLike,
  type RoomBookRoomInput,
} from "@/lib/painter/room-book-boq";
import { useWebApp } from "@/components/web/shell/web-app-context";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/alert";
import { Button } from "@repo/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";
import { Input } from "@repo/ui/input";
import { Textarea } from "@repo/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/table";

type BoqLine = {
  id: string;
  description: string;
  quantity: string;
  unit: string;
  unitPriceEur: string;
};

type BoqRoom = {
  id: string;
  title: string;
  note: string;
  lines: BoqLine[];
};

type RoomBookModelV1 = {
  version: 1;
  currency: "EUR";
  rooms: BoqRoom[];
  updatedAt: string | null;
};

function uuid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatNumber(n: number, locale: Locale, digits = 2): string {
  return n.toLocaleString(locale === "en" ? "en-GB" : "de-DE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

function defaultModel(): RoomBookModelV1 {
  return {
    version: 1,
    currency: "EUR",
    rooms: [
      {
        id: uuid(),
        title: "",
        note: "",
        lines: [
          {
            id: uuid(),
            description: "",
            quantity: "",
            unit: "m²",
            unitPriceEur: "",
          },
        ],
      },
    ],
    updatedAt: null,
  };
}

function stripMeta(model: RoomBookModelV1): Omit<RoomBookModelV1, "updatedAt"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { updatedAt, ...rest } = model;
  return rest;
}

function csvEscapeCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function downloadText(filename: string, content: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function RoomBookBillOfQuantitiesContent({ locale }: { locale: Locale }) {
  const { session } = useWebApp();
  const storageKey = useMemo(
    () => `zgwerk:web:painter:room-book-boq:${session.email}:v1`,
    [session.email],
  );

  const t = useMemo(() => {
    const isEn = locale === "en";
    return {
      title: isEn ? "Room book / bill of quantities" : "Raumbuch / Leistungsverzeichnis",
      intro: isEn
        ? "Capture rooms and line items. Use this as a lightweight quantity structure you can export as JSON/CSV."
        : "Erfassen Sie Räume und Positionen. Nutzen Sie dies als leichte Mengenstruktur und exportieren Sie sie als JSON/CSV.",
      room: isEn ? "Room" : "Raum",
      rooms: isEn ? "Rooms" : "Räume",
      addRoom: isEn ? "Add room" : "Raum hinzufügen",
      removeRoom: isEn ? "Remove room" : "Raum entfernen",
      roomTitlePh: isEn ? "e.g. Bathroom" : "z. B. Bad",
      roomNote: isEn ? "Room notes" : "Notizen zum Raum",
      positions: isEn ? "Line items" : "Positionen",
      addLine: isEn ? "Add line" : "Position hinzufügen",
      removeLine: isEn ? "Remove line" : "Position entfernen",
      desc: isEn ? "Description" : "Beschreibung",
      qty: isEn ? "Qty" : "Menge",
      unit: isEn ? "Unit" : "Einheit",
      unitPrice: isEn ? "Unit price (€)" : "EP (€)",
      lineTotal: isEn ? "Line total (€)" : "Gesamt (€)",
      actions: isEn ? "Actions" : "Aktionen",
      totals: isEn ? "Totals" : "Summen",
      roomTotal: isEn ? "Room total" : "Raumsumme",
      overallTotal: isEn ? "Overall total" : "Gesamtsumme",
      quantitiesByUnit: isEn ? "Quantities by unit" : "Mengen je Einheit",
      save: isEn ? "Save" : "Speichern",
      discard: isEn ? "Discard changes" : "Änderungen verwerfen",
      clear: isEn ? "Clear saved" : "Gespeichertes löschen",
      saving: isEn ? "Saving…" : "Speichern…",
      saved: isEn ? "Saved." : "Gespeichert.",
      cleared: isEn ? "Saved state cleared." : "Gespeicherter Stand gelöscht.",
      savedAt: isEn ? "Saved at" : "Zuletzt gespeichert",
      exportJson: isEn ? "Export JSON" : "JSON exportieren",
      exportCsv: isEn ? "Export CSV" : "CSV exportieren",
      nothingToSave: isEn ? "No changes to save." : "Keine Änderungen zum Speichern.",
    };
  }, [locale]);

  const [loaded, setLoaded] = useState(false);
  const [model, setModel] = useState<RoomBookModelV1>(() => defaultModel());
  const [saved, setSaved] = useState<RoomBookModelV1 | null>(null);
  const [busy, setBusy] = useState(false);

  const modelComparable = useMemo(
    () => JSON.stringify(stripMeta(model)),
    [model],
  );
  const savedComparable = useMemo(
    () => (saved ? JSON.stringify(stripMeta(saved)) : null),
    [saved],
  );
  const dirty = savedComparable !== null ? modelComparable !== savedComparable : true;

  const lastSavedLabel = useMemo(() => {
    if (!saved?.updatedAt) return null;
    return new Date(saved.updatedAt).toLocaleString(locale === "en" ? "en-GB" : "de-DE");
  }, [locale, saved?.updatedAt]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setLoaded(true);
        return;
      }
      const json: unknown = JSON.parse(raw);
      if (
        typeof json !== "object" ||
        json === null ||
        (json as { version?: unknown }).version !== 1
      ) {
        setLoaded(true);
        return;
      }
      const m = json as RoomBookModelV1;
      setModel(m);
      setSaved(m);
      setLoaded(true);
    } catch {
      setLoaded(true);
    }
  }, [storageKey]);

  const addRoom = useCallback(() => {
    setModel((prev) => ({
      ...prev,
      rooms: [
        ...prev.rooms,
        {
          id: uuid(),
          title: "",
          note: "",
          lines: [
            { id: uuid(), description: "", quantity: "", unit: "m²", unitPriceEur: "" },
          ],
        },
      ],
    }));
  }, []);

  const removeRoom = useCallback((roomId: string) => {
    setModel((prev) => ({
      ...prev,
      rooms: prev.rooms.filter((r) => r.id !== roomId),
    }));
  }, []);

  const updateRoom = useCallback((roomId: string, patch: Partial<BoqRoom>) => {
    setModel((prev) => ({
      ...prev,
      rooms: prev.rooms.map((r) => (r.id === roomId ? { ...r, ...patch } : r)),
    }));
  }, []);

  const addLine = useCallback((roomId: string) => {
    setModel((prev) => ({
      ...prev,
      rooms: prev.rooms.map((r) =>
        r.id === roomId
          ? {
              ...r,
              lines: [
                ...r.lines,
                { id: uuid(), description: "", quantity: "", unit: "m²", unitPriceEur: "" },
              ],
            }
          : r,
      ),
    }));
  }, []);

  const removeLine = useCallback((roomId: string, lineId: string) => {
    setModel((prev) => ({
      ...prev,
      rooms: prev.rooms.map((r) =>
        r.id === roomId ? { ...r, lines: r.lines.filter((l) => l.id !== lineId) } : r,
      ),
    }));
  }, []);

  const updateLine = useCallback(
    (roomId: string, lineId: string, patch: Partial<BoqLine>) => {
      setModel((prev) => ({
        ...prev,
        rooms: prev.rooms.map((r) =>
          r.id === roomId
            ? {
                ...r,
                lines: r.lines.map((l) => (l.id === lineId ? { ...l, ...patch } : l)),
              }
            : r,
        ),
      }));
    },
    [],
  );

  const computed = useMemo(
    () => computeRoomBookTotals(model.rooms as RoomBookRoomInput[]),
    [model.rooms],
  );

  const handleSave = useCallback(async () => {
    if (!dirty) {
      toast.message(t.nothingToSave);
      return;
    }
    setBusy(true);
    try {
      const next: RoomBookModelV1 = {
        ...model,
        version: 1,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(storageKey, JSON.stringify(next));
      setModel(next);
      setSaved(next);
      toast.success(t.saved);
    } catch {
      toast.error(locale === "en" ? "Save failed." : "Speichern fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }, [dirty, locale, model, storageKey, t.nothingToSave, t.saved]);

  const handleDiscard = useCallback(() => {
    if (!saved) return;
    setModel(saved);
  }, [saved]);

  const handleClearSaved = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setSaved(null);
      toast.success(t.cleared);
    } catch {
      toast.error(locale === "en" ? "Clear failed." : "Löschen fehlgeschlagen.");
    }
  }, [locale, storageKey, t.cleared]);

  const exportJson = useCallback(() => {
    const out = {
      ...model,
      exportedAt: new Date().toISOString(),
      exportedBy: { name: session.name, email: session.email },
    };
    downloadText(
      `room-book-boq-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(out, null, 2),
      "application/json;charset=utf-8",
    );
  }, [model, session.email, session.name]);

  const exportCsv = useCallback(() => {
    const header = ["room", "description", "quantity", "unit", "unitPriceEur", "lineTotalEur"].join(",");
    const lines: string[] = [];
    for (const room of model.rooms) {
      const roomName = room.title.trim() || (locale === "en" ? "Room" : "Raum");
      for (const l of room.lines) {
        const q = parseNumberLike(l.quantity) ?? 0;
        const p = parseNumberLike(l.unitPriceEur) ?? 0;
        const total = q * p;
        lines.push(
          [
            csvEscapeCell(roomName),
            csvEscapeCell(l.description.trim()),
            csvEscapeCell(String(l.quantity ?? "")),
            csvEscapeCell(l.unit.trim()),
            csvEscapeCell(String(l.unitPriceEur ?? "")),
            csvEscapeCell(String(total)),
          ].join(","),
        );
      }
    }
    const csv = "\ufeff" + [header, ...lines].join("\r\n");
    downloadText(
      `room-book-boq-${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
      "text/csv;charset=utf-8",
    );
  }, [locale, model.rooms]);

  if (!loaded) {
    return (
      <div className="w-full min-w-0 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.title}</CardTitle>
            <CardDescription>{t.intro}</CardDescription>
          </CardHeader>
          <CardContent
            className="flex items-center gap-2 text-sm text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
            {locale === "en" ? "Loading…" : "Laden…"}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-6">
      <Alert className="border-primary/20 bg-primary/5">
        <Info className="text-primary" aria-hidden />
        <AlertTitle>{t.title}</AlertTitle>
        <AlertDescription className="text-sm text-muted-foreground">
          {t.intro}
        </AlertDescription>
      </Alert>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{t.rooms}</h2>
        <Button type="button" variant="outline" onClick={addRoom}>
          <Plus className="size-4" aria-hidden />
          {t.addRoom}
        </Button>
      </div>

      <div className="space-y-6">
        {model.rooms.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {locale === "en" ? "No rooms yet." : "Noch keine Räume."}
          </p>
        ) : (
          model.rooms.map((room) => {
            const roomComputed = computed.byRoom.find((x) => x.roomId === room.id);
            const roomTotal = roomComputed?.roomTotal ?? 0;
            return (
              <Card key={room.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-[14rem] flex-1 space-y-2">
                      <CardTitle className="text-base">{t.room}</CardTitle>
                      <Input
                        value={room.title}
                        onChange={(e) => updateRoom(room.id, { title: e.target.value })}
                        placeholder={t.roomTitlePh}
                        aria-label={t.room}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-xs font-medium text-muted-foreground">
                          {t.roomTotal}
                        </p>
                        <p className="text-lg font-semibold tabular-nums">
                          {formatNumber(roomTotal, locale)} €
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t.removeRoom}
                        onClick={() => removeRoom(room.id)}
                        disabled={model.rooms.length <= 1}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-1.5">
                    <label
                      className="text-xs font-medium text-muted-foreground"
                      htmlFor={`rb-note-${room.id}`}
                    >
                      {t.roomNote}
                    </label>
                    <Textarea
                      id={`rb-note-${room.id}`}
                      value={room.note}
                      onChange={(e) => updateRoom(room.id, { note: e.target.value })}
                      rows={3}
                      className="min-h-[5rem] resize-y"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold">{t.positions}</h3>
                    <Button type="button" variant="outline" size="sm" onClick={() => addLine(room.id)}>
                      <Plus className="size-4" aria-hidden />
                      {t.addLine}
                    </Button>
                  </div>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[240px]">{t.desc}</TableHead>
                          <TableHead className="w-[110px]">{t.qty}</TableHead>
                          <TableHead className="w-[110px]">{t.unit}</TableHead>
                          <TableHead className="w-[140px]">{t.unitPrice}</TableHead>
                          <TableHead className="w-[150px] text-end">{t.lineTotal}</TableHead>
                          <TableHead className="w-[80px] text-end">{t.actions}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {room.lines.map((line) => {
                          const q = parseNumberLike(line.quantity) ?? 0;
                          const p = parseNumberLike(line.unitPriceEur) ?? 0;
                          const total = q * p;
                          return (
                            <TableRow key={line.id}>
                              <TableCell className="align-top">
                                <Input
                                  value={line.description}
                                  onChange={(e) =>
                                    updateLine(room.id, line.id, { description: e.target.value })
                                  }
                                  placeholder={
                                    locale === "en"
                                      ? "e.g. Paint walls"
                                      : "z. B. Wände streichen"
                                  }
                                  aria-label={t.desc}
                                />
                              </TableCell>
                              <TableCell className="align-top">
                                <Input
                                  value={line.quantity}
                                  onChange={(e) =>
                                    updateLine(room.id, line.id, { quantity: e.target.value })
                                  }
                                  inputMode="decimal"
                                  aria-label={t.qty}
                                />
                              </TableCell>
                              <TableCell className="align-top">
                                <Input
                                  value={line.unit}
                                  onChange={(e) =>
                                    updateLine(room.id, line.id, { unit: e.target.value })
                                  }
                                  aria-label={t.unit}
                                />
                              </TableCell>
                              <TableCell className="align-top">
                                <Input
                                  value={line.unitPriceEur}
                                  onChange={(e) =>
                                    updateLine(room.id, line.id, { unitPriceEur: e.target.value })
                                  }
                                  inputMode="decimal"
                                  aria-label={t.unitPrice}
                                />
                              </TableCell>
                              <TableCell className="text-end align-top tabular-nums">
                                {formatNumber(total, locale)} €
                              </TableCell>
                              <TableCell className="text-end align-top">
                                <Button
                                  type="button"
                                  size="icon-sm"
                                  variant="ghost"
                                  aria-label={t.removeLine}
                                  onClick={() => removeLine(room.id, line.id)}
                                  disabled={room.lines.length <= 1}
                                >
                                  <Trash2 className="size-4" aria-hidden />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {roomComputed && roomComputed.quantitiesByUnit.size > 0 ? (
                    <div className="rounded-md border bg-muted/20 p-3">
                      <p className="mb-2 text-xs font-medium text-muted-foreground">
                        {t.quantitiesByUnit}
                      </p>
                      <ul className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                        {[...roomComputed.quantitiesByUnit.entries()]
                          .sort((a, b) => a[0].localeCompare(b[0]))
                          .map(([unit, qty]) => (
                            <li key={`${room.id}-${unit}`} className="rounded-full bg-background px-2 py-0.5">
                              <span className="tabular-nums">{formatNumber(qty, locale, 3)}</span>{" "}
                              {unit}
                            </li>
                          ))}
                      </ul>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Card className="border-border/80 bg-muted/15 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">{t.totals}</CardTitle>
          <CardDescription className="text-xs">
            {lastSavedLabel ? `${t.savedAt}: ${lastSavedLabel}` : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-md border bg-card p-3">
            <p className="text-xs font-medium text-muted-foreground">{t.overallTotal}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {formatNumber(computed.overallTotal, locale)} €
            </p>
          </div>
          <div className="rounded-md border bg-card p-3">
            <p className="text-xs font-medium text-muted-foreground">{t.quantitiesByUnit}</p>
            {computed.overallQuantitiesByUnit.size === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {locale === "en" ? "No quantities yet." : "Noch keine Mengen."}
              </p>
            ) : (
              <ul className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
                {[...computed.overallQuantitiesByUnit.entries()]
                  .sort((a, b) => a[0].localeCompare(b[0]))
                  .map(([unit, qty]) => (
                    <li key={`overall-${unit}`} className="rounded-full bg-background px-2 py-0.5">
                      <span className="tabular-nums">{formatNumber(qty, locale, 3)}</span> {unit}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-3 border-t pt-6">
          <Button type="button" onClick={() => void handleSave()} disabled={!dirty || busy}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {busy ? t.saving : t.save}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleDiscard}
            disabled={!saved || !dirty || busy}
          >
            {t.discard}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleClearSaved}
            disabled={!saved || busy}
          >
            {t.clear}
          </Button>
          <Button type="button" variant="secondary" onClick={exportJson} disabled={busy}>
            <Download className="size-4" aria-hidden />
            {t.exportJson}
          </Button>
          <Button type="button" variant="secondary" onClick={exportCsv} disabled={busy}>
            <Download className="size-4" aria-hidden />
            {t.exportCsv}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

