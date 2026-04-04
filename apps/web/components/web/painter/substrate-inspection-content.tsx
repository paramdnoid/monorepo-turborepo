"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Download,
  Info,
  Loader2,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";

import type { Locale } from "@/lib/i18n/locale";
import {
  computeSubstrateRisk,
  type Absorbency,
  type Contamination,
  type LoadBearing,
  type Moisture,
  type SubstrateInspectionState,
  type UnderlayType,
} from "@/lib/painter/substrate-inspection";
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

type SubstrateInspectionModelV1 = {
  version: 1;
  underlayType: UnderlayType;
  underlayOther: string;
  moisture: Moisture;
  loadBearing: LoadBearing;
  absorbency: Absorbency;
  contamination: Contamination;
  cracks: boolean;
  flaking: boolean;
  mold: boolean;
  salts: boolean;
  testNotes: string;
  updatedAt: string | null;
};

function defaultModel(): SubstrateInspectionModelV1 {
  return {
    version: 1,
    underlayType: "plaster",
    underlayOther: "",
    moisture: "dry",
    loadBearing: "good",
    absorbency: "normal",
    contamination: "low",
    cracks: false,
    flaking: false,
    mold: false,
    salts: false,
    testNotes: "",
    updatedAt: null,
  };
}

function stripMeta(
  model: SubstrateInspectionModelV1,
): Omit<SubstrateInspectionModelV1, "updatedAt"> {
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

export function SubstrateInspectionContent({ locale }: { locale: Locale }) {
  const { session } = useWebApp();
  const storageKey = useMemo(
    () => `zgwerk:web:painter:substrate-inspection:${session.email}:v1`,
    [session.email],
  );

  const t = useMemo(() => {
    const isEn = locale === "en";
    return {
      title: isEn ? "Substrate inspection" : "Untergrundprüfung",
      intro: isEn
        ? "Capture a quick site-ready substrate inspection. The traffic light is a heuristic and does not replace technical assessment."
        : "Erfassen Sie eine schnelle, baustellentaugliche Untergrundprüfung. Die Ampel ist eine Heuristik und ersetzt keine technische Beurteilung.",
      checklist: isEn ? "Checklist" : "Checkliste",
      levelTitle: isEn ? "Assessment" : "Bewertung",
      export: isEn ? "Export note" : "Prüfnotiz exportieren",
      copy: isEn ? "Copy to clipboard" : "In Zwischenablage kopieren",
      save: isEn ? "Save" : "Speichern",
      discard: isEn ? "Discard changes" : "Änderungen verwerfen",
      clear: isEn ? "Clear saved" : "Gespeichertes löschen",
      saving: isEn ? "Saving…" : "Speichern…",
      saved: isEn ? "Saved." : "Gespeichert.",
      cleared: isEn ? "Saved state cleared." : "Gespeicherter Stand gelöscht.",
      savedAt: isEn ? "Saved at" : "Zuletzt gespeichert",
      note: isEn ? "Notes / tests" : "Notizen / Tests",
      underlay: isEn ? "Underlay" : "Untergrund",
      moisture: isEn ? "Moisture" : "Feuchte",
      loadBearing: isEn ? "Load-bearing" : "Tragfähigkeit",
      absorbency: isEn ? "Absorbency" : "Saugfähigkeit",
      contamination: isEn ? "Contamination" : "Verschmutzung",
      flags: isEn ? "Findings" : "Befunde",
      cracks: isEn ? "Cracks" : "Risse",
      flaking: isEn ? "Flaking" : "Abplatzungen",
      mold: isEn ? "Mold" : "Schimmel",
      salts: isEn ? "Salt efflorescence" : "Ausblühungen",
      recommendations: isEn ? "Recommendations" : "Empfehlungen",
      reasons: isEn ? "Reasons" : "Gründe",
      green: isEn ? "Green" : "Grün",
      yellow: isEn ? "Yellow" : "Gelb",
      red: isEn ? "Red" : "Rot",
      greenHint: isEn
        ? "OK for standard preparation and coating."
        : "Unauffällig – Standardvorbereitung & Beschichtung möglich.",
      yellowHint: isEn
        ? "Proceed with additional checks and preparation."
        : "Auffällig – zusätzliche Prüfungen/Vorbereitung nötig.",
      redHint: isEn
        ? "Stop: clarify and remediate before coating."
        : "Stopp: vor Beschichtung klären und sanieren.",
      other: isEn ? "Other" : "Sonstiges",
      otherPh: isEn ? "Describe underlay" : "Untergrund beschreiben",
      nothingToSave: isEn ? "No changes to save." : "Keine Änderungen zum Speichern.",
      exportFilename: isEn ? "substrate-inspection" : "untergrundpruefung",
    };
  }, [locale]);

  const [loaded, setLoaded] = useState(false);
  const [model, setModel] = useState<SubstrateInspectionModelV1>(() => defaultModel());
  const [saved, setSaved] = useState<SubstrateInspectionModelV1 | null>(null);
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
      const m = json as SubstrateInspectionModelV1;
      setModel(m);
      setSaved(m);
      setLoaded(true);
    } catch {
      setLoaded(true);
    }
  }, [storageKey]);

  const risk = useMemo(
    () => computeSubstrateRisk(model as SubstrateInspectionState),
    [model],
  );

  const riskBadge = useMemo(() => {
    if (risk.level === "green") {
      return {
        icon: <CheckCircle2 className="size-4" aria-hidden />,
        label: t.green,
        hint: t.greenHint,
        className: "border-emerald-500/25 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400",
      };
    }
    if (risk.level === "yellow") {
      return {
        icon: <TriangleAlert className="size-4" aria-hidden />,
        label: t.yellow,
        hint: t.yellowHint,
        className: "border-amber-500/25 bg-amber-500/5 text-amber-700 dark:text-amber-400",
      };
    }
    return {
      icon: <ShieldAlert className="size-4" aria-hidden />,
      label: t.red,
      hint: t.redHint,
      className: "border-destructive/25 bg-destructive/5 text-destructive",
    };
  }, [risk.level, t.green, t.greenHint, t.red, t.redHint, t.yellow, t.yellowHint]);

  const handleSave = useCallback(async () => {
    if (!dirty) {
      toast.message(t.nothingToSave);
      return;
    }
    setBusy(true);
    try {
      const next: SubstrateInspectionModelV1 = {
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

  const exportNote = useCallback(() => {
    const underlayLabel = (() => {
      const m = model.underlayType;
      const map: Record<UnderlayType, string> = {
        plaster: locale === "en" ? "Plaster" : "Putz",
        concrete: locale === "en" ? "Concrete" : "Beton",
        drywall: locale === "en" ? "Drywall" : "Gipskarton",
        wood: locale === "en" ? "Wood" : "Holz",
        metal: locale === "en" ? "Metal" : "Metall",
        "old-paint": locale === "en" ? "Old paint" : "Altanstrich",
        other: locale === "en" ? "Other" : "Sonstiges",
      };
      const base = map[m];
      if (m === "other" && model.underlayOther.trim()) {
        return `${base}: ${model.underlayOther.trim()}`;
      }
      return base;
    })();

    const moistureLabel =
      model.moisture === "dry"
        ? locale === "en"
          ? "Dry"
          : "Trocken"
        : model.moisture === "slightly-damp"
          ? locale === "en"
            ? "Slightly damp"
            : "Leicht feucht"
          : locale === "en"
            ? "Damp"
            : "Feucht";

    const lbLabel =
      model.loadBearing === "good"
        ? locale === "en"
          ? "Good"
          : "Gut"
        : model.loadBearing === "medium"
          ? locale === "en"
            ? "Medium"
            : "Mittel"
          : locale === "en"
            ? "Poor"
            : "Schlecht";

    const absLabel =
      model.absorbency === "normal"
        ? locale === "en"
          ? "Normal"
          : "Normal"
        : model.absorbency === "high"
          ? locale === "en"
            ? "High"
            : "Hoch"
          : locale === "en"
            ? "Low"
            : "Gering";

    const contLabel =
      model.contamination === "low"
        ? locale === "en"
          ? "Low"
          : "Gering"
        : model.contamination === "medium"
          ? locale === "en"
            ? "Medium"
            : "Mittel"
          : locale === "en"
            ? "High"
            : "Hoch";

    const findings: string[] = [];
    if (model.cracks) findings.push(t.cracks);
    if (model.flaking) findings.push(t.flaking);
    if (model.mold) findings.push(t.mold);
    if (model.salts) findings.push(t.salts);
    const findingsLine =
      findings.length > 0 ? findings.join(", ") : locale === "en" ? "None" : "Keine";

    const lines = [
      `# ${t.title}`,
      "",
      `${locale === "en" ? "Inspector" : "Ersteller"}: ${session.name} <${session.email}>`,
      `${locale === "en" ? "Date" : "Datum"}: ${new Date().toLocaleString(
        locale === "en" ? "en-GB" : "de-DE",
      )}`,
      "",
      `## ${t.levelTitle}`,
      `- ${locale === "en" ? "Traffic light" : "Ampel"}: ${risk.level.toUpperCase()} (${riskBadge.label})`,
      `- ${locale === "en" ? "Hint" : "Hinweis"}: ${riskBadge.hint}`,
      "",
      `## ${t.checklist}`,
      `- ${t.underlay}: ${underlayLabel}`,
      `- ${t.moisture}: ${moistureLabel}`,
      `- ${t.loadBearing}: ${lbLabel}`,
      `- ${t.absorbency}: ${absLabel}`,
      `- ${t.contamination}: ${contLabel}`,
      `- ${t.flags}: ${findingsLine}`,
      "",
      `## ${t.reasons}`,
      ...(risk.reasons.length > 0
        ? risk.reasons.map((r) => `- ${r}`)
        : [locale === "en" ? "- None" : "- Keine"]),
      "",
      `## ${t.recommendations}`,
      ...(risk.recommendations.length > 0
        ? risk.recommendations.map((r) => `- ${r}`)
        : [locale === "en" ? "- None" : "- Keine"]),
      model.testNotes.trim() ? "" : null,
      model.testNotes.trim() ? `## ${t.note}\n\n${model.testNotes.trim()}` : null,
      "",
    ].filter((x): x is string => typeof x === "string");

    const md = lines.join("\n");
    downloadText(
      `${t.exportFilename}-${new Date().toISOString().slice(0, 10)}.md`,
      md,
    );
  }, [
    locale,
    model.absorbency,
    model.contamination,
    model.cracks,
    model.flaking,
    model.loadBearing,
    model.mold,
    model.moisture,
    model.salts,
    model.testNotes,
    model.underlayOther,
    model.underlayType,
    risk.level,
    risk.reasons,
    risk.recommendations,
    riskBadge.hint,
    riskBadge.label,
    session.email,
    session.name,
    t.absorbency,
    t.checklist,
    t.contamination,
    t.cracks,
    t.exportFilename,
    t.flags,
    t.flaking,
    t.levelTitle,
    t.loadBearing,
    t.mold,
    t.moisture,
    t.note,
    t.reasons,
    t.recommendations,
    t.salts,
    t.title,
    t.underlay,
  ]);

  const copyToClipboard = useCallback(async () => {
    const mdLines = [
      `${t.title}`,
      "",
      `${locale === "en" ? "Traffic light" : "Ampel"}: ${risk.level.toUpperCase()} (${riskBadge.label})`,
      riskBadge.hint,
      "",
      `${t.recommendations}:`,
      ...(risk.recommendations.length > 0
        ? risk.recommendations.map((r) => `- ${r}`)
        : [locale === "en" ? "- None" : "- Keine"]),
      model.testNotes.trim() ? "" : null,
      model.testNotes.trim() ? model.testNotes.trim() : null,
    ].filter((x): x is string => typeof x === "string");
    try {
      await navigator.clipboard.writeText(mdLines.join("\n"));
      toast.success(locale === "en" ? "Copied." : "Kopiert.");
    } catch {
      toast.error(locale === "en" ? "Copy failed." : "Kopieren fehlgeschlagen.");
    }
  }, [
    locale,
    model.testNotes,
    risk.level,
    risk.recommendations,
    riskBadge.hint,
    riskBadge.label,
    t.recommendations,
    t.title,
  ]);

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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.checklist}</CardTitle>
            <CardDescription className="text-xs">
              {lastSavedLabel ? `${t.savedAt}: ${lastSavedLabel}` : null}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="si-underlay"
                >
                  {t.underlay}
                </label>
                <select
                  id="si-underlay"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={model.underlayType}
                  onChange={(e) =>
                    setModel((p) => ({
                      ...p,
                      underlayType: e.target.value as UnderlayType,
                    }))
                  }
                >
                  <option value="plaster">{locale === "en" ? "Plaster" : "Putz"}</option>
                  <option value="concrete">{locale === "en" ? "Concrete" : "Beton"}</option>
                  <option value="drywall">{locale === "en" ? "Drywall" : "Gipskarton"}</option>
                  <option value="wood">{locale === "en" ? "Wood" : "Holz"}</option>
                  <option value="metal">{locale === "en" ? "Metal" : "Metall"}</option>
                  <option value="old-paint">{locale === "en" ? "Old paint" : "Altanstrich"}</option>
                  <option value="other">{t.other}</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="si-moisture"
                >
                  {t.moisture}
                </label>
                <select
                  id="si-moisture"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={model.moisture}
                  onChange={(e) =>
                    setModel((p) => ({
                      ...p,
                      moisture: e.target.value as Moisture,
                    }))
                  }
                >
                  <option value="dry">{locale === "en" ? "Dry" : "Trocken"}</option>
                  <option value="slightly-damp">
                    {locale === "en" ? "Slightly damp" : "Leicht feucht"}
                  </option>
                  <option value="damp">{locale === "en" ? "Damp" : "Feucht"}</option>
                </select>
              </div>
            </div>

            {model.underlayType === "other" ? (
              <div className="space-y-1.5">
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="si-underlay-other"
                >
                  {t.other}
                </label>
                <Input
                  id="si-underlay-other"
                  value={model.underlayOther}
                  onChange={(e) =>
                    setModel((p) => ({ ...p, underlayOther: e.target.value }))
                  }
                  placeholder={t.otherPh}
                />
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="si-loadbearing"
                >
                  {t.loadBearing}
                </label>
                <select
                  id="si-loadbearing"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={model.loadBearing}
                  onChange={(e) =>
                    setModel((p) => ({
                      ...p,
                      loadBearing: e.target.value as LoadBearing,
                    }))
                  }
                >
                  <option value="good">{locale === "en" ? "Good" : "Gut"}</option>
                  <option value="medium">{locale === "en" ? "Medium" : "Mittel"}</option>
                  <option value="poor">{locale === "en" ? "Poor" : "Schlecht"}</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="si-absorbency"
                >
                  {t.absorbency}
                </label>
                <select
                  id="si-absorbency"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={model.absorbency}
                  onChange={(e) =>
                    setModel((p) => ({
                      ...p,
                      absorbency: e.target.value as Absorbency,
                    }))
                  }
                >
                  <option value="low">{locale === "en" ? "Low" : "Gering"}</option>
                  <option value="normal">{locale === "en" ? "Normal" : "Normal"}</option>
                  <option value="high">{locale === "en" ? "High" : "Hoch"}</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="si-contamination"
                >
                  {t.contamination}
                </label>
                <select
                  id="si-contamination"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={model.contamination}
                  onChange={(e) =>
                    setModel((p) => ({
                      ...p,
                      contamination: e.target.value as Contamination,
                    }))
                  }
                >
                  <option value="low">{locale === "en" ? "Low" : "Gering"}</option>
                  <option value="medium">{locale === "en" ? "Medium" : "Mittel"}</option>
                  <option value="high">{locale === "en" ? "High" : "Hoch"}</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">{t.flags}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-4"
                      checked={model.cracks}
                      onChange={(e) =>
                        setModel((p) => ({ ...p, cracks: e.target.checked }))
                      }
                    />
                    {t.cracks}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-4"
                      checked={model.flaking}
                      onChange={(e) =>
                        setModel((p) => ({ ...p, flaking: e.target.checked }))
                      }
                    />
                    {t.flaking}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-4"
                      checked={model.mold}
                      onChange={(e) =>
                        setModel((p) => ({ ...p, mold: e.target.checked }))
                      }
                    />
                    {t.mold}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-4"
                      checked={model.salts}
                      onChange={(e) =>
                        setModel((p) => ({ ...p, salts: e.target.checked }))
                      }
                    />
                    {t.salts}
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                className="text-xs font-medium text-muted-foreground"
                htmlFor="si-notes"
              >
                {t.note}
              </label>
              <Textarea
                id="si-notes"
                value={model.testNotes}
                onChange={(e) =>
                  setModel((p) => ({ ...p, testNotes: e.target.value }))
                }
                rows={5}
                className="min-h-[7rem] resize-y"
                placeholder={
                  locale === "en"
                    ? "e.g. tape test, scratch test, observations…"
                    : "z. B. Klebebandtest, Kratzprobe, Beobachtungen…"
                }
              />
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
          </CardFooter>
        </Card>

        <div className="space-y-6">
          <Alert className={riskBadge.className}>
            {riskBadge.icon}
            <AlertTitle>{t.levelTitle}: {riskBadge.label}</AlertTitle>
            <AlertDescription className="text-sm text-muted-foreground">
              {riskBadge.hint}
            </AlertDescription>
          </Alert>

          {risk.level === "red" ? (
            <Alert variant="destructive">
              <AlertCircle aria-hidden />
              <AlertTitle>{locale === "en" ? "Stop" : "Stopp"}</AlertTitle>
              <AlertDescription>
                {locale === "en"
                  ? "Clarify and remediate before coating."
                  : "Vor Beschichtung klären und sanieren."}
              </AlertDescription>
            </Alert>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.reasons}</CardTitle>
              <CardDescription className="text-xs">
                {locale === "en"
                  ? "What influenced the traffic light."
                  : "Was die Ampel beeinflusst hat."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {risk.reasons.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {locale === "en" ? "No risk indicators." : "Keine Risikohinweise."}
                </p>
              ) : (
                <ul className="list-inside list-disc text-sm text-muted-foreground">
                  {risk.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.recommendations}</CardTitle>
              <CardDescription className="text-xs">
                {locale === "en"
                  ? "Suggested next steps."
                  : "Empfohlene nächste Schritte."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {risk.recommendations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {locale === "en"
                    ? "No recommendations."
                    : "Keine Empfehlungen."}
                </p>
              ) : (
                <ul className="list-inside list-disc text-sm text-muted-foreground">
                  {risk.recommendations.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              )}
            </CardContent>
            <CardFooter className="flex flex-wrap gap-3 border-t pt-6">
              <Button type="button" variant="secondary" onClick={copyToClipboard} disabled={busy}>
                <Copy className="size-4" aria-hidden />
                {t.copy}
              </Button>
              <Button type="button" variant="secondary" onClick={exportNote} disabled={busy}>
                <Download className="size-4" aria-hidden />
                {t.export}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}

