"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calculator, Download, Info, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { Locale } from "@/lib/i18n/locale";
import {
  calculateAreaMetrics,
  type AreaRectInput,
} from "@/lib/painter/area-calculation";
import {
  findPainterMaterialProfile,
  PAINTER_MATERIAL_PROFILES,
} from "@/lib/painter/material-catalog";
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

type RectRow = {
  id: string;
  label: string;
  lengthM: string;
  widthM: string;
  qty: string;
};

type MaterialProfileId = (typeof PAINTER_MATERIAL_PROFILES)[number]["id"] | "custom";

type AreaCalculationModelV1 = {
  version: 1;
  surfaces: RectRow[];
  deductions: RectRow[];
  surchargePercent: string;
  coverageM2PerL: string;
  coats: string;
  wastePercent: string;
  productivityM2PerH: string;
  setupHours: string;
  notes: string;
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

function defaultModel(): AreaCalculationModelV1 {
  return {
    version: 1,
    surfaces: [{ id: uuid(), label: "", lengthM: "", widthM: "", qty: "1" }],
    deductions: [],
    surchargePercent: "10",
    coverageM2PerL: "8",
    coats: "2",
    wastePercent: "10",
    productivityM2PerH: "20",
    setupHours: "0.5",
    notes: "",
    updatedAt: null,
  };
}

function stripMeta(model: AreaCalculationModelV1): Omit<AreaCalculationModelV1, "updatedAt"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { updatedAt, ...rest } = model;
  return rest;
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function AreaCalculationContent({ locale }: { locale: Locale }) {
  const { session } = useWebApp();
  const storageKey = useMemo(
    () => `zgwerk:web:painter:area-calculation:${session.email}:v1`,
    [session.email],
  );

  const t = useMemo(() => {
    const isEn = locale === "en";
    return {
      introTitle: isEn ? "Area calculation" : "Flächenberechnung",
      introBody: isEn
        ? "Capture wall/ceiling surfaces, subtract openings, apply a surcharge, and estimate paint consumption and time. Save your setup to restore it after reload."
        : "Erfassen Sie Flächen, ziehen Sie Öffnungen ab, wenden Sie Zuschläge an und schätzen Sie Materialbedarf sowie Arbeitszeit. Speichern Sie Ihre Eingaben, um sie nach einem Reload wieder zu laden.",
      surfacesTitle: isEn ? "Surfaces" : "Flächen",
      surfacesHint: isEn
        ? "Rectangles in meters. Add multiple rows for rooms or sections."
        : "Rechtecke in Metern. Mehrere Zeilen für Räume/Teilflächen möglich.",
      deductionsTitle: isEn ? "Deductions" : "Abzüge",
      deductionsHint: isEn
        ? "Openings like windows and doors."
        : "Öffnungen wie Fenster und Türen.",
      label: isEn ? "Label" : "Bezeichnung",
      length: isEn ? "Length (m)" : "Länge (m)",
      width: isEn ? "Width (m)" : "Breite (m)",
      qty: isEn ? "Qty" : "Anzahl",
      area: isEn ? "Area (m²)" : "Fläche (m²)",
      actions: isEn ? "Actions" : "Aktionen",
      add: isEn ? "Add row" : "Zeile hinzufügen",
      remove: isEn ? "Remove" : "Entfernen",
      surchargeTitle: isEn ? "Surcharge" : "Zuschlag",
      surchargeLabel: isEn ? "Surcharge (%)" : "Zuschlag (%)",
      materialTitle: isEn ? "Material" : "Material",
      materialProfile: isEn ? "Material profile" : "Materialprofil",
      materialProfileHint: isEn
        ? "Apply central default values for coverage, coats, waste, and productivity."
        : "Zentrale Richtwerte fuer Deckkraft, Anstriche, Verschnitt und Leistung uebernehmen.",
      customProfile: isEn ? "Custom values" : "Eigene Werte",
      coverageLabel: isEn ? "Coverage (m² / L)" : "Deckkraft (m² / L)",
      coatsLabel: isEn ? "Coats" : "Anstriche",
      wasteLabel: isEn ? "Waste (%)" : "Verschnitt (%)",
      timeTitle: isEn ? "Time estimate" : "Zeitschätzung",
      productivityLabel: isEn ? "Productivity (m² / h)" : "Leistung (m² / h)",
      setupLabel: isEn ? "Setup time (h)" : "Rüstzeit (h)",
      notes: isEn ? "Notes" : "Notizen",
      summaryTitle: isEn ? "Summary" : "Ergebnis",
      net: isEn ? "Net area" : "Nettofläche",
      gross: isEn ? "Gross area" : "Bruttofläche",
      liters: isEn ? "Paint (L)" : "Farbe (L)",
      buckets: isEn ? "Buckets (12.5 L)" : "Eimer (12,5 L)",
      hours: isEn ? "Work time (h)" : "Arbeitszeit (h)",
      save: isEn ? "Save" : "Speichern",
      discard: isEn ? "Discard changes" : "Änderungen verwerfen",
      clear: isEn ? "Clear saved" : "Gespeichertes löschen",
      savedAt: isEn ? "Saved at" : "Zuletzt gespeichert",
      exportTxt: isEn ? "Export as note" : "Als Notiz exportieren",
      saving: isEn ? "Saving…" : "Speichern…",
      savedToast: isEn ? "Saved." : "Gespeichert.",
      clearedToast: isEn ? "Saved state cleared." : "Gespeicherter Stand gelöscht.",
      nothingToSave: isEn ? "No changes to save." : "Keine Änderungen zum Speichern.",
    };
  }, [locale]);

  const [loaded, setLoaded] = useState(false);
  const [model, setModel] = useState<AreaCalculationModelV1>(() => defaultModel());
  const [saved, setSaved] = useState<AreaCalculationModelV1 | null>(null);
  const [busy, setBusy] = useState(false);
  const [materialProfileId, setMaterialProfileId] = useState<MaterialProfileId>("custom");

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
      const m = json as AreaCalculationModelV1;
      setModel(m);
      setSaved(m);
      setLoaded(true);
    } catch {
      setLoaded(true);
    }
  }, [storageKey]);

  const updateSurface = useCallback((id: string, patch: Partial<RectRow>) => {
    setModel((prev) => ({
      ...prev,
      surfaces: prev.surfaces.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  }, []);

  const updateDeduction = useCallback((id: string, patch: Partial<RectRow>) => {
    setModel((prev) => ({
      ...prev,
      deductions: prev.deductions.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  }, []);

  const addSurface = useCallback(() => {
    setModel((prev) => ({
      ...prev,
      surfaces: [
        ...prev.surfaces,
        { id: uuid(), label: "", lengthM: "", widthM: "", qty: "1" },
      ],
    }));
  }, []);

  const addDeduction = useCallback(() => {
    setModel((prev) => ({
      ...prev,
      deductions: [
        ...prev.deductions,
        { id: uuid(), label: "", lengthM: "", widthM: "", qty: "1" },
      ],
    }));
  }, []);

  const removeSurface = useCallback((id: string) => {
    setModel((prev) => ({
      ...prev,
      surfaces: prev.surfaces.filter((r) => r.id !== id),
    }));
  }, []);

  const removeDeduction = useCallback((id: string) => {
    setModel((prev) => ({
      ...prev,
      deductions: prev.deductions.filter((r) => r.id !== id),
    }));
  }, []);

  const sums = useMemo(
    () =>
      calculateAreaMetrics({
        surfaces: model.surfaces as AreaRectInput[],
        deductions: model.deductions as AreaRectInput[],
        surchargePercent: model.surchargePercent,
        coverageM2PerL: model.coverageM2PerL,
        coats: model.coats,
        wastePercent: model.wastePercent,
        productivityM2PerH: model.productivityM2PerH,
        setupHours: model.setupHours,
      }),
    [model],
  );

  const applyMaterialProfile = useCallback(
    (profileId: MaterialProfileId) => {
      setMaterialProfileId(profileId);
      if (profileId === "custom") {
        return;
      }
      const profile = findPainterMaterialProfile(profileId);
      if (!profile) {
        return;
      }
      setModel((prev) => ({
        ...prev,
        coverageM2PerL: String(profile.coverageM2PerL),
        coats: String(profile.coats),
        wastePercent: String(profile.wastePercent),
        productivityM2PerH: String(profile.productivityM2PerH),
      }));
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!dirty) {
      toast.message(t.nothingToSave);
      return;
    }
    setBusy(true);
    try {
      const next: AreaCalculationModelV1 = {
        ...model,
        version: 1,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(storageKey, JSON.stringify(next));
      setModel(next);
      setSaved(next);
      toast.success(t.savedToast);
    } catch {
      toast.error(locale === "en" ? "Save failed." : "Speichern fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }, [dirty, locale, model, storageKey, t.nothingToSave, t.savedToast]);

  const handleDiscard = useCallback(() => {
    if (!saved) return;
    setModel(saved);
  }, [saved]);

  const handleClearSaved = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setSaved(null);
      toast.success(t.clearedToast);
    } catch {
      toast.error(locale === "en" ? "Clear failed." : "Löschen fehlgeschlagen.");
    }
  }, [locale, storageKey, t.clearedToast]);

  const exportNote = useCallback(() => {
    const lines = [
      `# ${t.introTitle}`,
      "",
      `${locale === "en" ? "Inspector" : "Ersteller"}: ${session.name} <${session.email}>`,
      `${locale === "en" ? "Date" : "Datum"}: ${new Date().toLocaleString(
        locale === "en" ? "en-GB" : "de-DE",
      )}`,
      "",
      `- ${t.net}: ${formatNumber(sums.netArea, locale)} m²`,
      `- ${t.gross}: ${formatNumber(sums.grossArea, locale)} m²`,
      `- ${t.liters}: ${formatNumber(sums.liters, locale)} L`,
      `- ${t.buckets}: ${sums.buckets}`,
      `- ${t.hours}: ${formatNumber(sums.hours, locale)} h`,
      "",
      `## ${t.surfacesTitle}`,
      ...model.surfaces.map((r, idx) => {
        const a = sums.surfaces[idx]?.area ?? 0;
        const label = r.label.trim() || (locale === "en" ? "Surface" : "Fläche");
        return `- ${label}: ${formatNumber(a, locale)} m²`;
      }),
      "",
      `## ${t.deductionsTitle}`,
      ...(model.deductions.length === 0
        ? [locale === "en" ? "- None" : "- Keine"]
        : model.deductions.map((r, idx) => {
            const a = sums.deductions[idx]?.area ?? 0;
            const label =
              r.label.trim() || (locale === "en" ? "Deduction" : "Abzug");
            return `- ${label}: ${formatNumber(a, locale)} m²`;
          })),
      model.notes.trim() ? "" : null,
      model.notes.trim() ? `## ${t.notes}\n\n${model.notes.trim()}` : null,
      "",
    ].filter((x): x is string => typeof x === "string");
    downloadText(
      `area-calculation-${new Date().toISOString().slice(0, 10)}.md`,
      lines.join("\n"),
    );
  }, [
    locale,
    model.deductions,
    model.notes,
    model.surfaces,
    session.email,
    session.name,
    sums.buckets,
    sums.deductions,
    sums.grossArea,
    sums.hours,
    sums.liters,
    sums.netArea,
    sums.surfaces,
    t.buckets,
    t.deductionsTitle,
    t.gross,
    t.introTitle,
    t.liters,
    t.net,
    t.notes,
    t.surfacesTitle,
    t.hours,
  ]);

  if (!loaded) {
    return (
      <div className="w-full min-w-0 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.introTitle}</CardTitle>
            <CardDescription>{t.introBody}</CardDescription>
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
        <AlertTitle>{t.introTitle}</AlertTitle>
        <AlertDescription className="text-sm text-muted-foreground">
          {t.introBody}
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="size-4" aria-hidden />
            {t.surfacesTitle}
          </CardTitle>
          <CardDescription className="text-xs">{t.surfacesHint}</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">{t.label}</TableHead>
                <TableHead className="w-[120px]">{t.length}</TableHead>
                <TableHead className="w-[120px]">{t.width}</TableHead>
                <TableHead className="w-[90px]">{t.qty}</TableHead>
                <TableHead className="w-[130px] text-end">{t.area}</TableHead>
                <TableHead className="w-[80px] text-end">{t.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {model.surfaces.map((r, idx) => {
                const a = sums.surfaces[idx]?.area ?? 0;
                const valid = sums.surfaces[idx]?.valid ?? true;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="align-top">
                      <Input
                        value={r.label}
                        onChange={(e) => updateSurface(r.id, { label: e.target.value })}
                        placeholder={locale === "en" ? "e.g. Living room" : "z. B. Wohnzimmer"}
                        aria-label={t.label}
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <Input
                        value={r.lengthM}
                        onChange={(e) => updateSurface(r.id, { lengthM: e.target.value })}
                        inputMode="decimal"
                        aria-label={t.length}
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <Input
                        value={r.widthM}
                        onChange={(e) => updateSurface(r.id, { widthM: e.target.value })}
                        inputMode="decimal"
                        aria-label={t.width}
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <Input
                        value={r.qty}
                        onChange={(e) => updateSurface(r.id, { qty: e.target.value })}
                        inputMode="numeric"
                        aria-label={t.qty}
                      />
                    </TableCell>
                    <TableCell className="text-end align-top tabular-nums">
                      <div className="flex flex-col items-end gap-1">
                        <span>{formatNumber(a, locale)} m²</span>
                        {!valid ? (
                          <span className="text-xs text-destructive">
                            {locale === "en" ? "Invalid" : "Ungültig"}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-end align-top">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => removeSurface(r.id)}
                        aria-label={t.remove}
                        disabled={model.surfaces.length <= 1}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t pt-6">
          <Button type="button" variant="outline" onClick={addSurface}>
            <Plus className="size-4" aria-hidden />
            {t.add}
          </Button>
          <p className="text-xs text-muted-foreground tabular-nums">
            {locale === "en" ? "Total" : "Summe"}:{" "}
            <span className="font-medium text-foreground">
              {formatNumber(sums.surfacesArea, locale)} m²
            </span>
          </p>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t.deductionsTitle}</CardTitle>
          <CardDescription className="text-xs">{t.deductionsHint}</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {model.deductions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {locale === "en"
                ? "No deductions yet."
                : "Noch keine Abzüge erfasst."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">{t.label}</TableHead>
                  <TableHead className="w-[120px]">{t.length}</TableHead>
                  <TableHead className="w-[120px]">{t.width}</TableHead>
                  <TableHead className="w-[90px]">{t.qty}</TableHead>
                  <TableHead className="w-[130px] text-end">{t.area}</TableHead>
                  <TableHead className="w-[80px] text-end">{t.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {model.deductions.map((r, idx) => {
                  const a = sums.deductions[idx]?.area ?? 0;
                  const valid = sums.deductions[idx]?.valid ?? true;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="align-top">
                        <Input
                          value={r.label}
                          onChange={(e) => updateDeduction(r.id, { label: e.target.value })}
                          placeholder={locale === "en" ? "e.g. Window" : "z. B. Fenster"}
                          aria-label={t.label}
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          value={r.lengthM}
                          onChange={(e) => updateDeduction(r.id, { lengthM: e.target.value })}
                          inputMode="decimal"
                          aria-label={t.length}
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          value={r.widthM}
                          onChange={(e) => updateDeduction(r.id, { widthM: e.target.value })}
                          inputMode="decimal"
                          aria-label={t.width}
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          value={r.qty}
                          onChange={(e) => updateDeduction(r.id, { qty: e.target.value })}
                          inputMode="numeric"
                          aria-label={t.qty}
                        />
                      </TableCell>
                      <TableCell className="text-end align-top tabular-nums">
                        <div className="flex flex-col items-end gap-1">
                          <span>{formatNumber(a, locale)} m²</span>
                          {!valid ? (
                            <span className="text-xs text-destructive">
                              {locale === "en" ? "Invalid" : "Ungültig"}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-end align-top">
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => removeDeduction(r.id)}
                          aria-label={t.remove}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t pt-6">
          <Button type="button" variant="outline" onClick={addDeduction}>
            <Plus className="size-4" aria-hidden />
            {t.add}
          </Button>
          <p className="text-xs text-muted-foreground tabular-nums">
            {locale === "en" ? "Total" : "Summe"}:{" "}
            <span className="font-medium text-foreground">
              {formatNumber(sums.deductionsArea, locale)} m²
            </span>
          </p>
        </CardFooter>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.surchargeTitle}</CardTitle>
            <CardDescription className="text-xs">
              {locale === "en"
                ? "Applied on net area after deductions."
                : "Wird auf die Nettofläche nach Abzügen angewendet."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="ac-surcharge">
                {t.surchargeLabel}
              </label>
              <Input
                id="ac-surcharge"
                value={model.surchargePercent}
                onChange={(e) =>
                  setModel((p) => ({ ...p, surchargePercent: e.target.value }))
                }
                inputMode="decimal"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.materialTitle}</CardTitle>
            <CardDescription className="text-xs">{t.materialProfileHint}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-1.5 sm:col-span-4">
              <label
                className="text-xs font-medium text-muted-foreground"
                htmlFor="ac-material-profile"
              >
                {t.materialProfile}
              </label>
              <select
                id="ac-material-profile"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={materialProfileId}
                onChange={(e) =>
                  applyMaterialProfile(e.target.value as MaterialProfileId)
                }
              >
                <option value="custom">{t.customProfile}</option>
                {PAINTER_MATERIAL_PROFILES.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {locale === "en" ? profile.labelEn : profile.labelDe}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="ac-coverage">
                {t.coverageLabel}
              </label>
              <Input
                id="ac-coverage"
                value={model.coverageM2PerL}
                onChange={(e) =>
                  setModel((p) => ({ ...p, coverageM2PerL: e.target.value }))
                }
                inputMode="decimal"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="ac-coats">
                {t.coatsLabel}
              </label>
              <Input
                id="ac-coats"
                value={model.coats}
                onChange={(e) => setModel((p) => ({ ...p, coats: e.target.value }))}
                inputMode="numeric"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="ac-waste">
                {t.wasteLabel}
              </label>
              <Input
                id="ac-waste"
                value={model.wastePercent}
                onChange={(e) =>
                  setModel((p) => ({ ...p, wastePercent: e.target.value }))
                }
                inputMode="decimal"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.timeTitle}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="ac-prod">
                {t.productivityLabel}
              </label>
              <Input
                id="ac-prod"
                value={model.productivityM2PerH}
                onChange={(e) =>
                  setModel((p) => ({ ...p, productivityM2PerH: e.target.value }))
                }
                inputMode="decimal"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="ac-setup">
                {t.setupLabel}
              </label>
              <Input
                id="ac-setup"
                value={model.setupHours}
                onChange={(e) =>
                  setModel((p) => ({ ...p, setupHours: e.target.value }))
                }
                inputMode="decimal"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.notes}</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={model.notes}
              onChange={(e) => setModel((p) => ({ ...p, notes: e.target.value }))}
              rows={4}
              className="min-h-[6rem] resize-y"
            />
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80 bg-muted/15 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">{t.summaryTitle}</CardTitle>
          <CardDescription className="text-xs">
            {lastSavedLabel ? `${t.savedAt}: ${lastSavedLabel}` : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md border bg-card p-3">
            <p className="text-xs font-medium text-muted-foreground">{t.net}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {formatNumber(sums.netArea, locale)} m²
            </p>
          </div>
          <div className="rounded-md border bg-card p-3">
            <p className="text-xs font-medium text-muted-foreground">{t.gross}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {formatNumber(sums.grossArea, locale)} m²
            </p>
          </div>
          <div className="rounded-md border bg-card p-3">
            <p className="text-xs font-medium text-muted-foreground">{t.liters}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {formatNumber(sums.liters, locale)} L
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t.buckets}:{" "}
              <span className="font-medium text-foreground">{sums.buckets}</span>
            </p>
          </div>
          <div className="rounded-md border bg-card p-3">
            <p className="text-xs font-medium text-muted-foreground">{t.hours}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {formatNumber(sums.hours, locale)} h
            </p>
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
          <Button type="button" variant="secondary" onClick={exportNote} disabled={busy}>
            <Download className="size-4" aria-hidden />
            {t.exportTxt}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

