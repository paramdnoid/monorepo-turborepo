"use client";

import { createContext, useContext } from "react";

export type WebShellSession = {
  name: string;
  email: string;
  avatar: string;
  /** Zweite Zeile unter dem Logo, z. B. „HANDWERK. Kaminfeger“. */
  brandTagline: string;
  /** Handwerk / Zunft aus dem Token, falls vorhanden. */
  tradeSlug: string | null;
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
