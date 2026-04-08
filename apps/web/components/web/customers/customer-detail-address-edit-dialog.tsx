"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CUSTOMER_ADDRESS_KIND_OPTIONS,
  type CustomerAddressKind,
  type CustomerDetail,
} from "@repo/api-contracts";
import { Button } from "@repo/ui/button";
import { Checkbox } from "@repo/ui/checkbox";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/dialog";
import { Label } from "@repo/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import { Separator } from "@repo/ui/separator";

import {
  getCustomersDetailCopy,
  getCustomersKindLabel,
} from "@/content/customers-module";
import type { Locale } from "@/lib/i18n/locale";

import {
  CustomerAddressManualFields,
  type CustomerAddressManualValues,
} from "./customer-address-manual-fields";
import { CustomerAddressGeocodeControls } from "./customer-address-geocode-controls";

export type CustomerAddressEditDialogContentProps = {
  locale: Locale;
  address: CustomerDetail["addresses"][number];
  onDismiss: () => void;
  onPatch: (patch: Record<string, unknown>) => void;
};

export function CustomerAddressEditDialogContent({
  locale,
  address,
  onDismiss,
  onPatch,
}: CustomerAddressEditDialogContentProps) {
  const copy = getCustomersDetailCopy(locale);
  const [kind, setKind] = useState<CustomerAddressKind>(address.kind);
  const [label, setLabel] = useState(address.label ?? "");
  const [addressLine2, setAddressLine2] = useState(address.addressLine2 ?? "");
  const [recipientName, setRecipientName] = useState(address.recipientName);
  const [street, setStreet] = useState(address.street);
  const [postalCode, setPostalCode] = useState(address.postalCode);
  const [city, setCity] = useState(address.city);
  const [country, setCountry] = useState(address.country);
  const [isDefault, setIsDefault] = useState(address.isDefault);
  const [geoLatitude, setGeoLatitude] = useState<number | null>(
    address.latitude ?? null,
  );
  const [geoLongitude, setGeoLongitude] = useState<number | null>(
    address.longitude ?? null,
  );
  const [geoSource, setGeoSource] = useState<
    CustomerDetail["addresses"][number]["geocodeSource"]
  >(address.geocodeSource ?? null);
  const [geoDirty, setGeoDirty] = useState(false);

  const manualValues: CustomerAddressManualValues = useMemo(
    () => ({
      label,
      line2: addressLine2,
      recipient: recipientName,
      street,
      postal: postalCode,
      city,
      country,
    }),
    [
      label,
      addressLine2,
      recipientName,
      street,
      postalCode,
      city,
      country,
    ],
  );

  const cardGeocodeQuery = useMemo(
    () => [street, postalCode, city].filter(Boolean).join(", ").trim(),
    [street, postalCode, city],
  );

  useEffect(() => {
    setKind(address.kind);
    setLabel(address.label ?? "");
    setAddressLine2(address.addressLine2 ?? "");
    setRecipientName(address.recipientName);
    setStreet(address.street);
    setPostalCode(address.postalCode);
    setCity(address.city);
    setCountry(address.country);
    setIsDefault(address.isDefault);
    setGeoLatitude(address.latitude ?? null);
    setGeoLongitude(address.longitude ?? null);
    setGeoSource(address.geocodeSource ?? null);
    setGeoDirty(false);
  }, [address]);

  function onManualChange(patch: Partial<CustomerAddressManualValues>) {
    if (patch.label !== undefined) setLabel(patch.label);
    if (patch.line2 !== undefined) setAddressLine2(patch.line2);
    if (patch.recipient !== undefined) setRecipientName(patch.recipient);
    if (patch.street !== undefined) setStreet(patch.street);
    if (patch.postal !== undefined) setPostalCode(patch.postal);
    if (patch.city !== undefined) setCity(patch.city);
    if (patch.country !== undefined) setCountry(patch.country);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const hasCoords = geoLatitude != null && geoLongitude != null;
    onPatch({
      kind,
      label: label.trim() === "" ? null : label.trim(),
      addressLine2:
        addressLine2.trim() === "" ? null : addressLine2.trim(),
      recipientName: recipientName.trim(),
      street: street.trim(),
      postalCode: postalCode.trim(),
      city: city.trim(),
      country: country.trim().toUpperCase().slice(0, 2),
      isDefault,
      ...(geoDirty
        ? {
            latitude: hasCoords ? geoLatitude : null,
            longitude: hasCoords ? geoLongitude : null,
            geocodeSource: hasCoords ? (geoSource ?? "ors") : null,
          }
        : {}),
    });
  }

  const idPrefix = `edit-${address.id.slice(0, 8)}`;

  return (
    <DialogContent
      showCloseButton
      className="max-h-[min(90vh,52rem)] gap-0 overflow-y-auto p-0 sm:max-w-xl"
    >
      <DialogHeader className="space-y-2 p-6 pb-2">
        <DialogTitle>{copy.addressDialogEditTitle}</DialogTitle>
        <DialogDescription>{copy.addressDialogEditDescription}</DialogDescription>
      </DialogHeader>
      <Separator />
      <form onSubmit={handleSave} className="space-y-4 p-6">
        <CustomerAddressGeocodeControls
          locale={locale}
          defaultQuery={cardGeocodeQuery}
          onApply={(s) => {
            setRecipientName(s.recipientName);
            setStreet(s.street);
            setPostalCode(s.postalCode);
            setCity(s.city);
            setCountry(s.country);
            if (s.label?.trim()) {
              setLabel(s.label.trim());
            }
            if (s.addressLine2?.trim()) {
              setAddressLine2(s.addressLine2.trim());
            }
            const hasCoords = s.latitude != null && s.longitude != null;
            setGeoLatitude(hasCoords ? s.latitude : null);
            setGeoLongitude(hasCoords ? s.longitude : null);
            setGeoSource(hasCoords ? "ors" : null);
            setGeoDirty(true);
          }}
        />
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}-kind`}>{copy.addressKind}</Label>
          <Select
            value={kind}
            onValueChange={(v) => setKind(v as CustomerAddressKind)}
          >
            <SelectTrigger id={`${idPrefix}-kind`} className="w-full max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CUSTOMER_ADDRESS_KIND_OPTIONS.map((k) => (
                <SelectItem key={k} value={k}>
                  {getCustomersKindLabel(locale, k)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <CustomerAddressManualFields
          locale={locale}
          idPrefix={idPrefix}
          values={manualValues}
          onChange={onManualChange}
          countryClassName="max-w-20 uppercase"
          requireCoreAddressFields
        />
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox
            checked={isDefault}
            onCheckedChange={(v) => setIsDefault(v === true)}
          />
          {copy.defaultForKind}
        </label>
        <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onDismiss}>
            {copy.cancel}
          </Button>
          <Button type="submit" size="sm">
            {copy.saveAddress}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
