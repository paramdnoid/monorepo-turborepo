import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { isWebAccessTokenSupersededByAppLogin } from "@/lib/auth/peer-session-db";
import {
  getServerAccessToken,
  isAccessTokenCookieMissingOrExpired,
} from "@/lib/auth/server-token";
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
  const token = await getServerAccessToken();
  if (isAccessTokenCookieMissingOrExpired(token)) {
    redirect("/login?next=/web");
  }
  if (token && (await isWebAccessTokenSupersededByAppLogin(token))) {
    const cookieStore = await cookies();
    cookieStore.delete(AUTH_COOKIE_NAME);
    redirect("/login?next=/web");
  }
  return <WebLayout />;
}
