"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";

import type { EmployeeAvailabilityRuleInput, EmployeeGeocodeSource } from "@repo/api-contracts";
import { employeeDetailResponseSchema } from "@repo/api-contracts";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/card";
import { Checkbox } from "@repo/ui/checkbox";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Separator } from "@repo/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";

import { CustomerAddressGeocodeControls } from "@/components/web/customers/customer-address-geocode-controls";
import { getEmployeesCopy, weekdayOptions } from "@/content/employees-module";
import type { Locale } from "@/lib/i18n/locale";
import { parseResponseJson } from "@/lib/parse-response-json";

type AvailabilityRow = {
  clientId: string;
  weekday: number;
  startTime: string;
  endTime: string;
};

function normalizeCountryInput(raw: string): string | null {
  const u = raw.trim().toUpperCase();
  if (u.length === 2 && /^[A-Z]{2}$/.test(u)) {
    return u;
  }
  return null;
}

export function EmployeesDetailContent({
  locale,
  employeeId,
}: {
  locale: Locale;
  employeeId: string;
}) {
  const t = getEmployeesCopy(locale);
  const formId = useId();
  const weekdays = useMemo(() => weekdayOptions(locale), [locale]);

  const [loadBusy, setLoadBusy] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [roleLabel, setRoleLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [privateLabel, setPrivateLabel] = useState("");
  const [privateLine2, setPrivateLine2] = useState("");
  const [privateRecipient, setPrivateRecipient] = useState("");
  const [privateStreet, setPrivateStreet] = useState("");
  const [privatePostal, setPrivatePostal] = useState("");
  const [privateCity, setPrivateCity] = useState("");
  const [privateCountry, setPrivateCountry] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [geocodeSource, setGeocodeSource] = useState<EmployeeGeocodeSource | null>(null);
  const [archived, setArchived] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityRow[]>([]);

  const [saveBusy, setSaveBusy] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const geocodeQuery = useMemo(() => {
    const parts = [
      privateStreet.trim(),
      privatePostal.trim(),
      privateCity.trim(),
      privateCountry.trim(),
    ].filter(Boolean);
    return parts.join(", ");
  }, [privateStreet, privatePostal, privateCity, privateCountry]);

  const applyLoaded = useCallback(
    (json: unknown) => {
      const parsed = employeeDetailResponseSchema.safeParse(json);
      if (!parsed.success) {
        setLoadError(t.detailLoadError);
        return;
      }
      const e = parsed.data.employee;
      setDisplayName(e.displayName);
      setRoleLabel(e.roleLabel ?? "");
      setNotes(e.notes ?? "");
      setPrivateLabel(e.privateAddressLabel ?? "");
      setPrivateLine2(e.privateAddressLine2 ?? "");
      setPrivateRecipient(e.privateRecipientName ?? "");
      setPrivateStreet(e.privateStreet ?? "");
      setPrivatePostal(e.privatePostalCode ?? "");
      setPrivateCity(e.privateCity ?? "");
      setPrivateCountry(e.privateCountry ?? "");
      setLatitude(e.latitude != null ? String(e.latitude) : "");
      setLongitude(e.longitude != null ? String(e.longitude) : "");
      setGeocodeSource(e.geocodeSource);
      setArchived(Boolean(e.archivedAt));
      setAvailability(
        e.availability.map((r) => ({
          clientId: r.id,
          weekday: r.weekday,
          startTime: r.startTime.length === 8 ? r.startTime.slice(0, 5) : r.startTime,
          endTime: r.endTime.length === 8 ? r.endTime.slice(0, 5) : r.endTime,
        })),
      );
      setLoadError(null);
    },
    [t.detailLoadError],
  );

  const load = useCallback(async () => {
    setLoadBusy(true);
    setLoadError(null);
    setNotFound(false);
    try {
      const res = await fetch(`/api/web/employees/${encodeURIComponent(employeeId)}`, {
        credentials: "include",
      });
      const text = await res.text();
      const json = parseResponseJson(text);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) {
        setLoadError(t.detailLoadError);
        return;
      }
      applyLoaded(json);
    } catch {
      setLoadError(t.detailLoadError);
    } finally {
      setLoadBusy(false);
    }
  }, [employeeId, t.detailLoadError, applyLoaded]);

  useEffect(() => {
    void load();
  }, [load]);

  function addSlot() {
    setAvailability((prev) => [
      ...prev,
      {
        clientId: crypto.randomUUID(),
        weekday: 1,
        startTime: "08:00",
        endTime: "17:00",
      },
    ]);
  }

  function removeSlot(clientId: string) {
    setAvailability((prev) => prev.filter((r) => r.clientId !== clientId));
  }

  function patchSlot(clientId: string, patch: Partial<AvailabilityRow>) {
    setAvailability((prev) =>
      prev.map((r) => (r.clientId === clientId ? { ...r, ...patch } : r)),
    );
  }

  function parseCoord(raw: string): number | null {
    const tRaw = raw.trim().replace(",", ".");
    if (tRaw === "") {
      return null;
    }
    const n = Number(tRaw);
    return Number.isFinite(n) ? n : null;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveMsg(null);
    setSaveError(null);

    const latN = parseCoord(latitude);
    const lngN = parseCoord(longitude);
    if ((latN === null) !== (lngN === null)) {
      setSaveError(
        locale === "en"
          ? "Enter both coordinates or neither."
          : "Bitte beide Koordinaten angeben oder leer lassen.",
      );
      return;
    }

    const availabilityPayload: EmployeeAvailabilityRuleInput[] = availability.map(
      (r, idx) => ({
        weekday: r.weekday,
        startTime: r.startTime,
        endTime: r.endTime,
        sortIndex: idx,
      }),
    );

    const body: Record<string, unknown> = {
      displayName: displayName.trim(),
      roleLabel: roleLabel.trim() ? roleLabel.trim() : null,
      notes: notes.trim() ? notes.trim() : null,
      privateAddressLabel: privateLabel.trim() ? privateLabel.trim() : null,
      privateAddressLine2: privateLine2.trim() ? privateLine2.trim() : null,
      privateRecipientName: privateRecipient.trim() ? privateRecipient.trim() : null,
      privateStreet: privateStreet.trim() ? privateStreet.trim() : null,
      privatePostalCode: privatePostal.trim() ? privatePostal.trim() : null,
      privateCity: privateCity.trim() ? privateCity.trim() : null,
      privateCountry: normalizeCountryInput(privateCountry),
      latitude: latN,
      longitude: lngN,
      geocodeSource:
        latN !== null && lngN !== null ? geocodeSource ?? "manual" : null,
      archived,
      availability: availabilityPayload,
    };

    setSaveBusy(true);
    try {
      const res = await fetch(`/api/web/employees/${encodeURIComponent(employeeId)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      const json = parseResponseJson(text);
      if (!res.ok) {
        setSaveError(t.saveError);
        return;
      }
      applyLoaded(json);
      setSaveMsg(t.saved);
    } catch {
      setSaveError(t.saveError);
    } finally {
      setSaveBusy(false);
    }
  }

  if (loadBusy) {
    return <p className="text-sm text-muted-foreground">…</p>;
  }
  if (notFound) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t.detailNotFound}</p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/web/employees/list">{t.backToList}</Link>
        </Button>
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">{loadError}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
          {locale === "en" ? "Retry" : "Erneut versuchen"}
        </Button>
      </div>
    );
  }

  return (
    <form id={formId} onSubmit={(ev) => void handleSave(ev)} className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
          <Link href="/web/employees/list">{t.backToList}</Link>
        </Button>
      </div>

      {saveError ? <p className="text-sm text-destructive">{saveError}</p> : null}
      {saveMsg ? <p className="text-sm text-muted-foreground">{saveMsg}</p> : null}

      <Card className="border-border/80 bg-muted/15 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">{t.sectionMain}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:max-w-xl">
          <div className="grid gap-2">
            <Label htmlFor={`${formId}-name`}>{t.fieldDisplayName}</Label>
            <Input
              id={`${formId}-name`}
              value={displayName}
              onChange={(ev) => setDisplayName(ev.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${formId}-role`}>{t.fieldRole}</Label>
            <Input
              id={`${formId}-role`}
              value={roleLabel}
              onChange={(ev) => setRoleLabel(ev.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${formId}-notes`}>{t.fieldNotes}</Label>
            <Input
              id={`${formId}-notes`}
              value={notes}
              onChange={(ev) => setNotes(ev.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id={`${formId}-arch`}
              checked={archived}
              onCheckedChange={(v) => setArchived(v === true)}
            />
            <Label htmlFor={`${formId}-arch`} className="font-normal">
              {t.archiveLabel}
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">{t.archivedHint}</p>
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-muted/15 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">{t.sectionPrivateAddress}</CardTitle>
          <CardDescription className="text-xs">{t.privacyHint}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CustomerAddressGeocodeControls
            locale={locale}
            defaultQuery={geocodeQuery}
            onApply={(s) => {
              setPrivateRecipient(s.recipientName);
              setPrivateStreet(s.street);
              setPrivatePostal(s.postalCode);
              setPrivateCity(s.city);
              setPrivateCountry(s.country);
              if (s.label?.trim()) {
                setPrivateLabel(s.label.trim());
              }
              if (s.addressLine2?.trim()) {
                setPrivateLine2(s.addressLine2.trim());
              }
              if (s.latitude != null && s.longitude != null) {
                setLatitude(String(s.latitude));
                setLongitude(String(s.longitude));
                setGeocodeSource("ors");
              }
            }}
          />
          <Separator />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor={`${formId}-pal`}>{t.fieldAddressLabel}</Label>
              <Input
                id={`${formId}-pal`}
                value={privateLabel}
                onChange={(ev) => setPrivateLabel(ev.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${formId}-pa2`}>{t.fieldAddressLine2}</Label>
              <Input
                id={`${formId}-pa2`}
                value={privateLine2}
                onChange={(ev) => setPrivateLine2(ev.target.value)}
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor={`${formId}-prec`}>{t.fieldRecipient}</Label>
              <Input
                id={`${formId}-prec`}
                value={privateRecipient}
                onChange={(ev) => setPrivateRecipient(ev.target.value)}
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor={`${formId}-pst`}>{t.fieldStreet}</Label>
              <Input
                id={`${formId}-pst`}
                value={privateStreet}
                onChange={(ev) => setPrivateStreet(ev.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${formId}-pplz`}>{t.fieldPostal}</Label>
              <Input
                id={`${formId}-pplz`}
                value={privatePostal}
                onChange={(ev) => setPrivatePostal(ev.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${formId}-pct`}>{t.fieldCity}</Label>
              <Input
                id={`${formId}-pct`}
                value={privateCity}
                onChange={(ev) => setPrivateCity(ev.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${formId}-pcc`}>{t.fieldCountry}</Label>
              <Input
                id={`${formId}-pcc`}
                value={privateCountry}
                onChange={(ev) => setPrivateCountry(ev.target.value)}
                maxLength={2}
                className="uppercase"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${formId}-lat`}>{t.fieldLatitude}</Label>
              <Input
                id={`${formId}-lat`}
                value={latitude}
                onChange={(ev) => {
                  setLatitude(ev.target.value);
                  setGeocodeSource("manual");
                }}
                inputMode="decimal"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${formId}-lng`}>{t.fieldLongitude}</Label>
              <Input
                id={`${formId}-lng`}
                value={longitude}
                onChange={(ev) => {
                  setLongitude(ev.target.value);
                  setGeocodeSource("manual");
                }}
                inputMode="decimal"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-muted/15 shadow-none">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">{t.sectionAvailability}</CardTitle>
          <Button type="button" variant="secondary" size="sm" onClick={addSlot}>
            {t.addSlot}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {availability.length === 0 ? (
            <p className="text-xs text-muted-foreground">—</p>
          ) : (
            <ul className="space-y-3">
              {availability.map((r) => (
                <li
                  key={r.clientId}
                  className="flex flex-col gap-3 rounded-lg border border-border/60 bg-background/50 p-3 sm:flex-row sm:flex-wrap sm:items-end"
                >
                  <div className="grid gap-2 sm:w-40">
                    <Label>{t.weekdayLabel}</Label>
                    <Select
                      value={String(r.weekday)}
                      onValueChange={(v) =>
                        patchSlot(r.clientId, { weekday: Number(v) })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {weekdays.map((w) => (
                          <SelectItem key={w.value} value={w.value}>
                            {w.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`${formId}-st-${r.clientId}`}>{t.startTime}</Label>
                    <Input
                      id={`${formId}-st-${r.clientId}`}
                      type="time"
                      value={r.startTime}
                      onChange={(ev) =>
                        patchSlot(r.clientId, { startTime: ev.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`${formId}-en-${r.clientId}`}>{t.endTime}</Label>
                    <Input
                      id={`${formId}-en-${r.clientId}`}
                      type="time"
                      value={r.endTime}
                      onChange={(ev) =>
                        patchSlot(r.clientId, { endTime: ev.target.value })
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive sm:ml-auto"
                    onClick={() => removeSlot(r.clientId)}
                  >
                    {t.removeSlot}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={saveBusy}>
          {saveBusy ? t.saving : t.save}
        </Button>
      </div>
    </form>
  );
}
