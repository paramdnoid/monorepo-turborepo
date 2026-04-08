"use client";

import * as React from "react";
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from "react-leaflet";

import {
  schedulingRoutingDirectionsResponseSchema,
  schedulingRoutingMatrixResponseSchema,
} from "@repo/api-contracts";
import { Button } from "@repo/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/select";

import type { Locale } from "@/lib/i18n/locale";
import { parseResponseJson } from "@/lib/parse-response-json";

import {
  buildCostMatrixFromDurations,
  buildSymmetricCostMatrix,
  nearestNeighborPath,
  pathCostSeconds,
  twoOptPath,
} from "./route-optimization";

export type SchedulingMapAssignment = {
  id: string;
  atTime: string;
  title: string;
  place: string;
  employeeId: string;
  addressId: string | null;
  placeLatitude: number | null;
  placeLongitude: number | null;
};

export type SchedulingMapEmployee = {
  employeeId: string;
  displayName: string;
};

export type SchedulingMapAddressGeo = {
  label: string;
  latitude: number | null;
  longitude: number | null;
};

type RouteStop = {
  assignmentId: string;
  startTime: string;
  title: string;
  place: string | null;
  lat: number;
  lng: number;
};

type RoutePreview = {
  employeeId: string;
  stops: RouteStop[];
  timeSlots: string[];
  currentTotalSeconds: number | null;
  optimizedTotalSeconds: number | null;
  directions:
    | {
        distanceMeters: number;
        durationSeconds: number;
        polyline: Array<[number, number]>;
      }
    | null;
};

type MarkerPoint = {
  assignmentId: string;
  lat: number;
  lng: number;
  title: string;
  atTime: string;
  employeeName: string | null;
  place: string | null;
};

function resolveAssignmentCoordinates(
  a: SchedulingMapAssignment,
  addressGeoById: Record<string, SchedulingMapAddressGeo | undefined>,
): { lat: number; lng: number } | null {
  if (a.placeLatitude != null && a.placeLongitude != null) {
    return { lat: a.placeLatitude, lng: a.placeLongitude };
  }
  if (!a.addressId) {
    return null;
  }
  const geo = addressGeoById[a.addressId];
  if (!geo || geo.latitude == null || geo.longitude == null) {
    return null;
  }
  return { lat: geo.latitude, lng: geo.longitude };
}

function FitBounds({ points }: { points: Array<[number, number]> }) {
  const map = useMap();
  React.useEffect(() => {
    if (points.length === 0) return;
    map.fitBounds(points, { padding: [24, 24], maxZoom: 14 });
  }, [map, points]);
  return null;
}

function formatSeconds(v: number | null, locale: Locale): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const mins = Math.round(v / 60);
  if (mins < 60) {
    return locale === "en" ? `${mins} min` : `${mins} Min`;
  }
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return locale === "en" ? `${h}h ${m}m` : `${h} Std ${m} Min`;
}

function formatMeters(v: number | null, locale: Locale): string {
  if (v == null || !Number.isFinite(v)) return "—";
  if (v < 1000) {
    const m = Math.round(v);
    return locale === "en" ? `${m} m` : `${m} m`;
  }
  const km = v / 1000;
  const rounded = Math.round(km * 10) / 10;
  return locale === "en" ? `${rounded} km` : `${rounded} km`;
}

