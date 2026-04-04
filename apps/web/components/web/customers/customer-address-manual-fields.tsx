"use client";

import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";

import { getCustomersDetailCopy } from "@/content/customers-module";
import type { Locale } from "@/lib/i18n/locale";

export type CustomerAddressManualValues = {
  label: string;
  line2: string;
  recipient: string;
  street: string;
  postal: string;
  city: string;
  country: string;
};

type CustomerAddressManualFieldsProps = {
  locale: Locale;
  idPrefix: string;
  values: CustomerAddressManualValues;
  onChange: (patch: Partial<CustomerAddressManualValues>) => void;
  countryClassName?: string;
  /** Native `required` fuer Stammdaten-Pflichtfelder (z. B. Adress-Dialog Bearbeiten). */
  requireCoreAddressFields?: boolean;
};

export function CustomerAddressManualFields({
  locale,
  idPrefix,
  values,
  onChange,
  countryClassName,
  requireCoreAddressFields = false,
}: CustomerAddressManualFieldsProps) {
  const d = getCustomersDetailCopy(locale);
  const p = idPrefix;

  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor={`${p}-al`}>{d.addressLabel}</Label>
        <Input
          id={`${p}-al`}
          value={values.label}
          onChange={(e) => onChange({ label: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${p}-a2`}>{d.addressLine2}</Label>
        <Input
          id={`${p}-a2`}
          value={values.line2}
          onChange={(e) => onChange({ line2: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${p}-ar`}>{d.recipientName}</Label>
        <Input
          id={`${p}-ar`}
          value={values.recipient}
          onChange={(e) => onChange({ recipient: e.target.value })}
          required={requireCoreAddressFields}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${p}-st`}>{d.street}</Label>
        <Input
          id={`${p}-st`}
          value={values.street}
          onChange={(e) => onChange({ street: e.target.value })}
          required={requireCoreAddressFields}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-2">
          <Label htmlFor={`${p}-plz`}>{d.postalCode}</Label>
          <Input
            id={`${p}-plz`}
            value={values.postal}
            onChange={(e) => onChange({ postal: e.target.value })}
            autoComplete="postal-code"
            inputMode="numeric"
            required={requireCoreAddressFields}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${p}-ci`}>{d.city}</Label>
          <Input
            id={`${p}-ci`}
            value={values.city}
            onChange={(e) => onChange({ city: e.target.value })}
            required={requireCoreAddressFields}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${p}-land`}>{d.country}</Label>
        <Input
          id={`${p}-land`}
          value={values.country}
          onChange={(e) => onChange({ country: e.target.value })}
          maxLength={2}
          autoComplete="off"
          spellCheck={false}
          className={countryClassName ?? "uppercase"}
          required={requireCoreAddressFields}
        />
      </div>
    </>
  );
}
