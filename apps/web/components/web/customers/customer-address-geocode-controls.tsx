"use client";

import { useId } from "react";
import { Label } from "@repo/ui/label";

import { getCustomersGeocodeCopy } from "@/content/customers-module";
import type { Locale } from "@/lib/i18n/locale";

import { WebGeocodeLookup } from "@/components/web/address/web-geocode-lookup";

export type GeocodeApplyPayload = {
  recipientName: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  label: string | null;
  addressLine2: string | null;
  latitude: number | null;
  longitude: number | null;
};

type CustomerAddressGeocodeControlsProps = {
  locale: Locale;
  /** Suchtext, z. B. aus den aktuellen Feldern vorbefüllt */
  defaultQuery?: string;
  onApply: (s: GeocodeApplyPayload) => void;
};

export function CustomerAddressGeocodeControls({
  locale,
  defaultQuery = "",
  onApply,
}: CustomerAddressGeocodeControlsProps) {
  const qId = useId();
  const g = getCustomersGeocodeCopy(locale);

  return (
    <div className="grid gap-2 rounded-lg border border-dashed bg-muted/20 p-3">
      <div className="grid gap-1">
        <Label className="text-xs font-medium text-muted-foreground" htmlFor={qId}>
          {g.lookupLabel}
        </Label>
        <p className="text-xs text-muted-foreground">{g.lookupHint}</p>
      </div>
      <WebGeocodeLookup
        defaultQuery={defaultQuery}
        copy={{
          placeholder: g.queryPlaceholder,
          locateTitle: g.locateTitle,
          notConfiguredHint: g.notConfiguredHint,
          autoFilledHint: g.autoFilledHint,
          locateUnsupported: g.locateUnsupported,
          locateDenied: g.locateDenied,
          locateUnavailable: g.locateUnavailable,
          locateTimeout: g.locateTimeout,
          locateFailed: g.locateFailed,
        }}
        onApply={(s) => {
          onApply({
            recipientName: s.recipientName,
            street: s.street,
            postalCode: s.postalCode,
            city: s.city,
            country: s.country,
            label: s.label,
            addressLine2: s.addressLine2,
            latitude: s.latitude,
            longitude: s.longitude,
          });
        }}
      />
    </div>
  );
}
