"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Info, Loader2, Locate, MapPin, Search, X } from "lucide-react";

import { Input } from "@repo/ui/input";

import type { GeocodeSuggestionPayload } from "@/lib/geocode-suggestion";

export type WebGeocodeLookupCopy = {
  placeholder: string;
  locateTitle: string;
  notConfiguredHint: string;
  autoFilledHint: string;
  locateUnsupported: string;
  locateDenied: string;
  locateUnavailable: string;
  locateTimeout: string;
  locateFailed: string;
};

export type WebGeocodeLookupProps = {
  defaultQuery?: string;
  copy: WebGeocodeLookupCopy;
  onApply: (
    suggestion: GeocodeSuggestionPayload,
    meta: { source: "search" | "gps" },
  ) => void;
  geocodeUrl?: string;
  className?: string;
};

function suggestionSummary(s: GeocodeSuggestionPayload): string {
  const line1 = [s.street, `${s.postalCode} ${s.city}`.trim()]
    .filter(Boolean)
    .join(", ");
  const head = s.recipientName.trim() || line1;
  return head.length > 120 ? `${head.slice(0, 117)}…` : head;
}

export function WebGeocodeLookup({
  defaultQuery = "",
  copy,
  onApply,
  geocodeUrl = "/api/web/geocode",
  className,
}: WebGeocodeLookupProps) {
  const [query, setQuery] = useState(defaultQuery);
  const [suggestions, setSuggestions] = useState<GeocodeSuggestionPayload[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [autoFilled, setAutoFilled] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(defaultQuery);
  }, [defaultQuery]);

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

  const runLookup = useCallback(
    (nextQuery: string) => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      const q = nextQuery.trim();
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
              `${geocodeUrl}?${new URLSearchParams({ q })}`,
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
              setConfigured(false);
              setSuggestions([]);
              setShowSuggestions(false);
              return;
            }
            setConfigured(true);
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
    },
    [geocodeUrl],
  );

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setAutoFilled(false);
    setGpsError(null);
    runLookup(value);
  };

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError(copy.locateUnsupported);
      return;
    }

    setIsLocating(true);
    setGpsError(null);

    const onSuccess = (position: GeolocationPosition) => {
      void (async () => {
        try {
          const { latitude: lat, longitude: lon } = position.coords;
          const res = await fetch(
            `${geocodeUrl}?${new URLSearchParams({
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
            setGpsError(copy.locateFailed);
            return;
          }
          if (data.configured === false) {
            setConfigured(false);
            setGpsError(copy.locateFailed);
            return;
          }
          setConfigured(true);
          if (data.upstreamError) {
            setGpsError(copy.locateFailed);
            return;
          }
          const list = Array.isArray(data.suggestions) ? data.suggestions : [];
          const first = list[0];
          if (!first) {
            setGpsError(copy.locateFailed);
            return;
          }
          const applied: GeocodeSuggestionPayload = {
            ...first,
            latitude: lat,
            longitude: lon,
          };
          setAutoFilled(true);
          setQuery(suggestionSummary(applied));
          setSuggestions([]);
          setShowSuggestions(false);
          onApply(applied, { source: "gps" });
        } catch {
          setGpsError(copy.locateFailed);
        } finally {
          setIsLocating(false);
        }
      })();
    };

    const onError = (error: GeolocationPositionError, retried = false) => {
      if (!retried && error.code === error.TIMEOUT) {
        navigator.geolocation.getCurrentPosition(
          onSuccess,
          (retryErr) => onError(retryErr, true),
          { enableHighAccuracy: false, timeout: 15_000, maximumAge: 60_000 },
        );
        return;
      }

      setIsLocating(false);
      switch (error.code) {
        case error.PERMISSION_DENIED:
          setGpsError(copy.locateDenied);
          break;
        case error.POSITION_UNAVAILABLE:
          setGpsError(copy.locateUnavailable);
          break;
        case error.TIMEOUT:
          setGpsError(copy.locateTimeout);
          break;
        default:
          setGpsError(copy.locateFailed);
      }
    };

    navigator.geolocation.getCurrentPosition(onSuccess, (err) => onError(err), {
      enableHighAccuracy: true,
      timeout: 10_000,
      maximumAge: 0,
    });
  }, [
    copy.locateDenied,
    copy.locateFailed,
    copy.locateTimeout,
    copy.locateUnavailable,
    copy.locateUnsupported,
    geocodeUrl,
    onApply,
  ]);

  return (
    <div className={className ?? ""}>
      <div className="relative" ref={suggestionsRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" />
          <Input
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder={copy.placeholder}
            className="pl-9 pr-18"
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            autoComplete="off"
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {isSearching ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : query.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setSuggestions([]);
                  setShowSuggestions(false);
                  setAutoFilled(false);
                  setGpsError(null);
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
              title={copy.locateTitle}
              aria-label={copy.locateTitle}
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
                  setAutoFilled(true);
                  setQuery(suggestionSummary(s));
                  setSuggestions([]);
                  setShowSuggestions(false);
                  onApply(s, { source: "search" });
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

      {configured === false ? (
        <div className="mt-2 rounded-lg border border-dashed border-muted-foreground/25 bg-muted/15 p-3">
          <p className="text-xs text-muted-foreground">{copy.notConfiguredHint}</p>
        </div>
      ) : null}

      {gpsError ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {gpsError}
        </p>
      ) : null}

      {autoFilled ? (
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
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
    </div>
  );
}

