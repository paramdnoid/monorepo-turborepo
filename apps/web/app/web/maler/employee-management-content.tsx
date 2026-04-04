"use client";

import Link from "next/link";
import { Info } from "lucide-react";

import type { Locale } from "@/lib/i18n/locale";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/alert";
import { Badge } from "@repo/ui/badge";
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

type DemoEmployee = {
  id: string;
  name: string;
  role: string;
  tags: string[];
};

const DEMO_TEAM: DemoEmployee[] = [
  {
    id: "e1",
    name: "Anna Schmidt",
    role: "Fachkraft",
    tags: ["Lack", "Fassade"],
  },
  {
    id: "e2",
    name: "Jonas Weber",
    role: "Geselle",
    tags: ["Innen", "Spachtel"],
  },
  {
    id: "e3",
    name: "Mira Öztürk",
    role: "Azubi",
    tags: ["Innen"],
  },
];

export function EmployeeManagementContent({ locale }: { locale: Locale }) {
  const previewNote =
    locale === "en"
      ? "Preview — connect HR data and permissions here later."
      : "Vorschau — später Stammdaten und Berechtigungen anbinden.";

  const roadmap =
    locale === "en"
      ? "Scheduling will build on this data. Later we plan to model dependencies between employees (e.g. apprentice paired with a journeyman, or multi-person site rules)."
      : "Die Terminplanung baut auf diesen Daten auf. Spaeter sollen Abhaengigkeiten zwischen Mitarbeitenden abbildbar sein (z. B. Azubi mit Gesellen, Zwei-Mann-Regeln auf der Baustelle).";

  const tableHeaders =
    locale === "en"
      ? { name: "Name", role: "Role", tags: "Qualifications" }
      : { name: "Name", role: "Rolle", tags: "Qualifikationen" };

  const schedulingLabel = locale === "en" ? "Scheduling" : "Terminplanung";

  return (
    <div className="w-full min-w-0 space-y-6">
      <Alert className="border-primary/20 bg-primary/5">
        <Info className="text-primary" aria-hidden="true" />
        <AlertTitle>
          {locale === "en" ? "Roadmap" : "Ausblick"}
        </AlertTitle>
        <AlertDescription className="space-y-2 text-muted-foreground">
          <p>{roadmap}</p>
          <p>
            <Link
              href="/web/maler/scheduling"
              className="font-medium text-primary underline underline-offset-4 hover:text-foreground"
            >
              {locale === "en"
                ? "Open scheduling module"
                : "Zur Terminplanung"}
            </Link>
            <span className="text-muted-foreground">
              {" "}
              ({schedulingLabel})
            </span>
          </p>
        </AlertDescription>
      </Alert>

      <Card className="border-border/80 bg-muted/15 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">
            {locale === "en" ? "Team (demo)" : "Team (Demo)"}
          </CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            {previewNote}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tableHeaders.name}</TableHead>
                <TableHead>{tableHeaders.role}</TableHead>
                <TableHead className="hidden sm:table-cell">
                  {tableHeaders.tags}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {DEMO_TEAM.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.role}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {row.tags.map((t) => (
                        <Badge key={t} variant="secondary">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-4 text-xs text-muted-foreground">{previewNote}</p>
        </CardContent>
      </Card>
    </div>
  );
}
