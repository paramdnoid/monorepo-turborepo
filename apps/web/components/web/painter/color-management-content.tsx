"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Info, Search, Star } from "lucide-react";
import {
  colorPreferencesResponseSchema,
  type ColorPaletteScope,
} from "@repo/api-contracts";
import { toast } from "sonner";

import {
  NCS_CATALOG,
  RAL_CLASSIC_CATALOG,
} from "@/lib/colors/catalog";
import { filterNcsCatalog, filterRalCatalog } from "@/lib/colors/filter-colors";
import { parseResponseJson } from "@/lib/parse-response-json";
import type {
  ColorSystemId,
  NcsEntry,
  RalClassicEntry,
  StoredColorRef,
} from "@/lib/colors/types";
import type { Locale } from "@/lib/i18n/locale";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/alert";
import { Button } from "@repo/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";
import { Input } from "@repo/ui/input";
import { ScrollArea } from "@repo/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@repo/ui/toggle-group";
import { cn } from "@repo/ui/utils";

const RECENT_MAX = 10;

type PaletteState = {
  favorites: StoredColorRef[];
  recent: StoredColorRef[];
  updatedAt: string | null;
  updatedBySub: string | null;
};

function emptyPalette(): PaletteState {
  return { favorites: [], recent: [], updatedAt: null, updatedBySub: null };
}

function swatchRingClass(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m?.[1]) return "ring-1 ring-inset ring-black/15";
  const r = Number.parseInt(m[1].slice(0, 2), 16) / 255;
  const g = Number.parseInt(m[1].slice(2, 4), 16) / 255;
  const b = Number.parseInt(m[1].slice(4, 6), 16) / 255;
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return l > 0.82
    ? "ring-1 ring-inset ring-black/20"
    : "ring-1 ring-inset ring-white/10";
}

