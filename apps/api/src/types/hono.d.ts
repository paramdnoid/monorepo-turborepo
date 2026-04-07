import "hono";

declare module "hono" {
  interface ContextVariableMap {
    requestId: string;
    /** Gesetzt, sobald die Auth-Middleware erfolgreich war. */
    auth?: { sub: string; tenantId: string; roles: string[] };
    /** Gesetzt, sobald die Org-Middleware eine Zeile gefunden hat. */
    organization?: {
      id: string;
      tenantId: string;
      name: string;
      tradeSlug: string;
      senderAddress: string | null;
      senderStreet: string | null;
      senderHouseNumber: string | null;
      senderPostalCode: string | null;
      senderCity: string | null;
      senderCountry: string | null;
      senderLatitude: number | null;
      senderLongitude: number | null;
      vatId: string | null;
      taxNumber: string | null;
      logoStorageRelativePath: string | null;
      logoContentType: string | null;
      createdAt: Date;
    };
  }
}
