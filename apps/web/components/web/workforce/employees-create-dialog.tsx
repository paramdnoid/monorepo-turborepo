"use client";

import { useEffect, useId, useMemo, useState } from "react";

import type { EmployeeAvailabilityRuleInput, EmployeeGeocodeSource } from "@repo/api-contracts";
import { employeeDetailResponseSchema } from "@repo/api-contracts";
import { Button } from "@repo/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

import { CustomerAddressGeocodeControls } from "@/components/web/customers/customer-address-geocode-controls";
import {
  EMPLOYEE_CREATE_WIZARD_STEP_COUNT,
  formatEmployeeCreateWizardProgress,
  getEmployeeCreateWizardDescription,
  getEmployeesCopy,
  weekdayOptions,
} from "@/content/employees-module";
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

function parseCoord(raw: string): number | null {
  const tRaw = raw.trim().replace(",", ".");
  if (tRaw === "") {
    return null;
  }
  const n = Number(tRaw);
  return Number.isFinite(n) ? n : null;
}

function stepSectionHeading(
  t: ReturnType<typeof getEmployeesCopy>,
  stepIndex: number,
): string {
  if (stepIndex === 0) {
    return t.sectionMain;
  }
  if (stepIndex === 1) {
    return t.sectionPrivateAddress;
  }
  return t.sectionAvailability;
}

