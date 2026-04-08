"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { getOrganizationBrandingCopy } from "@/content/organization-branding";
import type { MeOrganization } from "@repo/api-contracts";
import { Button } from "@repo/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@repo/ui/field";
import { Input } from "@repo/ui/input";

import { useWebApp } from "@/components/web/shell/web-app-context";
import {
  splitStreetAndHouseNumber,
  WebPlaceLookupFields,
  type WebPlaceLookupFieldsCopy,
} from "@/components/web/settings/web-place-lookup-fields";

export function WebOrganizationBrandingCard() {
  const { session } = useWebApp();
  const copy = getOrganizationBrandingCopy(session.locale);

  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [org, setOrg] = useState<MeOrganization | null>(null);

  const [name, setName] = useState("");
  const [senderStreet, setSenderStreet] = useState("");
  const [senderHouseNumber, setSenderHouseNumber] = useState("");
  const [senderPostalCode, setSenderPostalCode] = useState("");
  const [senderCity, setSenderCity] = useState("");
  const [senderCountry, setSenderCountry] = useState("DE");
  const [senderLatitude, setSenderLatitude] = useState<number | null>(null);
  const [senderLongitude, setSenderLongitude] = useState<number | null>(null);
  const [vatId, setVatId] = useState("");
  const [taxNumber, setTaxNumber] = useState("");

  const [pending, startTransition] = useTransition();
  const [logoBusy, setLogoBusy] = useState(false);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  const placeFieldsCopy: WebPlaceLookupFieldsCopy = useMemo(() => {
    const c = getOrganizationBrandingCopy(session.locale);
    return {
      placeholder: c.senderAddressSearchPlaceholder,
      locateTitle: c.senderAddressLocateTitle,
      notConfiguredHint: c.senderAddressNotConfiguredHint,
      autoFilledHint: c.senderAddressAutoFilledHint,
      locateUnsupported: c.senderAddressLocateUnsupported,
      locateDenied: c.senderAddressLocateDenied,
      locateUnavailable: c.senderAddressLocateUnavailable,
      locateTimeout: c.senderAddressLocateTimeout,
      locateFailed: c.senderAddressLocateFailed,
      streetLabel: c.senderStreet,
      houseNumberLabel: c.senderHouseNumber,
      postalCodeLabel: c.senderPostalCode,
      cityLabel: c.senderCity,
      countryLabel: c.senderCountry,
      coordinatesLabel: c.senderCoordinatesLabel,
    };
  }, [session.locale]);

  const refresh = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/web/organization", { cache: "no-store" });
      const json: unknown = await res.json();
      if (!res.ok) {
        setLoadError(
          typeof json === "object" &&
            json !== null &&
            "error" in json &&
            typeof (json as { error?: unknown }).error === "string"
            ? (json as { error: string }).error
            : copy.loadFailed,
        );
        setLoaded(true);
        return;
      }
      const o =
        typeof json === "object" &&
        json !== null &&
        "organization" in json &&
        (json as { organization: MeOrganization }).organization;
      if (!o) {
        setLoadError(copy.loadFailed);
        setLoaded(true);
        return;
      }
      setOrg(o);
      setName(o.name);
      const streetRaw = o.senderStreet ?? "";
      const houseRaw = o.senderHouseNumber ?? "";
      const split =
        streetRaw.trim() !== "" && houseRaw.trim() === ""
          ? splitStreetAndHouseNumber(streetRaw)
          : { street: streetRaw, houseNumber: houseRaw };
      setSenderStreet(split.street);
      setSenderHouseNumber(split.houseNumber);
      setSenderPostalCode(o.senderPostalCode ?? "");
      setSenderCity(o.senderCity ?? "");
      setSenderCountry((o.senderCountry ?? "DE").toUpperCase().slice(0, 2));
      setSenderLatitude(o.senderLatitude ?? null);
      setSenderLongitude(o.senderLongitude ?? null);
      setVatId(o.vatId ?? "");
      setTaxNumber(o.taxNumber ?? "");
      setLoaded(true);
    } catch {
      setLoadError(copy.loadFailed);
      setLoaded(true);
    }
  }, [copy.loadFailed]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function handleSave() {
    startTransition(() => {
      void (async () => {
        if (name.trim().length === 0) {
          toast.error(copy.nameRequired);
          return;
        }
        const anyAddressTextField =
          senderStreet.trim() !== "" ||
          senderHouseNumber.trim() !== "" ||
          senderPostalCode.trim() !== "" ||
          senderCity.trim() !== "";
        const hasCoreAddress =
          senderStreet.trim() !== "" &&
          senderPostalCode.trim().length >= 4 &&
          senderCity.trim() !== "";
        if (anyAddressTextField && !hasCoreAddress) {
          toast.error(copy.senderAddressIncompleteError);
          return;
        }
        const countryNormalized = senderCountry.trim()
          ? senderCountry.trim().toUpperCase().slice(0, 2)
          : "";
        const patch = {
          name: name.trim(),
          senderStreet: hasCoreAddress ? senderStreet.trim() : null,
          senderHouseNumber:
            hasCoreAddress && senderHouseNumber.trim() !== ""
              ? senderHouseNumber.trim()
              : null,
          senderPostalCode: hasCoreAddress ? senderPostalCode.trim() : null,
          senderCity: hasCoreAddress ? senderCity.trim() : null,
          senderCountry:
            hasCoreAddress && countryNormalized !== "" ? countryNormalized : null,
          senderLatitude: hasCoreAddress ? senderLatitude : null,
          senderLongitude: hasCoreAddress ? senderLongitude : null,
          vatId: vatId.trim() === "" ? null : vatId.trim(),
          taxNumber: taxNumber.trim() === "" ? null : taxNumber.trim(),
        };
        try {
          const res = await fetch("/api/web/organization", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
          });
          const json: unknown = await res.json();
          if (!res.ok) {
            toast.error(copy.saveFailed);
            return;
          }
          const nextOrg =
            typeof json === "object" &&
            json !== null &&
            "organization" in json
              ? (json as { organization: MeOrganization }).organization
              : null;
          if (nextOrg) setOrg(nextOrg);
          toast.success(copy.saved);
        } catch {
          toast.error(copy.saveFailed);
        }
      })();
    });
  }

  async function handleLogoPick(file: File | undefined) {
    if (!file) return;
    setLogoBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/web/organization/logo", {
        method: "POST",
        body: fd,
      });
      const json: unknown = await res.json();
      if (!res.ok) {
        toast.error(copy.uploadFailed);
        return;
      }
      const nextOrg =
        typeof json === "object" &&
        json !== null &&
        "organization" in json
          ? (json as { organization: MeOrganization }).organization
          : null;
      if (nextOrg) setOrg(nextOrg);
      toast.success(copy.saved);
    } catch {
      toast.error(copy.uploadFailed);
    } finally {
      setLogoBusy(false);
    }
  }

  async function handleClearLogo() {
    setLogoBusy(true);
    try {
      const res = await fetch("/api/web/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearLogo: true }),
      });
      const json: unknown = await res.json();
      if (!res.ok) {
        toast.error(copy.saveFailed);
        return;
      }
      const nextOrg =
        typeof json === "object" &&
        json !== null &&
        "organization" in json
          ? (json as { organization: MeOrganization }).organization
          : null;
      if (nextOrg) setOrg(nextOrg);
      toast.success(copy.saved);
    } catch {
      toast.error(copy.saveFailed);
    } finally {
      setLogoBusy(false);
    }
  }

  if (!loaded) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{copy.cardTitle}</CardTitle>
          <CardDescription>{copy.cardDescription}</CardDescription>
        </CardHeader>
        <CardContent
          className="flex items-center gap-2 text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
          {copy.loading}
        </CardContent>
      </Card>
    );
  }

  if (loadError || org === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{copy.cardTitle}</CardTitle>
          <CardDescription>{copy.cardDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive" role="alert">
            {loadError ?? copy.loadFailed}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            onClick={() => void refresh()}
          >
            {copy.retry}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.cardTitle}</CardTitle>
        <CardDescription>{copy.cardDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="org-trade">{session.locale === "en" ? "Trade" : "Handwerk (Slug)"}</FieldLabel>
            <FieldContent>
              <Input
                id="org-trade"
                readOnly
                value={org.tradeSlug}
                className="bg-muted/30"
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="org-name">{copy.companyName}</FieldLabel>
            <FieldContent>
              <Input
                id="org-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="organization"
              />
              <FieldDescription>{copy.companyNameHint}</FieldDescription>
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel>{copy.senderAddress}</FieldLabel>
            <FieldContent className="space-y-4">
              <FieldDescription>{copy.senderAddressHint}</FieldDescription>
              <WebPlaceLookupFields
                idPrefix="org-sender"
                copy={placeFieldsCopy}
                value={{
                  street: senderStreet,
                  houseNumber: senderHouseNumber,
                  postalCode: senderPostalCode,
                  city: senderCity,
                  country: senderCountry,
                  latitude: senderLatitude,
                  longitude: senderLongitude,
                }}
                onChange={(next) => {
                  setSenderStreet(next.street);
                  setSenderHouseNumber(next.houseNumber);
                  setSenderPostalCode(next.postalCode);
                  setSenderCity(next.city);
                  setSenderCountry(next.country);
                  setSenderLatitude(next.latitude);
                  setSenderLongitude(next.longitude);
                }}
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="org-vat">{copy.vatId}</FieldLabel>
            <FieldContent>
              <Input
                id="org-vat"
                value={vatId}
                onChange={(e) => setVatId(e.target.value)}
                autoComplete="off"
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="org-tax">{copy.taxNumber}</FieldLabel>
            <FieldContent>
              <Input
                id="org-tax"
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value)}
                autoComplete="off"
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="org-logo-file">{copy.logoLabel}</FieldLabel>
            <FieldContent className="flex flex-col gap-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  ref={logoFileInputRef}
                  id="org-logo-file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  tabIndex={-1}
                  disabled={logoBusy}
                  className="sr-only"
                  aria-describedby="org-logo-hint"
                  onChange={(e) =>
                    void handleLogoPick(e.target.files?.[0] ?? undefined)
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={logoBusy}
                  onClick={() => logoFileInputRef.current?.click()}
                >
                  {copy.uploadLogo}
                </Button>
                {org.hasLogo ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={logoBusy}
                    onClick={() => void handleClearLogo()}
                  >
                    {logoBusy ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : null}
                    {copy.clearLogo}
                  </Button>
                ) : null}
              </div>
              <FieldDescription id="org-logo-hint">
                {copy.logoHint}
              </FieldDescription>
            </FieldContent>
          </Field>
          {org.hasLogo ? (
            <div className="rounded-md border border-border bg-muted/20 p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                {copy.logoLabel}
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/api/web/organization/logo"
                alt={copy.logoPreviewAlt}
                className="max-h-16 w-auto max-w-48 object-contain object-left"
              />
            </div>
          ) : null}
          <p className="text-xs text-muted-foreground">{copy.legalHint}</p>
        </FieldGroup>
      </CardContent>
      <CardFooter className="justify-end border-t bg-muted/30">
        <Button
          type="button"
          onClick={handleSave}
          disabled={pending || logoBusy}
        >
          {pending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : null}
          {pending ? copy.saving : copy.save}
        </Button>
      </CardFooter>
    </Card>
  );
}