function dedupeRefs(refs: StoredColorRef[]): StoredColorRef[] {
  const seen = new Set<string>();
  const out: StoredColorRef[] = [];
  for (const ref of refs) {
    const key = `${ref.system}:${ref.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ref);
  }
  return out;
}

function extractApiErrorMessage(json: unknown, fallback: string): string {
  if (typeof json !== "object" || json === null) return fallback;
  const rec = json as Record<string, unknown>;
  const detail = typeof rec.detail === "string" ? rec.detail : null;
  const hint = typeof rec.hint === "string" ? rec.hint : null;
  const error = typeof rec.error === "string" ? rec.error : null;
  if (detail && hint) return `${detail} ${hint}`;
  if (detail) return detail;
  if (error) return error;
  return fallback;
}

function toggleFavorite(
  favorites: StoredColorRef[],
  system: ColorSystemId,
  id: string,
): StoredColorRef[] {
  const exists = favorites.some((f) => f.system === system && f.id === id);
  if (exists) {
    return favorites.filter((f) => !(f.system === system && f.id === id));
  }
  return [...favorites, { system, id }];
}

export function ColorManagementContent({ locale }: { locale: Locale }) {
  const [system, setSystem] = useState<ColorSystemId>("ral");
  const [scope, setScope] = useState<ColorPaletteScope>("user");
  const [query, setQuery] = useState("");
  const [selectedRal, setSelectedRal] = useState<RalClassicEntry | null>(null);
  const [selectedNcs, setSelectedNcs] = useState<NcsEntry | null>(null);
  const [userPalette, setUserPalette] = useState<PaletteState>(emptyPalette());
  const [teamPalette, setTeamPalette] = useState<PaletteState>(emptyPalette());
  const [teamCanEdit, setTeamCanEdit] = useState(false);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);

  const ralByCode = useMemo(() => {
    const m = new Map<string, RalClassicEntry>();
    for (const e of RAL_CLASSIC_CATALOG) {
      m.set(e.code, e);
    }
    return m;
  }, []);

  const ncsByNotation = useMemo(() => {
    const m = new Map<string, NcsEntry>();
    for (const e of NCS_CATALOG) {
      m.set(e.notation, e);
    }
    return m;
  }, []);

  const filtered = useMemo(() => {
    if (system === "ral") {
      return filterRalCatalog(RAL_CLASSIC_CATALOG, query);
    }
    return filterNcsCatalog(NCS_CATALOG, query);
  }, [system, query]);

  const currentPalette = scope === "team" ? teamPalette : userPalette;
  const readOnlyTeam = scope === "team" && !teamCanEdit;

  const copyLine = useCallback(
    async (line: string) => {
      try {
        await navigator.clipboard.writeText(line);
        toast.success(
          locale === "en" ? "Copied to clipboard" : "In die Zwischenablage kopiert",
        );
      } catch {
        toast.error(locale === "en" ? "Copy failed" : "Kopieren fehlgeschlagen");
      }
    },
    [locale],
  );

  const putPalette = useCallback(
    async (nextScope: ColorPaletteScope, next: PaletteState) => {
      setSaving(true);
      try {
        const res = await fetch("/api/web/settings/colors", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scope: nextScope,
            favorites: dedupeRefs(next.favorites).slice(0, 400),
            recent: dedupeRefs(next.recent).slice(0, 40),
          }),
        });
        const text = await res.text();
        const json = parseResponseJson(text);
        if (!res.ok) {
          throw new Error(
            extractApiErrorMessage(
              json,
              locale === "en"
                ? "Palette could not be saved."
                : "Palette konnte nicht gespeichert werden.",
            ),
          );
        }
        const parsed = colorPreferencesResponseSchema.safeParse(json);
        if (!parsed.success) {
          throw new Error(
            locale === "en"
              ? "Palette response is invalid."
              : "Palette-Antwort ist ungueltig.",
          );
        }
        if (nextScope === "team") {
          setTeamPalette({
            favorites: parsed.data.palette.favorites,
            recent: parsed.data.palette.recent,
            updatedAt: parsed.data.palette.updatedAt,
            updatedBySub: parsed.data.palette.updatedBySub,
          });
        } else {
          setUserPalette({
            favorites: parsed.data.palette.favorites,
            recent: parsed.data.palette.recent,
            updatedAt: parsed.data.palette.updatedAt,
            updatedBySub: parsed.data.palette.updatedBySub,
          });
        }
        setTeamCanEdit(parsed.data.permissions.canEditTeamPalette);
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : locale === "en"
              ? "Palette could not be saved."
              : "Palette konnte nicht gespeichert werden.",
        );
      } finally {
        setSaving(false);
      }
    },
    [locale],
  );

  const loadScope = useCallback(
    async (paletteScope: ColorPaletteScope): Promise<{
      palette: PaletteState;
      canEditTeamPalette: boolean;
    }> => {
      const res = await fetch(`/api/web/settings/colors?scope=${paletteScope}`, {
        credentials: "include",
        cache: "no-store",
      });
      const text = await res.text();
      const json = parseResponseJson(text);
      if (!res.ok) {
        throw new Error(
          extractApiErrorMessage(
            json,
            locale === "en"
              ? "Color palettes could not be loaded."
              : "Farbpaletten konnten nicht geladen werden.",
          ),
        );
      }
      const parsed = colorPreferencesResponseSchema.safeParse(json);
      if (!parsed.success) {
        throw new Error(
          locale === "en"
            ? "Palette response is invalid."
            : "Palette-Antwort ist ungueltig.",
        );
      }
      return {
        palette: {
          favorites: parsed.data.palette.favorites,
          recent: parsed.data.palette.recent,
          updatedAt: parsed.data.palette.updatedAt,
          updatedBySub: parsed.data.palette.updatedBySub,
        },
        canEditTeamPalette: parsed.data.permissions.canEditTeamPalette,
      };
    },
    [locale],
  );

  useEffect(() => {
    let active = true;
    void (async () => {
      setBusy(true);
      try {
        const [userLoaded, teamLoaded] = await Promise.all([
          loadScope("user"),
          loadScope("team"),
        ]);
        if (!active) return;
        setUserPalette(userLoaded.palette);
        setTeamPalette(teamLoaded.palette);
        setTeamCanEdit(teamLoaded.canEditTeamPalette);
      } catch (err) {
        if (!active) return;
        toast.error(
          err instanceof Error
            ? err.message
            : locale === "en"
              ? "Color palettes could not be loaded."
              : "Farbpaletten konnten nicht geladen werden.",
        );
      } finally {
        if (active) setBusy(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [loadScope, locale]);

  const onPickRal = useCallback(
    (entry: RalClassicEntry) => {
      setSystem("ral");
      setSelectedRal(entry);
      setSelectedNcs(null);
      if (readOnlyTeam) return;
      const nextRecent = [
        { system: "ral" as const, id: entry.code },
        ...currentPalette.recent.filter((r) => !(r.system === "ral" && r.id === entry.code)),
      ].slice(0, RECENT_MAX);
      const next = { ...currentPalette, recent: nextRecent };
      if (scope === "team") setTeamPalette(next);
      else setUserPalette(next);
      void putPalette(scope, next);
    },
    [currentPalette, putPalette, readOnlyTeam, scope],
  );

  const onPickNcs = useCallback(
    (entry: NcsEntry) => {
      setSystem("ncs");
      setSelectedNcs(entry);
      setSelectedRal(null);
      if (readOnlyTeam) return;
      const nextRecent = [
        { system: "ncs" as const, id: entry.notation },
        ...currentPalette.recent.filter(
          (r) => !(r.system === "ncs" && r.id === entry.notation),
        ),
      ].slice(0, RECENT_MAX);
      const next = { ...currentPalette, recent: nextRecent };
      if (scope === "team") setTeamPalette(next);
      else setUserPalette(next);
      void putPalette(scope, next);
    },
    [currentPalette, putPalette, readOnlyTeam, scope],
  );

  const onToggleFavorite = useCallback(() => {
    if (readOnlyTeam) return;
    if (system === "ral" && selectedRal) {
      const next = {
        ...currentPalette,
        favorites: toggleFavorite(currentPalette.favorites, "ral", selectedRal.code),
      };
      if (scope === "team") setTeamPalette(next);
      else setUserPalette(next);
      void putPalette(scope, next);
      return;
    }
    if (system === "ncs" && selectedNcs) {
      const next = {
        ...currentPalette,
        favorites: toggleFavorite(currentPalette.favorites, "ncs", selectedNcs.notation),
      };
      if (scope === "team") setTeamPalette(next);
      else setUserPalette(next);
      void putPalette(scope, next);
    }
  }, [currentPalette, putPalette, readOnlyTeam, scope, selectedNcs, selectedRal, system]);

  const isFavorite =
    (system === "ral" &&
      selectedRal &&
      currentPalette.favorites.some((f) => f.system === "ral" && f.id === selectedRal.code)) ||
    (system === "ncs" &&
      selectedNcs &&
      currentPalette.favorites.some(
        (f) => f.system === "ncs" && f.id === selectedNcs.notation,
      ));

  const recentResolved = currentPalette.recent
    .map((r) => {
      if (r.system === "ral") {
        const e = ralByCode.get(r.id);
        return e ? ({ kind: "ral" as const, entry: e } as const) : null;
      }
      const e = ncsByNotation.get(r.id);
      return e ? ({ kind: "ncs" as const, entry: e } as const) : null;
    })
    .filter(Boolean) as Array<
    { kind: "ral"; entry: RalClassicEntry } | { kind: "ncs"; entry: NcsEntry }
  >;

  const favoriteResolved = currentPalette.favorites
    .map((r) => {
      if (r.system === "ral") {
        const e = ralByCode.get(r.id);
        return e ? ({ kind: "ral" as const, entry: e } as const) : null;
      }
      const e = ncsByNotation.get(r.id);
      return e ? ({ kind: "ncs" as const, entry: e } as const) : null;
    })
    .filter(Boolean) as Array<
    { kind: "ral"; entry: RalClassicEntry } | { kind: "ncs"; entry: NcsEntry }
  >;

  const t = {
    intro:
      locale === "en"
        ? "Search RAL Classic and NCS notations, copy values for offers and site documentation. Screen colors are approximate — always validate with physical samples."
        : "RAL Classic und NCS-Notationen durchsuchen, Werte fuer Angebote und Baustellendoku kopieren. Bildschirmfarben sind Annaeherungen — Abstimmung mit Mustern bleibt Pflicht.",
    searchPh:
      locale === "en"
        ? "Code, notation, or hex (without #)"
        : "Code, Notation oder Hex (ohne #)",
    ncsHint:
      locale === "en"
        ? "NCS production catalog with 700+ entries."
        : "NCS-Produktivkatalog mit 700+ Eintraegen.",
    ralHint:
      locale === "en"
        ? "RAL Classic production catalog (bundled baseline, extensible with licensed tenant data)."
        : "RAL-Classic-Produktivkatalog (gebuendelter Basisbestand, um lizenzierte Mandantendaten erweiterbar).",
    empty:
      locale === "en"
        ? "No matches. Try another code or hex fragment."
        : "Keine Treffer. Anderen Code oder Hex-Abschnitt versuchen.",
    recent: locale === "en" ? "Recently used" : "Zuletzt verwendet",
    fav: locale === "en" ? "Favorites" : "Favoriten",
    copy: locale === "en" ? "Copy code + hex" : "Code + Hex kopieren",
    detail: locale === "en" ? "Selection" : "Auswahl",
    pick: locale === "en" ? "Pick a color from the list." : "Waehlen Sie eine Farbe aus der Liste.",
    paletteScope: locale === "en" ? "Palette scope" : "Palette",
    myPalette: locale === "en" ? "My palette" : "Meine Palette",
    teamPalette: locale === "en" ? "Team palette" : "Team-Palette",
    teamReadOnly:
      locale === "en"
        ? "Team palette is read-only for your role."
        : "Team-Palette ist fuer deine Rolle nur lesbar.",
    loading: locale === "en" ? "Loading palettes…" : "Paletten werden geladen…",
    saving: locale === "en" ? "Saving…" : "Speichern…",
  };

  return (
    <div className="w-full min-w-0 space-y-6">
      <Alert className="border-primary/20 bg-primary/5">
        <Info className="text-primary" aria-hidden="true" />
        <AlertTitle>{locale === "en" ? "Note" : "Hinweis"}</AlertTitle>
        <AlertDescription className="text-sm text-muted-foreground">
          {t.intro}
        </AlertDescription>
      </Alert>

      {readOnlyTeam ? (
        <Alert>
          <AlertTitle>{t.teamPalette}</AlertTitle>
          <AlertDescription>{t.teamReadOnly}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="border-border/80 shadow-none">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">
                {locale === "en" ? "Color systems" : "Farbtonsysteme"}
              </CardTitle>
              <CardDescription className="text-xs">
                {system === "ncs" ? t.ncsHint : t.ralHint}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <ToggleGroup
                type="single"
                value={scope}
                onValueChange={(v) => {
                  if (v === "user" || v === "team") {
                    setScope(v);
                  }
                }}
                variant="outline"
                spacing={0}
                aria-label={t.paletteScope}
              >
                <ToggleGroupItem value="user" className="px-3 text-xs sm:text-sm">
                  {t.myPalette}
                </ToggleGroupItem>
                <ToggleGroupItem value="team" className="px-3 text-xs sm:text-sm">
                  {t.teamPalette}
                </ToggleGroupItem>
              </ToggleGroup>
              <ToggleGroup
                type="single"
                value={system}
                onValueChange={(v) => {
                  if (v === "ral" || v === "ncs") {
                    setSystem(v);
                    setSelectedRal(null);
                    setSelectedNcs(null);
                  }
                }}
                variant="outline"
                spacing={0}
                aria-label={locale === "en" ? "Color system" : "Farbtonsystem"}
              >
                <ToggleGroupItem value="ral" className="px-3 text-xs sm:text-sm">
                  RAL Classic
                </ToggleGroupItem>
                <ToggleGroupItem value="ncs" className="px-3 text-xs sm:text-sm">
                  NCS
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.searchPh}
              className="h-10 pl-9"
              aria-label={t.searchPh}
            />
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0 space-y-3">
            <p className="text-xs font-medium text-muted-foreground">
              {locale === "en" ? "Results" : "Treffer"} ({filtered.length})
            </p>
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.empty}</p>
            ) : (
              <ScrollArea className="h-[min(420px,50vh)] rounded-lg border bg-muted/20 pr-2">
                <ul className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-2 p-3">
                  {system === "ral"
                    ? (filtered as RalClassicEntry[]).map((e) => (
                        <li key={e.code}>
                          <button
                            type="button"
                            onClick={() => onPickRal(e)}
                            className={cn(
                              "flex size-11 rounded-md transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              selectedRal?.code === e.code &&
                                "ring-2 ring-primary ring-offset-2 ring-offset-background",
                            )}
                            style={{ backgroundColor: e.hex }}
                            aria-label={e.code}
                            title={e.code}
                          >
                            <span className="sr-only">{e.code}</span>
                          </button>
                        </li>
                      ))
                    : (filtered as NcsEntry[]).map((e) => (
                        <li key={e.notation}>
                          <button
                            type="button"
                            onClick={() => onPickNcs(e)}
                            className={cn(
                              "flex size-11 rounded-md transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              selectedNcs?.notation === e.notation &&
                                "ring-2 ring-primary ring-offset-2 ring-offset-background",
                            )}
                            style={{ backgroundColor: e.hex }}
                            aria-label={e.notation}
                            title={e.notation}
                          >
                            <span className="sr-only">{e.notation}</span>
                          </button>
                        </li>
                      ))}
                </ul>
              </ScrollArea>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border bg-card p-4">
              <h3 className="text-sm font-semibold tracking-tight">{t.detail}</h3>
              {busy ? (
                <p className="mt-2 text-sm text-muted-foreground">{t.loading}</p>
              ) : system === "ral" && selectedRal ? (
                <div className="mt-3 space-y-3">
                  <div
                    className={cn(
                      "aspect-4/3 w-full rounded-lg",
                      swatchRingClass(selectedRal.hex),
                    )}
                    style={{ backgroundColor: selectedRal.hex }}
                  />
                  <p className="font-mono text-sm font-medium">{selectedRal.code}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {selectedRal.hex.toUpperCase()}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => copyLine(`${selectedRal.code} · ${selectedRal.hex}`)}
                    >
                      <Copy className="size-3.5" aria-hidden="true" />
                      {t.copy}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={readOnlyTeam}
                      variant={isFavorite ? "default" : "outline"}
                      onClick={onToggleFavorite}
                    >
                      <Star
                        className="size-3.5"
                        aria-hidden="true"
                        fill={isFavorite ? "currentColor" : "none"}
                      />
                      {locale === "en" ? "Favorite" : "Favorit"}
                    </Button>
                  </div>
                </div>
              ) : system === "ncs" && selectedNcs ? (
                <div className="mt-3 space-y-3">
                  <div
                    className={cn(
                      "aspect-4/3 w-full rounded-lg",
                      swatchRingClass(selectedNcs.hex),
                    )}
                    style={{ backgroundColor: selectedNcs.hex }}
                  />
                  <p className="font-mono text-sm font-medium leading-snug">
                    {selectedNcs.notation}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {selectedNcs.hex.toUpperCase()}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => copyLine(`${selectedNcs.notation} · ${selectedNcs.hex}`)}
                    >
                      <Copy className="size-3.5" aria-hidden="true" />
                      {t.copy}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={readOnlyTeam}
                      variant={isFavorite ? "default" : "outline"}
                      onClick={onToggleFavorite}
                    >
                      <Star
                        className="size-3.5"
                        aria-hidden="true"
                        fill={isFavorite ? "currentColor" : "none"}
                      />
                      {locale === "en" ? "Favorite" : "Favorit"}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">{t.pick}</p>
              )}
            </div>

            {saving ? <p className="text-xs text-muted-foreground">{t.saving}</p> : null}

            {recentResolved.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">{t.recent}</p>
                <ul className="flex flex-wrap gap-2">
                  {recentResolved.map((item) => (
                    <li
                      key={`${item.kind}-${item.kind === "ral" ? item.entry.code : item.entry.notation}`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          item.kind === "ral" ? onPickRal(item.entry) : onPickNcs(item.entry)
                        }
                        className={cn("size-8 rounded-md", swatchRingClass(item.entry.hex))}
                        style={{ backgroundColor: item.entry.hex }}
                        aria-label={item.kind === "ral" ? item.entry.code : item.entry.notation}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {favoriteResolved.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">{t.fav}</p>
                <ul className="flex flex-wrap gap-2">
                  {favoriteResolved.map((item) => (
                    <li
                      key={`fav-${item.kind}-${item.kind === "ral" ? item.entry.code : item.entry.notation}`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          item.kind === "ral" ? onPickRal(item.entry) : onPickNcs(item.entry)
                        }
                        className={cn("size-8 rounded-md", swatchRingClass(item.entry.hex))}
                        style={{ backgroundColor: item.entry.hex }}
                        aria-label={item.kind === "ral" ? item.entry.code : item.entry.notation}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
