"use client";

import { useEffect, useId, useMemo, useState } from "react";

import type { EmployeeAvailabilityRuleInput, EmployeeGeocodeSource } from "@repo/api-contracts";
import { employeeDetailResponseSchema } from "@repo/api-contracts";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@repo/ui/accordion";
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
import { Separator } from "@repo/ui/separator";
import { Textarea } from "@repo/ui/textarea";
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
  EMPLOYEE_NOTES_MAX_LENGTH,
  formatEmployeeCreateWizardProgress,
  formatEmployeesNotesCharCount,
  getEmployeeCreateWizardDescription,
  getEmployeesCopy,
  readEmployeeValidationIssues,
  summarizeEmployeeValidationIssues,
  weekdayOptions,
} from "@/content/employees-module";
import { normalizeAddressFields } from "@/lib/address-normalization";
import type { Locale } from "@/lib/i18n/locale";
import { parseResponseJson } from "@/lib/parse-response-json";
import { toast } from "sonner";

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

function normalizeTimeForCompare(t: string): string {
  return t.length >= 8 ? t.slice(0, 5) : t;
}

function timeToMinutes(t: string): number {
  const n = normalizeTimeForCompare(t);
  const parts = n.split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) {
    return NaN;
  }
  return h * 60 + m;
}

function validateAvailabilitySlots(slots: AvailabilityRow[]): {
  timeOrder: boolean;
  overlap: boolean;
} {
  for (const r of slots) {
    const a = timeToMinutes(r.startTime);
    const b = timeToMinutes(r.endTime);
    if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) {
      return { timeOrder: true, overlap: false };
    }
  }
  const byDay = new Map<number, AvailabilityRow[]>();
  for (const r of slots) {
    const list = byDay.get(r.weekday) ?? [];
    list.push(r);
    byDay.set(r.weekday, list);
  }
  for (const [, daySlots] of byDay) {
    const sorted = [...daySlots].sort(
      (x, y) => timeToMinutes(x.startTime) - timeToMinutes(y.startTime),
    );
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]!;
      const cur = sorted[i]!;
      if (timeToMinutes(cur.startTime) < timeToMinutes(prev.endTime)) {
        return { timeOrder: false, overlap: true };
      }
    }
  }
  return { timeOrder: false, overlap: false };
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
  onCreated: (employeeId: string) => void;
}) {
  const t = getEmployeesCopy(locale);
  const formId = useId();
  const liveRegionId = `${formId}-wizard-live`;
  const nameFieldId = `${formId}-name`;
  const weekdays = useMemo(() => weekdayOptions(locale), [locale]);

  const [step, setStep] = useState(0);
  const [liveAnnouncement, setLiveAnnouncement] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [employeeNo, setEmployeeNo] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "ONBOARDING" | "INACTIVE">("ACTIVE");
  const [employmentType, setEmploymentType] = useState<
    "FULL_TIME" | "PART_TIME" | "CONTRACTOR" | "APPRENTICE"
  >("FULL_TIME");
  const [roleLabel, setRoleLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [privateLabel, setPrivateLabel] = useState("");
  const [privateLine2, setPrivateLine2] = useState("");
  const [privateLine2Expanded, setPrivateLine2Expanded] = useState(false);
  const [privateRecipient, setPrivateRecipient] = useState("");
  const [privateRecipientEdited, setPrivateRecipientEdited] = useState(false);
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
    setEmployeeNo("");
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setStatus("ACTIVE");
    setEmploymentType("FULL_TIME");
    setRoleLabel("");
    setNotes("");
    setPrivateLabel(t.defaultAddressLabel);
    setPrivateLine2("");
    setPrivateLine2Expanded(false);
    setPrivateRecipient("");
    setPrivateRecipientEdited(false);
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
  }, [open, t.defaultAddressLabel]);

  useEffect(() => {
    if (!open || privateRecipientEdited) {
      return;
    }
    setPrivateRecipient(displayName.trim());
  }, [displayName, open, privateRecipientEdited]);

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
      setSubmitError(t.coordinatesBothOrNeitherError);
      setStep(1);
      return;
    }

    const slotCheck = validateAvailabilitySlots(availability);
    if (slotCheck.timeOrder) {
      setSubmitError(t.availabilityTimeOrderError);
      setStep(2);
      return;
    }
    if (slotCheck.overlap) {
      setSubmitError(t.availabilityOverlapError);
      setStep(2);
      return;
    }

    const availabilityPayload: EmployeeAvailabilityRuleInput[] = availability.map(
      (r, idx) => ({
        weekday: r.weekday,
        startTime:
          r.startTime.length === 5 ? `${r.startTime}:00` : r.startTime,
        endTime: r.endTime.length === 5 ? `${r.endTime}:00` : r.endTime,
        crossesMidnight: false,
        validFrom: null,
        validTo: null,
        sortIndex: idx,
      }),
    );

    const body = {
      employeeNo: employeeNo.trim() ? employeeNo.trim() : null,
      firstName: firstName.trim() ? firstName.trim() : null,
      lastName: lastName.trim() ? lastName.trim() : null,
      email: email.trim() ? email.trim() : null,
      phone: phone.trim() ? phone.trim() : null,
      status,
      employmentType,
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
        const err =
          typeof json === "object" && json !== null && "error" in json
            ? (json as { error?: string }).error
            : undefined;
        if (err === "employee_no_taken") {
          setSubmitError(t.employeeNoTaken);
          toast.error(t.employeeNoTaken);
          setStep(0);
          return;
        }
        if (res.status === 403 || err === "forbidden") {
          setSubmitError(t.saveForbidden);
          toast.error(t.saveForbidden);
          return;
        }
        if (err === "validation_error") {
          const issues = readEmployeeValidationIssues(json);
          const msg = issues
            ? summarizeEmployeeValidationIssues(issues, t, locale)
            : `${t.saveError} ${t.validationErrorHint}`;
          setSubmitError(msg);
          toast.error(msg);
        } else {
          setSubmitError(t.saveError);
          toast.error(t.saveError);
        }
        return;
      }
      toast.success(t.toastEmployeeCreated);
      onOpenChange(false);
      onCreated(parsed.data.employee.id);
    } catch {
      setSubmitError(t.saveError);
      toast.error(t.saveError);
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
        className="flex max-h-[min(92vh,40rem)] w-[calc(100%-2rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 lg:max-w-3xl"
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
                <div className="grid gap-3">
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
                      required
                      aria-invalid={Boolean(nameError)}
                    />
                    {nameError ? (
                      <p className="text-xs text-destructive" role="alert">
                        {nameError}
                      </p>
                    ) : null}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`${formId}-eno`}>{t.fieldEmployeeNo}</Label>
                    <Input
                      id={`${formId}-eno`}
                      value={employeeNo}
                      onChange={(ev) => setEmployeeNo(ev.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor={`${formId}-fn`}>{t.fieldFirstName}</Label>
                      <Input
                        id={`${formId}-fn`}
                        value={firstName}
                        onChange={(ev) => setFirstName(ev.target.value)}
                        autoComplete="given-name"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`${formId}-ln`}>{t.fieldLastName}</Label>
                      <Input
                        id={`${formId}-ln`}
                        value={lastName}
                        onChange={(ev) => setLastName(ev.target.value)}
                        autoComplete="family-name"
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor={`${formId}-em`}>{t.fieldEmail}</Label>
                      <Input
                        id={`${formId}-em`}
                        value={email}
                        onChange={(ev) => setEmail(ev.target.value)}
                        type="email"
                        autoComplete="email"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`${formId}-ph`}>{t.fieldPhone}</Label>
                      <Input
                        id={`${formId}-ph`}
                        value={phone}
                        onChange={(ev) => setPhone(ev.target.value)}
                        autoComplete="tel"
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor={`${formId}-st`}>{t.fieldStatus}</Label>
                      <Select
                        value={status}
                        onValueChange={(v) =>
                          setStatus(v as "ACTIVE" | "ONBOARDING" | "INACTIVE")
                        }
                      >
                        <SelectTrigger id={`${formId}-st`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ACTIVE">{t.statusActive}</SelectItem>
                          <SelectItem value="ONBOARDING">{t.statusOnboarding}</SelectItem>
                          <SelectItem value="INACTIVE">{t.statusInactive}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`${formId}-et`}>{t.fieldEmploymentType}</Label>
                      <Select
                        value={employmentType}
                        onValueChange={(v) =>
                          setEmploymentType(
                            v as
                              | "FULL_TIME"
                              | "PART_TIME"
                              | "CONTRACTOR"
                              | "APPRENTICE",
                          )
                        }
                      >
                        <SelectTrigger id={`${formId}-et`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FULL_TIME">{t.employmentFullTime}</SelectItem>
                          <SelectItem value="PART_TIME">{t.employmentPartTime}</SelectItem>
                          <SelectItem value="CONTRACTOR">{t.employmentContractor}</SelectItem>
                          <SelectItem value="APPRENTICE">{t.employmentApprentice}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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
                    <Textarea
                      id={`${formId}-notes`}
                      value={notes}
                      onChange={(ev) => setNotes(ev.target.value)}
                      maxLength={EMPLOYEE_NOTES_MAX_LENGTH}
                      rows={4}
                      className="min-h-20 resize-y"
                    />
                    <p className="text-xs text-muted-foreground">
                      {formatEmployeesNotesCharCount(
                        locale,
                        notes.length,
                        EMPLOYEE_NOTES_MAX_LENGTH,
                      )}
                    </p>
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
                    const normalizedAddress = normalizeAddressFields(
                      s.recipientName,
                      s.street,
                    );
                    setPrivateStreet(normalizedAddress.street);
                    setPrivatePostal(s.postalCode);
                    setPrivateCity(s.city);
                    setPrivateCountry(s.country);
                    if (s.addressLine2?.trim() && privateLine2.trim() === "") {
                      setPrivateLine2(s.addressLine2.trim());
                      setPrivateLine2Expanded(true);
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
                  <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor={`${formId}-prec`}>{t.fieldRecipient}</Label>
                    <Input
                      id={`${formId}-prec`}
                      value={privateRecipient}
                      onChange={(ev) => {
                        setPrivateRecipientEdited(true);
                        setPrivateRecipient(ev.target.value);
                      }}
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
                  <div className="sm:col-span-2">
                    <Accordion
                      type="single"
                      collapsible
                      value={privateLine2Expanded ? "address-line-2" : undefined}
                      onValueChange={(value) =>
                        setPrivateLine2Expanded(value === "address-line-2")
                      }
                      className="w-full rounded-lg border border-border/60 bg-muted/10 px-3"
                    >
                      <AccordionItem value="address-line-2" className="border-none">
                        <AccordionTrigger className="py-2.5 text-sm font-medium hover:no-underline">
                          {privateLine2Expanded ? t.addressLine2Hide : t.addressLine2Show}
                        </AccordionTrigger>
                        <AccordionContent className="pb-0">
                          <div className="grid gap-2 pb-3">
                            <Label htmlFor={`${formId}-pa2`} className="sr-only">
                              {t.fieldAddressLine2}
                            </Label>
                            <Input
                              id={`${formId}-pa2`}
                              value={privateLine2}
                              onChange={(ev) => setPrivateLine2(ev.target.value)}
                              placeholder={t.addressLine2Placeholder}
                            />
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
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
                  <p className="text-xs text-muted-foreground">{t.availabilityEmpty}</p>
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