export function SchedulingMapPanel({
  locale,
  employees,
  assignments,
  addressGeoById,
  busy,
  canEdit,
  date,
  onReordered,
}: {
  locale: Locale;
  employees: SchedulingMapEmployee[];
  assignments: SchedulingMapAssignment[];
  addressGeoById: Record<string, SchedulingMapAddressGeo | undefined>;
  busy?: boolean;
  canEdit?: boolean;
  date: string;
  onReordered?: () => void | Promise<void>;
}) {
  const [employeeFilterId, setEmployeeFilterId] = React.useState<string>("__all__");
  const [optBusy, setOptBusy] = React.useState(false);
  const [optError, setOptError] = React.useState<string | null>(null);
  const [routePreview, setRoutePreview] = React.useState<RoutePreview | null>(null);
  const [applyBusy, setApplyBusy] = React.useState(false);
  const [undoPayload, setUndoPayload] = React.useState<
    Array<{ id: string; startTime: string }> | null
  >(null);

  const employeeNameById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const e of employees) {
      m.set(e.employeeId, e.displayName);
    }
    return m;
  }, [employees]);

  const markers = React.useMemo<MarkerPoint[]>(() => {
    const out: MarkerPoint[] = [];
    for (const a of assignments) {
      if (employeeFilterId !== "__all__" && a.employeeId !== employeeFilterId) {
        continue;
      }
      const coords = resolveAssignmentCoordinates(a, addressGeoById);
      if (!coords) continue;
      out.push({
        assignmentId: a.id,
        lat: coords.lat,
        lng: coords.lng,
        title: a.title,
        atTime: a.atTime,
        employeeName: employeeNameById.get(a.employeeId) ?? null,
        place: a.place.trim() ? a.place.trim() : null,
      });
    }
    return out;
  }, [addressGeoById, assignments, employeeFilterId, employeeNameById]);

  const points = React.useMemo(
    () => markers.map((m) => [m.lat, m.lng] as [number, number]),
    [markers],
  );

  const missingGeoCount = React.useMemo(() => {
    let missing = 0;
    for (const a of assignments) {
      if (employeeFilterId !== "__all__" && a.employeeId !== employeeFilterId) {
        continue;
      }
      if (!resolveAssignmentCoordinates(a, addressGeoById)) {
        missing += 1;
      }
    }
    return missing;
  }, [addressGeoById, assignments, employeeFilterId]);

  const headerLabel =
    locale === "en" ? "Map (daily route)" : "Karte (Tagesroute)";
  const employeeLabel = locale === "en" ? "Employee" : "Mitarbeitende:r";
  const allEmployeesLabel = locale === "en" ? "All employees" : "Alle Mitarbeitenden";

  const filteredAssignments = React.useMemo(() => {
    const base =
      employeeFilterId === "__all__"
        ? assignments
        : assignments.filter((a) => a.employeeId === employeeFilterId);
    return [...base].sort((a, b) => a.atTime.localeCompare(b.atTime));
  }, [assignments, employeeFilterId]);

  const eligibleStops = React.useMemo<RouteStop[]>(() => {
    const out: RouteStop[] = [];
    for (const a of filteredAssignments) {
      const coords = resolveAssignmentCoordinates(a, addressGeoById);
      if (!coords) continue;
      out.push({
        assignmentId: a.id,
        startTime: a.atTime,
        title: a.title,
        place: a.place.trim() ? a.place.trim() : null,
        lat: coords.lat,
        lng: coords.lng,
      });
    }
    return out;
  }, [addressGeoById, filteredAssignments]);

  const excludedStopsCount = filteredAssignments.length - eligibleStops.length;

  React.useEffect(() => {
    setOptError(null);
    setRoutePreview(null);
    setUndoPayload(null);
    setOptBusy(false);
    setApplyBusy(false);
  }, [date]);

  React.useEffect(() => {
    setOptError(null);
    setRoutePreview(null);
    setUndoPayload(null);
  }, [employeeFilterId]);

  const optimizeLabel = locale === "en" ? "Optimize route" : "Route optimieren";
  const applyLabel = locale === "en" ? "Apply" : "Anwenden";
  const undoLabel = locale === "en" ? "Undo" : "Rueckgaengig";
  const clearLabel = locale === "en" ? "Discard preview" : "Vorschau verwerfen";

  const optimizeRoute = React.useCallback(async () => {
    if (employeeFilterId === "__all__") {
      setOptError(
        locale === "en"
          ? "Select an employee to optimize a route."
          : "Bitte eine:n Mitarbeitende:n auswaehlen, um eine Route zu optimieren.",
      );
      return;
    }
    if (eligibleStops.length < 2) {
      setOptError(
        locale === "en"
          ? "Need at least 2 assignments with coordinates."
          : "Mindestens 2 Einsaetze mit Koordinaten werden benoetigt.",
      );
      return;
    }
    if (eligibleStops.length > 60) {
      setOptError(
        locale === "en"
          ? "Too many stops for routing (max 60)."
          : "Zu viele Stopps fuers Routing (max. 60).",
      );
      return;
    }

    setOptBusy(true);
    setOptError(null);
    setRoutePreview(null);
    setUndoPayload(null);
    try {
      const matrixRes = await fetch("/api/web/scheduling/routing/matrix", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: "driving-car",
          locations: eligibleStops.map((s) => ({
            latitude: s.lat,
            longitude: s.lng,
          })),
          metrics: ["duration"],
        }),
      });
      const matrixText = await matrixRes.text();
      const matrixJson = parseResponseJson(matrixText);
      const parsedMatrix = schedulingRoutingMatrixResponseSchema.safeParse(matrixJson);
      if (!matrixRes.ok || !parsedMatrix.success) {
        setOptError(
          locale === "en"
            ? "Routing matrix is unavailable."
            : "Routing-Matrix ist nicht verfuegbar.",
        );
        return;
      }

      const cost = buildCostMatrixFromDurations(parsedMatrix.data.durations);
      if (!cost) {
        setOptError(
          locale === "en"
            ? "Routing matrix response is invalid."
            : "Routing-Matrix Antwort ist ungueltig.",
        );
        return;
      }

      const symmetric = buildSymmetricCostMatrix(cost);
      const initial = nearestNeighborPath(symmetric, 0);
      const optimized = twoOptPath(initial, symmetric);

      const baselineOrder = Array.from({ length: eligibleStops.length }, (_, i) => i);
      const currentTotalSeconds = pathCostSeconds(baselineOrder, cost);
      const optimizedTotalSeconds = pathCostSeconds(optimized, cost);
      const optimizedStops = optimized.map((idx) => eligibleStops[idx]!);
      const timeSlots = [...eligibleStops]
        .map((s) => s.startTime)
        .sort((a, b) => a.localeCompare(b));

      const dirRes = await fetch("/api/web/scheduling/routing/directions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: "driving-car",
          coordinates: optimizedStops.map((s) => ({
            latitude: s.lat,
            longitude: s.lng,
          })),
        }),
      });
      const dirText = await dirRes.text();
      const dirJson = parseResponseJson(dirText);
      const parsedDir = schedulingRoutingDirectionsResponseSchema.safeParse(dirJson);
      const directions =
        dirRes.ok && parsedDir.success
          ? {
              distanceMeters: parsedDir.data.distanceMeters,
              durationSeconds: parsedDir.data.durationSeconds,
              polyline: parsedDir.data.geometry.coordinates.map(
                ([lon, lat]) => [lat, lon] as [number, number],
              ),
            }
          : null;

      setRoutePreview({
        employeeId: employeeFilterId,
        stops: optimizedStops,
        timeSlots,
        currentTotalSeconds,
        optimizedTotalSeconds,
        directions,
      });
    } catch {
      setOptError(
        locale === "en"
          ? "Routing is unavailable."
          : "Routing ist nicht verfuegbar.",
      );
    } finally {
      setOptBusy(false);
    }
  }, [eligibleStops, employeeFilterId, locale]);

  const applyOptimized = React.useCallback(async () => {
    if (!routePreview) return;
    if (!canEdit) {
      setOptError(locale === "en" ? "No permission to apply changes." : "Keine Berechtigung zum Anwenden.");
      return;
    }
    if (routePreview.timeSlots.length !== routePreview.stops.length) {
      setOptError(locale === "en" ? "Route preview is out of sync." : "Routenvorschau ist nicht aktuell.");
      return;
    }
    setApplyBusy(true);
    setOptError(null);
    try {
      const payload = {
        assignments: routePreview.stops.map((s, idx) => ({
          id: s.assignmentId,
          startTime: routePreview.timeSlots[idx]!,
        })),
      };
      const undo = routePreview.stops.map((s) => ({
        id: s.assignmentId,
        startTime: s.startTime,
      }));

      const res = await fetch("/api/web/scheduling/assignments/reorder", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      const json = parseResponseJson(text);
      if (!res.ok || typeof json !== "object" || json === null) {
        setOptError(
          locale === "en"
            ? "Could not apply route order."
            : "Routenreihenfolge konnte nicht angewendet werden.",
        );
        return;
      }

      setUndoPayload(undo);
      await onReordered?.();
    } catch {
      setOptError(
        locale === "en"
          ? "Could not apply route order."
          : "Routenreihenfolge konnte nicht angewendet werden.",
      );
    } finally {
      setApplyBusy(false);
    }
  }, [canEdit, locale, onReordered, routePreview]);

  const undoOptimized = React.useCallback(async () => {
    if (!undoPayload) return;
    if (!canEdit) {
      setOptError(locale === "en" ? "No permission to apply changes." : "Keine Berechtigung zum Anwenden.");
      return;
    }
    setApplyBusy(true);
    setOptError(null);
    try {
      const res = await fetch("/api/web/scheduling/assignments/reorder", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments: undoPayload }),
      });
      if (!res.ok) {
        setOptError(
          locale === "en"
            ? "Could not undo changes."
            : "Aenderungen konnten nicht rueckgaengig gemacht werden.",
        );
        return;
      }
      setUndoPayload(null);
      setRoutePreview(null);
      await onReordered?.();
    } catch {
      setOptError(
        locale === "en"
          ? "Could not undo changes."
          : "Aenderungen konnten nicht rueckgaengig gemacht werden.",
      );
    } finally {
      setApplyBusy(false);
    }
  }, [canEdit, locale, onReordered, undoPayload]);

  return (
    <div className="space-y-2 rounded-lg border border-border/60 bg-muted/10 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">{headerLabel}</p>
          <p className="text-xs text-muted-foreground">
            {busy
              ? locale === "en"
                ? "Loading locations…"
                : "Lade Orte…"
              : markers.length === 0
                ? locale === "en"
                  ? "No locations with coordinates for the current filter."
                  : "Keine Orte mit Koordinaten fuer den aktuellen Filter."
                : missingGeoCount > 0
                  ? locale === "en"
                    ? `${missingGeoCount} assignment(s) without coordinates are not shown on the map.`
                    : `${missingGeoCount} Einsatz/Einsaetze ohne Koordinaten werden nicht auf der Karte angezeigt.`
                  : locale === "en"
                    ? "All assignments with a structured address are shown."
                    : "Alle Einsaetze mit strukturierter Adresse werden angezeigt."}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="grid gap-1">
            <p className="text-xs font-medium text-muted-foreground">{employeeLabel}</p>
            <Select value={employeeFilterId} onValueChange={setEmployeeFilterId}>
              <SelectTrigger className="h-8 w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{allEmployeesLabel}</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.employeeId} value={e.employeeId}>
                    {e.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                void optimizeRoute();
              }}
              disabled={optBusy || busy || employeeFilterId === "__all__" || eligibleStops.length < 2}
            >
              {optBusy ? (locale === "en" ? "Optimizing…" : "Optimiert…") : optimizeLabel}
            </Button>
            {routePreview ? (
              <>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => {
                    void applyOptimized();
                  }}
                  disabled={applyBusy || !canEdit || undoPayload !== null}
                >
                  {applyBusy ? (locale === "en" ? "Applying…" : "Wendet an…") : applyLabel}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRoutePreview(null);
                    setOptError(null);
                  }}
                  disabled={applyBusy || undoPayload !== null}
                >
                  {clearLabel}
                </Button>
              </>
            ) : null}
            {undoPayload ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  void undoOptimized();
                }}
                disabled={applyBusy || !canEdit}
              >
                {applyBusy ? (locale === "en" ? "Undoing…" : "Macht rueckgaengig…") : undoLabel}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {excludedStopsCount > 0 ? (
        <p className="text-xs text-muted-foreground">
          {locale === "en"
            ? `${excludedStopsCount} assignment(s) are excluded from routing (missing structured address / coordinates).`
            : `${excludedStopsCount} Einsatz/Einsaetze werden beim Routing ausgelassen (keine strukturierte Adresse / Koordinaten).`}
        </p>
      ) : null}

      {optError ? (
        <p className="text-sm text-destructive">{optError}</p>
      ) : null}

      {routePreview ? (
        <div className="rounded-md border border-border/60 bg-background/60 p-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium">
              {locale === "en" ? "Route preview" : "Routenvorschau"}
            </p>
            <p className="text-xs text-muted-foreground">
              {locale === "en" ? "Travel time" : "Fahrzeit"}:{" "}
              {formatSeconds(routePreview.optimizedTotalSeconds, locale)}
              {routePreview.currentTotalSeconds != null && routePreview.optimizedTotalSeconds != null
                ? (() => {
                    const delta = routePreview.currentTotalSeconds - routePreview.optimizedTotalSeconds;
                    const prefix = delta >= 0 ? "−" : "+";
                    return ` (${prefix}${formatSeconds(Math.abs(delta), locale)})`;
                  })()
                : ""}
              {routePreview.directions
                ? ` · ${locale === "en" ? "Distance" : "Strecke"}: ${formatMeters(
                    routePreview.directions.distanceMeters,
                    locale,
                  )}`
                : ""}
            </p>
          </div>
          <ol className="mt-2 space-y-1 text-xs text-muted-foreground">
            {routePreview.stops.map((s, idx) => (
              <li key={s.assignmentId} className="flex flex-wrap gap-x-2">
                <span className="font-medium text-foreground">
                  {routePreview.timeSlots[idx] ?? s.startTime}
                </span>
                <span className="truncate">
                  {idx + 1}. {s.title}
                </span>
                {s.place ? <span className="truncate">· {s.place}</span> : null}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <div className="h-[340px] overflow-hidden rounded-md border border-border/60">
        <MapContainer
          center={[52.52, 13.405]}
          zoom={11}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {routePreview?.directions?.polyline ? (
            <Polyline
              positions={routePreview.directions.polyline}
              pathOptions={{ color: "var(--color-primary)", weight: 4, opacity: 0.85 }}
            />
          ) : null}
          {points.length > 0 ? <FitBounds points={points} /> : null}
          {markers.map((m) => (
            <CircleMarker
              key={m.assignmentId}
              center={[m.lat, m.lng]}
              radius={7}
              pathOptions={{
                color: "var(--color-primary)",
                fillColor: "var(--color-primary)",
                fillOpacity: 0.85,
                weight: 2,
              }}
            >
              <Popup>
                <div className="space-y-1">
                  <div className="text-sm font-medium">
                    {m.atTime} · {m.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {m.employeeName ?? "—"}
                    {m.place ? ` · ${m.place}` : ""}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

