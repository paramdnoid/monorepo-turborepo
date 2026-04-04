/** Antwortzeile für `/api/web/geocode` — serverseitig aus OpenRouteService gemappt. */
export type GeocodeSuggestionPayload = {
  recipientName: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  label: string | null;
  addressLine2: string | null;
};
