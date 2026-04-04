import Link from "next/link";

import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";

import { getServerLocale } from "@/lib/i18n/server-locale";

export default async function WebNotFound() {
  const locale = await getServerLocale();
  const en = locale === "en";

  return (
    <div className="w-full min-w-0 space-y-6">
      <Card className="border-border/80 bg-muted/15 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">
            {en ? "Page not found in /web" : "Seite in /web nicht gefunden"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {en
              ? "The requested page does not exist anymore, was moved, or the path is invalid."
              : "Die angeforderte Seite existiert nicht mehr, wurde verschoben oder der Pfad ist ungueltig."}
          </p>

          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/web">{en ? "Go to dashboard" : "Zur Uebersicht"}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/web/sales/quotes">
                {en ? "Open sales" : "Sales oeffnen"}
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/web/customers/list">
                {en ? "Open customers" : "Kunden oeffnen"}
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/web/scheduling">
                {en ? "Open scheduling" : "Planung oeffnen"}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
