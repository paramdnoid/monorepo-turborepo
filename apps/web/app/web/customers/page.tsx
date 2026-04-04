import { redirect } from "next/navigation";

/** Frueher Modul-Landing; Stammdaten starten direkt bei der Kundenliste. */
export default function CustomersRootRedirectPage() {
  redirect("/web/customers/list");
}
