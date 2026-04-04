import { redirect } from "next/navigation";

/** Standardliste unter `/web/employees/list`. */
export default function EmployeesIndexPage() {
  redirect("/web/employees/list");
}
