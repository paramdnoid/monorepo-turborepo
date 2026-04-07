"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";

import { Button } from "@repo/ui/button";

import { getSalesTableCopy } from "@/content/sales-module";
import { useWebShellHeaderActions } from "@/components/web/shell/web-shell-header-actions";
import type { Locale } from "@/lib/i18n/locale";

export function SalesOpenInvoicesHeaderActions({ locale }: { locale: Locale }) {
  const { setHeaderActions } = useWebShellHeaderActions();
  const copy = getSalesTableCopy(locale);

  const actions = useMemo(
    () => (
      <Button variant="ghost" size="sm" asChild>
        <Link href="/web/sales/invoices">{copy.backToList}</Link>
      </Button>
    ),
    [copy.backToList],
  );

  useEffect(() => {
    setHeaderActions(actions);
    return () => setHeaderActions(null);
  }, [actions, setHeaderActions]);

  return null;
}

