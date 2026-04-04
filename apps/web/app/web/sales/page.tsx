import { redirect } from "next/navigation";

/** Frueher Modul-Landing; Belege starten direkt bei den Angeboten. */
export default function SalesRootRedirectPage() {
  redirect("/web/sales/quotes");
}
