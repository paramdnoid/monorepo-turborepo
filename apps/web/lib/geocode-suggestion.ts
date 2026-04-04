/** Antwortzeile für `/api/web/geocode` — serverseitig aus OpenRouteService gemappt. */
export type GeocodeSuggestionPayload = {
  recipientName: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  label: string | null;
  addressLine2: string | null;
  /** WGS84; null wenn keine Point-Geometrie in der ORS-Antwort. */
  latitude: number | null;
  longitude: number | null;
};
