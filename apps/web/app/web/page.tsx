import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAuthSessionUser } from "@/lib/auth/session-user";
import { validateWebAccessTokenSession } from "@/lib/auth/validate-web-session";
import { getServerLocale } from "@/lib/i18n/server-locale";

import { WebLayout } from "./web-layout";

/** Cookie + JWT-`exp` müssen pro Request geprüft werden — kein statischer Cache. */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return {
    title: "App",
    description:
      locale === "en"
        ? "Product shell preview (sidebar) in the web app."
        : "Produkt-Shell-Vorschau (Sidebar) in der Web-App.",
  };
}

export default async function WebAppPage() {
  const session = await validateWebAccessTokenSession();
  if (!session.ok) {
    if (session.reason === "superseded_by_app") {
      redirect("/api/auth/invalidate-superseded-web-session?next=%2Fweb");
    }
    redirect("/login?next=/web");
  }
  const user = await getAuthSessionUser();
  return (
    <WebLayout
      webSession={{
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      }}
    />
  );
}
