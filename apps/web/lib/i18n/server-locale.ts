import { cookies, headers } from "next/headers";

import {
  LOCALE_COOKIE_NAME,
  type Locale,
  resolveLocale,
} from "@/lib/i18n/locale";

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const headerStore = await headers();

  return resolveLocale({
    cookieValue: cookieStore.get(LOCALE_COOKIE_NAME)?.value,
    acceptLanguageHeader: headerStore.get("accept-language"),
  });
}
