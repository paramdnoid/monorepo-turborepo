"use client";

import { useEffect, useState } from "react";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";

import { getCustomersGeocodeCopy } from "@/content/customers-module";
import type { Locale } from "@/lib/i18n/locale";

import type { GeocodeSuggestionPayload } from "@/lib/geocode-suggestion";

export type GeocodeApplyPayload = {
  recipientName: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  label: string | null;
  addressLine2: string | null;
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
  const g = getCustomersGeocodeCopy(locale);
  const [query, setQuery] = useState(defaultQuery);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [configured, setConfigured] = useState(true);
  const [suggestions, setSuggestions] = useState<GeocodeSuggestionPayload[]>(
    [],
  );

  useEffect(() => {
    setQuery(defaultQuery);
  }, [defaultQuery]);

  async function runLookup() {
    setMsg(null);
    setSuggestions([]);
    const q = query.trim();
    if (q.length < 2) {
      setMsg(g.noneFound);
      return;
    }
    setBusy(true);
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
        setMsg(g.failed);
        return;
      }
      if (data.configured === false) {
        setConfigured(false);
        return;
      }
      setConfigured(true);
      const list = Array.isArray(data.suggestions) ? data.suggestions : [];
      if (data.upstreamError) {
        setMsg(g.failed);
        return;
      }
      if (list.length === 0) {
        setMsg(g.noneFound);
        return;
      }
      setSuggestions(list);
    } catch {
      setMsg(g.failed);
    } finally {
      setBusy(false);
    }
  }

  if (configured === false) {
    return null;
  }

  return (
    <div className="grid gap-2 rounded-lg border border-dashed bg-muted/20 p-3">
      <div className="grid gap-1">
        <Label className="text-xs font-medium text-muted-foreground">
          {g.lookupLabel}
        </Label>
        <p className="text-xs text-muted-foreground">{g.lookupHint}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={locale === "en" ? "Street, city …" : "Strasse, Ort …"}
          className="min-w-[200px] flex-1"
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={() => void runLookup()}
        >
          {g.lookupButton}
        </Button>
      </div>
      {msg ? <p className="text-xs text-muted-foreground">{msg}</p> : null}
      {suggestions.length > 0 ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => {
            const first = suggestions[0];
            if (first) {
              onApply({
                recipientName: first.recipientName,
                street: first.street,
                postalCode: first.postalCode,
                city: first.city,
                country: first.country,
                label: first.label,
                addressLine2: first.addressLine2,
              });
              setSuggestions([]);
              setMsg(null);
            }
          }}
        >
          {g.applyFirst}
        </Button>
      ) : null}
    </div>
  );
}
