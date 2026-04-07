"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { Info, Loader2, Locate, MapPin, Search, X } from "lucide-react";
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
import { Label } from "@repo/ui/label";

import { useWebApp } from "@/components/web/shell/web-app-context";
import type { GeocodeSuggestionPayload } from "@/lib/geocode-suggestion";

function formatAddressParts(
  street: string,
  houseNumber: string,
  postalCode: string,
  city: string,
): string {
  const parts = [
    [street, houseNumber].filter(Boolean).join(" "),
    [postalCode, city].filter(Boolean).join(" "),
  ].filter(Boolean);
  return parts.join(", ");
}

function splitStreetAndHouseNumber(raw: string): {
  street: string;
  houseNumber: string;
} {
  const t = raw.trim();
  if (!t) return { street: "", houseNumber: "" };
  const lead = /^(\d+[a-zA-Z0-9/-]*)\s+(.+)$/.exec(t);
  if (lead) {
    return { street: (lead[2] ?? "").trim(), houseNumber: (lead[1] ?? "").trim() };
  }
  const tail = /^(.+?)\s+(\d+[a-zA-Z0-9/-]*)$/.exec(t);
  if (tail) {
    return { street: (tail[1] ?? "").trim(), houseNumber: (tail[2] ?? "").trim() };
  }
  return { street: t, houseNumber: "" };
}

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

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeocodeSuggestionPayload[]>([]);
  const [geocodeConfigured, setGeocodeConfigured] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [autoFilled, setAutoFilled] = useState(false);

  const [pending, startTransition] = useTransition();
  const [logoBusy, setLogoBusy] = useState(false);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

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
      setSearchQuery(
        formatAddressParts(
          split.street,
          split.houseNumber,
          o.senderPostalCode ?? "",
          o.senderCity ?? "",
        ),
      );
      setSuggestions([]);
      setShowSuggestions(false);
      setGpsError(null);
      setGeocodeConfigured(true);
      setAutoFilled(false);
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

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const searchAddress = useCallback((query: string) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    const q = query.trim();
    if (q.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    searchTimeout.current = setTimeout(() => {
      void (async () => {
        setIsSearching(true);
        try {
          const res = await fetch(
            `/api/web/geocode?${new URLSearchParams({ q })}`,
            { credentials: "include" },
          );
          const json: unknown = await res.json().catch(() => null);
          const data = json as {
            configured?: boolean;
            suggestions?: GeocodeSuggestionPayload[];
            upstreamError?: boolean;
          } | null;
          if (!res.ok || !data) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
          }
          if (data.configured === false) {
            setGeocodeConfigured(false);
            setSuggestions([]);
            setShowSuggestions(false);
            return;
          }
          setGeocodeConfigured(true);
          if (data.upstreamError) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
          }
          const list = Array.isArray(data.suggestions) ? data.suggestions : [];
          setSuggestions(list);
          setShowSuggestions(list.length > 0);
        } catch {
          setSuggestions([]);
          setShowSuggestions(false);
        } finally {
          setIsSearching(false);
        }
      })();
    }, 350);
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    searchAddress(value);
  };

  function suggestionSummary(s: GeocodeSuggestionPayload): string {
    const line1 = [s.street, `${s.postalCode} ${s.city}`.trim()]
      .filter(Boolean)
      .join(", ");
    const head = s.recipientName.trim() || line1;
    return head.length > 120 ? `${head.slice(0, 117)}…` : head;
  }

  function applySuggestion(
    s: GeocodeSuggestionPayload,
    coordsOverride?: { latitude: number; longitude: number },
  ) {
    const split = splitStreetAndHouseNumber(s.street);
    setSenderStreet(split.street);
    setSenderHouseNumber(split.houseNumber);
    setSenderPostalCode(s.postalCode);
    setSenderCity(s.city);
    setSenderCountry((s.country || "DE").toUpperCase().slice(0, 2));
    const lat = coordsOverride?.latitude ?? s.latitude ?? null;
    const lon = coordsOverride?.longitude ?? s.longitude ?? null;
    setSenderLatitude(lat);
    setSenderLongitude(lon);
    setAutoFilled(true);
    setShowSuggestions(false);
    setGpsError(null);
    setSearchQuery(
      formatAddressParts(split.street, split.houseNumber, s.postalCode, s.city),
    );
  }

  const applyReverseGeocode = useCallback(
    async (lat: number, lon: number) => {
      const res = await fetch(
        `/api/web/geocode?${new URLSearchParams({
          lat: String(lat),
          lon: String(lon),
        })}`,
        { credentials: "include" },
      );
      const json: unknown = await res.json().catch(() => null);
      const data = json as {
        configured?: boolean;
        suggestions?: GeocodeSuggestionPayload[];
        upstreamError?: boolean;
      } | null;
      if (!res.ok || !data) {
        throw new Error("reverse_geocode_failed");
      }
      if (data.configured === false) {
        setGeocodeConfigured(false);
        throw new Error("reverse_geocode_unconfigured");
      }
      setGeocodeConfigured(true);
      if (data.upstreamError) {
        throw new Error("reverse_geocode_upstream_error");
      }
      const list = Array.isArray(data.suggestions) ? data.suggestions : [];
      const first = list[0];
      if (!first) {
        throw new Error("reverse_geocode_no_suggestion");
      }
      applySuggestion(first, { latitude: lat, longitude: lon });
    },
    [],
  );

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError(copy.senderAddressLocateUnsupported);
      return;
    }

    setIsLocating(true);
    setGpsError(null);

    const onSuccess = (position: GeolocationPosition) => {
      void (async () => {
        try {
          const { latitude: lat, longitude: lon } = position.coords;
          setSenderLatitude(lat);
          setSenderLongitude(lon);
          await applyReverseGeocode(lat, lon);
        } catch {
          setGpsError(copy.senderAddressLocateFailed);
        } finally {
          setIsLocating(false);
        }
      })();
    };

    const onError = (error: GeolocationPositionError, retried = false) => {
      if (!retried && error.code === error.TIMEOUT) {
        navigator.geolocation.getCurrentPosition(
          onSuccess,
          (retryErr) => {
            onError(retryErr, true);
          },
          { enableHighAccuracy: false, timeout: 15_000, maximumAge: 60_000 },
        );
        return;
      }

      setIsLocating(false);
      switch (error.code) {
        case error.PERMISSION_DENIED:
          setGpsError(copy.senderAddressLocateDenied);
          break;
        case error.POSITION_UNAVAILABLE:
          setGpsError(copy.senderAddressLocateUnavailable);
          break;
        case error.TIMEOUT:
          setGpsError(copy.senderAddressLocateTimeout);
          break;
        default:
          setGpsError(copy.senderAddressLocateFailed);
      }
    };

    navigator.geolocation.getCurrentPosition(
      onSuccess,
      (err) => onError(err),
      {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 0,
      },
    );
  }, [
    applyReverseGeocode,
    copy.senderAddressLocateDenied,
    copy.senderAddressLocateFailed,
    copy.senderAddressLocateTimeout,
    copy.senderAddressLocateUnavailable,
    copy.senderAddressLocateUnsupported,
  ]);

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

              <div className="relative" ref={suggestionsRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder={copy.senderAddressSearchPlaceholder}
                    className="pl-9 pr-18"
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  />
                  <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                    {isSearching ? (
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    ) : searchQuery.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          setSuggestions([]);
                          setShowSuggestions(false);
                        }}
                        className="rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                        aria-label="Clear address search"
                      >
                        <X className="size-4" />
                      </button>
                    ) : null}
                    <div className="mx-0.5 h-4 w-px bg-border" />
                    <button
                      type="button"
                      onClick={handleLocateMe}
                      disabled={isLocating}
                      className="rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-primary disabled:opacity-50"
                      title={copy.senderAddressLocateTitle}
                      aria-label={copy.senderAddressLocateTitle}
                    >
                      {isLocating ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Locate className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                {showSuggestions ? (
                  <div className="absolute inset-x-0 top-full z-20 mt-1.5 overflow-hidden rounded-xl border border-border bg-popover shadow-elevated">
                    {suggestions.map((s, idx) => (
                      <button
                        key={`${s.street}-${s.postalCode}-${idx}`}
                        type="button"
                        onClick={() => {
                          applySuggestion(s);
                          setSuggestions([]);
                          setShowSuggestions(false);
                        }}
                        className="flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
                      >
                        <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span className="line-clamp-2 text-foreground">
                          {suggestionSummary(s)}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {geocodeConfigured === false ? (
                <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/15 p-3">
                  <p className="text-xs text-muted-foreground">
                    {copy.senderAddressNotConfiguredHint}
                  </p>
                </div>
              ) : null}

              {gpsError ? (
                <p className="text-sm text-destructive" role="alert">
                  {gpsError}
                </p>
              ) : null}

              {autoFilled ? (
                <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
                  <Info className="size-4 shrink-0" />
                  <span>{copy.senderAddressAutoFilledHint}</span>
                  <button
                    type="button"
                    onClick={() => setAutoFilled(false)}
                    className="ml-auto rounded-sm p-0.5 transition-colors hover:text-primary/70"
                    aria-label="Dismiss auto-filled hint"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="org-sender-street">{copy.senderStreet}</Label>
                  <Input
                    id="org-sender-street"
                    value={senderStreet}
                    onChange={(e) => {
                      setSenderStreet(e.target.value);
                      setAutoFilled(false);
                    }}
                    placeholder="Musterstrasse"
                    className={autoFilled ? "border-primary/30 bg-primary/5" : ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-sender-house">{copy.senderHouseNumber}</Label>
                  <Input
                    id="org-sender-house"
                    value={senderHouseNumber}
                    onChange={(e) => {
                      setSenderHouseNumber(e.target.value);
                      setAutoFilled(false);
                    }}
                    placeholder="12a"
                    className={autoFilled ? "border-primary/30 bg-primary/5" : ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-sender-postal">{copy.senderPostalCode}</Label>
                  <Input
                    id="org-sender-postal"
                    value={senderPostalCode}
                    onChange={(e) => {
                      setSenderPostalCode(e.target.value);
                      setAutoFilled(false);
                    }}
                    placeholder="10115"
                    inputMode="numeric"
                    maxLength={32}
                    className={autoFilled ? "border-primary/30 bg-primary/5" : ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-sender-city">{copy.senderCity}</Label>
                  <Input
                    id="org-sender-city"
                    value={senderCity}
                    onChange={(e) => {
                      setSenderCity(e.target.value);
                      setAutoFilled(false);
                    }}
                    placeholder="Berlin"
                    className={autoFilled ? "border-primary/30 bg-primary/5" : ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-sender-country">{copy.senderCountry}</Label>
                  <Input
                    id="org-sender-country"
                    value={senderCountry}
                    onChange={(e) => {
                      setSenderCountry(e.target.value);
                      setAutoFilled(false);
                    }}
                    maxLength={2}
                    autoComplete="off"
                    spellCheck={false}
                    className={`max-w-20 uppercase ${autoFilled ? "border-primary/30 bg-primary/5" : ""}`}
                  />
                </div>
              </div>

              {senderLatitude != null && senderLongitude != null ? (
                <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  <Locate className="size-3.5" />
                  <span>
                    {copy.senderCoordinatesLabel}: {senderLatitude.toFixed(5)},{" "}
                    {senderLongitude.toFixed(5)}
                  </span>
                </div>
              ) : null}
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
