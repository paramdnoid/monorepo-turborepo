"use client";

import { useEffect, useId, useState } from "react";
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
  latitude: number | null;
  longitude: number | null;
};

type CustomerAddressGeocodeControlsProps = {
  locale: Locale;
  /** Suchtext, z. B. aus den aktuellen Feldern vorbefüllt */
  defaultQuery?: string;
  onApply: (s: GeocodeApplyPayload) => void;
};

function suggestionSummary(s: GeocodeSuggestionPayload): string {
  const line1 = [s.street, `${s.postalCode} ${s.city}`.trim()]
    .filter(Boolean)
    .join(", ");
  const head = s.recipientName.trim() || line1;
  return head.length > 120 ? `${head.slice(0, 117)}…` : head;
}

export function CustomerAddressGeocodeControls({
  locale,
  defaultQuery = "",
  onApply,
}: CustomerAddressGeocodeControlsProps) {
  const qId = useId();
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
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/15 p-3">
        <p className="text-xs text-muted-foreground">{g.notConfiguredHint}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-2 rounded-lg border border-dashed bg-muted/20 p-3">
      <div className="grid gap-1">
        <Label className="text-xs font-medium text-muted-foreground" htmlFor={qId}>
          {g.lookupLabel}
        </Label>
        <p className="text-xs text-muted-foreground">{g.lookupHint}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Input
          id={qId}
          name="geocodeQuery"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={g.queryPlaceholder}
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
      {msg ? (
        <p
          className="text-xs text-muted-foreground"
          aria-live="polite"
          aria-atomic="true"
        >
          {msg}
        </p>
      ) : null}
      {suggestions.length > 0 ? (
        <div className="grid gap-2">
          <p className="text-xs font-medium text-muted-foreground">
            {g.suggestionsHeading}
          </p>
          <ul className="grid max-h-48 gap-1 overflow-y-auto pr-1">
            {suggestions.map((s, idx) => (
              <li key={`${s.street}-${s.postalCode}-${idx}`}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-auto min-h-9 w-full whitespace-normal py-2 text-left text-xs font-normal"
                  onClick={() => {
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
                    setSuggestions([]);
                    setMsg(null);
                  }}
                >
                  <span className="flex w-full items-start justify-between gap-2">
                    <span className="line-clamp-2">{suggestionSummary(s)}</span>
                    <span className="shrink-0 font-medium text-primary">
                      {g.applyThis}
                    </span>
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
