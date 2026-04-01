import "server-only";

import { cookies } from "next/headers";

import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";

/** Nur in Route Handlers / Server Actions aufrufen (nicht in Server Components). */
export async function clearWebAccessTokenCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}
