import "hono";

declare module "hono" {
  interface ContextVariableMap {
    requestId: string;
    /** Gesetzt, sobald die Auth-Middleware erfolgreich war. */
    auth?: { sub: string; tenantId: string };
    /** Gesetzt, sobald die Org-Middleware eine Zeile gefunden hat. */
    organization?: {
      id: string;
      tenantId: string;
      name: string;
      tradeSlug: string;
      createdAt: Date;
    };
  }
}
