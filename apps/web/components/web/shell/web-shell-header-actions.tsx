"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

type WebShellHeaderActionsContextValue = {
  setHeaderActions: (actions: ReactNode | null) => void;
};

const WebShellHeaderActionsContext =
  createContext<WebShellHeaderActionsContextValue | null>(null);

export function WebShellHeaderActionsProvider({
  children,
  setHeaderActions,
}: {
  children: ReactNode;
  setHeaderActions: (actions: ReactNode | null) => void;
}) {
  const value = useMemo(
    () => ({ setHeaderActions }),
    [setHeaderActions],
  );

  return (
    <WebShellHeaderActionsContext.Provider value={value}>
      {children}
    </WebShellHeaderActionsContext.Provider>
  );
}

export function useWebShellHeaderActions(): WebShellHeaderActionsContextValue {
  const ctx = useContext(WebShellHeaderActionsContext);
  if (!ctx) {
    throw new Error(
      "useWebShellHeaderActions muss innerhalb von WebShellHeaderActionsProvider verwendet werden.",
    );
  }
  return ctx;
}