export function EmployeesCreateDialog({
  locale,
  open,
  onOpenChange,
  onCreated,
}: {
  locale: Locale;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const t = getEmployeesCopy(locale);
  const formId = useId();
  const liveRegionId = `${formId}-wizard-live`;
  const nameFieldId = `${formId}-name`;
  const weekdays = useMemo(() => weekdayOptions(locale), [locale]);

  const [step, setStep] = useState(0);
  const [liveAnnouncement, setLiveAnnouncement] = useState("");

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
  const [availability, setAvailability] = useState<AvailabilityRow[]>([]);

  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const geocodeQuery = useMemo(() => {
    const parts = [
      privateStreet.trim(),
      privatePostal.trim(),
      privateCity.trim(),
      privateCountry.trim(),
    ].filter(Boolean);
    return parts.join(", ");
  }, [privateStreet, privatePostal, privateCity, privateCountry]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setStep(0);
    setDisplayName("");
    setRoleLabel("");
    setNotes("");
    setPrivateLabel("");
    setPrivateLine2("");
    setPrivateRecipient("");
    setPrivateStreet("");
    setPrivatePostal("");
    setPrivateCity("");
    setPrivateCountry("");
    setLatitude("");
    setLongitude("");
    setGeocodeSource(null);
    setAvailability([]);
    setSubmitError(null);
    setNameError(null);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const progress = formatEmployeeCreateWizardProgress(locale, step);
    const heading = stepSectionHeading(t, step);
    setLiveAnnouncement(`${progress}: ${heading}`);
  }, [open, step, locale, t]);

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

  function handleNext() {
    if (step === 0) {
      if (!displayName.trim()) {
        setNameError(t.createNameRequired);
        queueMicrotask(() => document.getElementById(nameFieldId)?.focus());
        return;
      }
      setNameError(null);
    }
    setStep((s) => Math.min(s + 1, EMPLOYEE_CREATE_WIZARD_STEP_COUNT - 1));
  }

  function handleBack() {
    setSubmitError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!displayName.trim()) {
      setNameError(t.createNameRequired);
      setStep(0);
      queueMicrotask(() => document.getElementById(nameFieldId)?.focus());
      return;
    }
    setNameError(null);

    const latN = parseCoord(latitude);
    const lngN = parseCoord(longitude);
    if ((latN === null) !== (lngN === null)) {
      setSubmitError(
        locale === "en"
          ? "Enter both coordinates or neither."
          : "Bitte beide Koordinaten angeben oder leer lassen.",
      );
      setStep(1);
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

    const body = {
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
      availability: availabilityPayload,
    };

    setSubmitBusy(true);
    try {
      const res = await fetch("/api/web/employees", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      const json = parseResponseJson(text);
      const parsed = employeeDetailResponseSchema.safeParse(json);
      if (!res.ok || !parsed.success) {
        setSubmitError(t.saveError);
        return;
      }
      onOpenChange(false);
      onCreated();
    } catch {
      setSubmitError(t.saveError);
    } finally {
      setSubmitBusy(false);
    }
  }

  const stepDescription = getEmployeeCreateWizardDescription(locale, step);
  const progressLine = formatEmployeeCreateWizardProgress(locale, step);
  const sectionTitle = stepSectionHeading(t, step);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex max-h-[min(92vh,40rem)] w-[calc(100%-2rem)] max-w-xl flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        <form
          className="flex max-h-[min(92vh,40rem)] flex-col"
          onSubmit={(ev) => void handleSubmit(ev)}
        >
          <DialogHeader className="space-y-2 border-b border-border/60 p-5 pb-3 sm:p-6 sm:pb-4">
            <DialogTitle>{t.createDialogTitle}</DialogTitle>
            <DialogDescription>{stepDescription}</DialogDescription>
            <p
              className="text-xs font-medium text-muted-foreground"
              aria-hidden="true"
            >
              {progressLine}
              <span className="text-foreground/80">
                {" "}
                — {sectionTitle}
              </span>
            </p>
            <p id={liveRegionId} className="sr-only" aria-live="polite">
              {liveAnnouncement}
            </p>
          </DialogHeader>

          <div className="min-h-0 max-h-[min(52vh,24rem)] overflow-y-auto px-5 py-3 sm:px-6 sm:py-4">
            {submitError ? (
              <p className="mb-3 text-sm text-destructive" role="alert">
                {submitError}
              </p>
            ) : null}

            {step === 0 ? (
              <section
                aria-labelledby={`${formId}-sec-main`}
                className="space-y-3"
              >
                <h2
                  id={`${formId}-sec-main`}
                  className="text-sm font-medium leading-none"
                >
                  {t.sectionMain}
                </h2>
                <div className="grid gap-3 sm:max-w-lg">
                  <div className="grid gap-2">
                    <Label htmlFor={nameFieldId}>{t.fieldDisplayName}</Label>
                    <Input
                      id={nameFieldId}
                      value={displayName}
                      onChange={(ev) => {
                        setDisplayName(ev.target.value);
                        if (nameError) {
                          setNameError(null);
                        }
                      }}
                      autoComplete="name"
                    />
                    {nameError ? (
                      <p className="text-xs text-destructive" role="alert">
                        {nameError}
                      </p>
                    ) : null}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`${formId}-role`}>{t.fieldRole}</Label>
                    <Input
                      id={`${formId}-role`}
                      value={roleLabel}
                      onChange={(ev) => setRoleLabel(ev.target.value)}
                      autoComplete="organization-title"
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
                </div>
              </section>
            ) : null}

            {step === 1 ? (
              <section
                aria-labelledby={`${formId}-sec-addr`}
                className="space-y-3"
              >
                <div>
                  <h2
                    id={`${formId}-sec-addr`}
                    className="text-sm font-medium leading-none"
                  >
                    {t.sectionPrivateAddress}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t.privacyHint}
                  </p>
                </div>
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
                <div className="grid gap-3 sm:grid-cols-2">
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
                      autoComplete="postal-code"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`${formId}-pct`}>{t.fieldCity}</Label>
                    <Input
                      id={`${formId}-pct`}
                      value={privateCity}
                      onChange={(ev) => setPrivateCity(ev.target.value)}
                      autoComplete="address-level2"
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
                      autoComplete="country"
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
              </section>
            ) : null}

            {step === 2 ? (
              <section
                aria-labelledby={`${formId}-sec-avail`}
                className="space-y-3"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h2
                    id={`${formId}-sec-avail`}
                    className="text-sm font-medium leading-none"
                  >
                    {t.sectionAvailability}
                  </h2>
                  <Button type="button" variant="secondary" size="sm" onClick={addSlot}>
                    {t.addSlot}
                  </Button>
                </div>
                {availability.length === 0 ? (
                  <p className="text-xs text-muted-foreground">—</p>
                ) : (
                  <ul className="space-y-3">
                    {availability.map((r) => (
                      <li
                        key={r.clientId}
                        className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/10 p-3 sm:flex-row sm:flex-wrap sm:items-end"
                      >
                        <div className="grid gap-2 sm:w-40">
                          <Label htmlFor={`${formId}-wd-${r.clientId}`}>
                            {t.weekdayLabel}
                          </Label>
                          <Select
                            value={String(r.weekday)}
                            onValueChange={(v) =>
                              patchSlot(r.clientId, { weekday: Number(v) })
                            }
                          >
                            <SelectTrigger
                              id={`${formId}-wd-${r.clientId}`}
                              className="w-full"
                            >
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
                          <Label htmlFor={`${formId}-st-${r.clientId}`}>
                            {t.startTime}
                          </Label>
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
                          <Label htmlFor={`${formId}-en-${r.clientId}`}>
                            {t.endTime}
                          </Label>
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
              </section>
            ) : null}
          </div>

          <DialogFooter className="flex flex-col gap-2 border-t border-border/60 p-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2 sm:p-6">
            <Button
              type="button"
              variant="outline"
              disabled={submitBusy}
              className="w-full sm:w-auto"
              onClick={() => onOpenChange(false)}
            >
              {t.cancel}
            </Button>
            <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:justify-end">
              {step > 0 ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={submitBusy}
                  className="w-full sm:w-auto"
                  onClick={handleBack}
                >
                  {t.wizardBack}
                </Button>
              ) : null}
              {step < EMPLOYEE_CREATE_WIZARD_STEP_COUNT - 1 ? (
                <Button
                  type="button"
                  disabled={submitBusy}
                  className="w-full sm:w-auto"
                  onClick={handleNext}
                >
                  {t.wizardNext}
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={submitBusy}
                  className="w-full sm:w-auto"
                >
                  {submitBusy ? t.adding : t.createSubmit}
                </Button>
              )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
