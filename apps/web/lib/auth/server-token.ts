import { cookies } from "next/headers";

import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";

export async function getServerAccessToken() {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COOKIE_NAME)?.value;
}
