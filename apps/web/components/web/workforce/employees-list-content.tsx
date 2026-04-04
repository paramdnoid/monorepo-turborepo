"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { employeesListResponseSchema } from "@repo/api-contracts";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/table";

import { EmployeesCreateDialog } from "@/components/web/workforce/employees-create-dialog";
import { getEmployeesCopy } from "@/content/employees-module";
import type { Locale } from "@/lib/i18n/locale";
import { parseResponseJson } from "@/lib/parse-response-json";

export function EmployeesListContent({ locale }: { locale: Locale }) {
  const t = getEmployeesCopy(locale);
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<
    { id: string; displayName: string; roleLabel: string | null; city: string | null; hasGeo: boolean }[]
  >([]);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/web/employees", { credentials: "include" });
      const text = await res.text();
      const json = parseResponseJson(text);
      const parsed = employeesListResponseSchema.safeParse(json);
      if (!res.ok || !parsed.success) {
        setError(t.loadError);
        setRows([]);
        return;
      }
      setRows(parsed.data.employees);
    } catch {
      setError(t.loadError);
      setRows([]);
    } finally {
      setBusy(false);
    }
  }, [t.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <EmployeesCreateDialog
        locale={locale}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => void load()}
      />
      <Card className="border-border/80 bg-muted/15 shadow-none">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">{t.listTitle}</CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              {t.listDescription}
            </CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => setCreateOpen(true)}
          >
            {t.addEmployee}
          </Button>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="mb-4 text-sm text-destructive">{error}</p>
          ) : null}
          {busy ? (
            <p className="text-sm text-muted-foreground">…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.empty}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.tableName}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t.tableRole}</TableHead>
                  <TableHead className="hidden md:table-cell">{t.tableCity}</TableHead>
                  <TableHead className="w-[1%] whitespace-nowrap text-right">
                    {t.tableGeo}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/web/employees/${r.id}`}
                        className="text-primary underline underline-offset-4 hover:text-foreground"
                      >
                        {r.displayName}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {r.roleLabel ?? "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {r.city ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={r.hasGeo ? "secondary" : "outline"}>
                        {r.hasGeo ? t.geoYes : t.geoNo}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
