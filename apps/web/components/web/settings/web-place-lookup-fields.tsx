"use client";

import { useCallback, useEffect, useState } from "react";
import { Info, Locate, X } from "lucide-react";

import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";

import {
  WebGeocodeLookup,
  type WebGeocodeLookupCopy,
} from "@/components/web/address/web-geocode-lookup";
import type { GeocodeSuggestionPayload } from "@/lib/geocode-suggestion";

export type WebPlaceLookupValue = {
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
};

export type WebPlaceLookupFieldsCopy = WebGeocodeLookupCopy & {
  streetLabel: string;
  houseNumberLabel: string;
  postalCodeLabel: string;
  cityLabel: string;
  countryLabel: string;
  coordinatesLabel: string;
};

export type WebPlaceLookupFieldsProps = {
  value: WebPlaceLookupValue;
  onChange: (next: WebPlaceLookupValue) => void;
  copy: WebPlaceLookupFieldsCopy;
  geocodeUrl?: string;
  /** Prefix for input ids (per screen) */
  idPrefix: string;
  className?: string;
};

export function formatPlaceAddressParts(
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

export function splitStreetAndHouseNumber(raw: string): {
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

function suggestionToPlace(s: GeocodeSuggestionPayload): WebPlaceLookupValue {
  const split = splitStreetAndHouseNumber(s.street);
  return {
    street: split.street,
    houseNumber: split.houseNumber,
    postalCode: s.postalCode,
    city: s.city,
    country: (s.country || "DE").toUpperCase().slice(0, 2),
    latitude: s.latitude ?? null,
    longitude: s.longitude ?? null,
  };
}

export function WebPlaceLookupFields({
  value,
  onChange,
  copy,
  geocodeUrl = "/api/web/geocode",
  idPrefix,
  className,
}: WebPlaceLookupFieldsProps) {
  const [searchDefault, setSearchDefault] = useState(() =>
    formatPlaceAddressParts(
      value.street,
      value.houseNumber,
      value.postalCode,
      value.city,
    ),
  );
  const [autoFilled, setAutoFilled] = useState(false);

  useEffect(() => {
    setSearchDefault(
      formatPlaceAddressParts(
        value.street,
        value.houseNumber,
        value.postalCode,
        value.city,
      ),
    );
  }, [
    value.street,
    value.houseNumber,
    value.postalCode,
    value.city,
  ]);

  const handleApply = useCallback(
    (s: GeocodeSuggestionPayload) => {
      const next = suggestionToPlace(s);
      onChange(next);
      setSearchDefault(
        formatPlaceAddressParts(
          next.street,
          next.houseNumber,
          next.postalCode,
          next.city,
        ),
      );
      setAutoFilled(true);
    },
    [onChange],
  );

  const clearAutoFillHighlight = useCallback(() => {
    setAutoFilled(false);
  }, []);

  return (
    <div className={className ?? "space-y-4"}>
      <WebGeocodeLookup
        copy={copy}
        geocodeUrl={geocodeUrl}
        defaultQuery={searchDefault}
        onApply={handleApply}
      />

      {autoFilled ? (
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
          <Info className="size-4 shrink-0" />
          <span>{copy.autoFilledHint}</span>
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
          <Label htmlFor={`${idPrefix}-street`}>{copy.streetLabel}</Label>
          <Input
            id={`${idPrefix}-street`}
            value={value.street}
            onChange={(e) => {
              onChange({ ...value, street: e.target.value });
              clearAutoFillHighlight();
            }}
            placeholder="Musterstrasse"
            autoComplete="street-address"
            className={autoFilled ? "border-primary/30 bg-primary/5" : ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-house`}>{copy.houseNumberLabel}</Label>
          <Input
            id={`${idPrefix}-house`}
            value={value.houseNumber}
            onChange={(e) => {
              onChange({ ...value, houseNumber: e.target.value });
              clearAutoFillHighlight();
            }}
            placeholder="12a"
            className={autoFilled ? "border-primary/30 bg-primary/5" : ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-postal`}>{copy.postalCodeLabel}</Label>
          <Input
            id={`${idPrefix}-postal`}
            value={value.postalCode}
            onChange={(e) => {
              onChange({ ...value, postalCode: e.target.value });
              clearAutoFillHighlight();
            }}
            placeholder="10115"
            inputMode="numeric"
            maxLength={32}
            className={autoFilled ? "border-primary/30 bg-primary/5" : ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-city`}>{copy.cityLabel}</Label>
          <Input
            id={`${idPrefix}-city`}
            value={value.city}
            onChange={(e) => {
              onChange({ ...value, city: e.target.value });
              clearAutoFillHighlight();
            }}
            placeholder="Berlin"
            autoComplete="address-level2"
            className={autoFilled ? "border-primary/30 bg-primary/5" : ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-country`}>{copy.countryLabel}</Label>
          <Input
            id={`${idPrefix}-country`}
            value={value.country}
            onChange={(e) => {
              onChange({ ...value, country: e.target.value });
              clearAutoFillHighlight();
            }}
            maxLength={2}
            autoComplete="off"
            spellCheck={false}
            className={`max-w-20 uppercase ${autoFilled ? "border-primary/30 bg-primary/5" : ""}`}
          />
        </div>
      </div>

      {value.latitude != null && value.longitude != null ? (
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <Locate className="size-3.5" />
          <span>
            {copy.coordinatesLabel}: {value.latitude.toFixed(5)},{" "}
            {value.longitude.toFixed(5)}
          </span>
        </div>
      ) : null}
    </div>
  );
}
