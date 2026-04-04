"use client";

import { createContext, useContext } from "react";

import type { WebPermissionMatrix } from "@/lib/auth/web-permissions";
import type { Locale } from "@/lib/i18n/locale";

export type WebShellSession = {
  name: string;
  email: string;
  avatar: string;
  /** Zweite Zeile unter dem Logo, z. B. „HANDWERK. Kaminfeger“. */
  brandTagline: string;
  /** Handwerk / Zunft aus dem Token, falls vorhanden. */
  tradeSlug: string | null;
  /** UI-Sprache (Server), u. a. für Maler-Modul-Navigation. */
  locale: Locale;
  /** Aus Rollen abgeleitete Modulrechte (view/edit/delete/export/batch). */
  permissions: WebPermissionMatrix;
};

export type WebAppContextValue = {
  session: WebShellSession;
  logout: () => Promise<void>;
  logoutBusy: boolean;
  logoutError: string | null;
};

const WebAppContext = createContext<WebAppContextValue | null>(null);

export function WebAppProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: WebAppContextValue;
}) {
  return (
    <WebAppContext.Provider value={value}>{children}</WebAppContext.Provider>
  );
}

export function useWebApp(): WebAppContextValue {
  const ctx = useContext(WebAppContext);
  if (!ctx) {
    throw new Error("useWebApp muss innerhalb von WebAppProvider verwendet werden.");
  }
  return ctx;
}
